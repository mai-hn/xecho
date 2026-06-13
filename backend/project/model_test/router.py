import asyncio
import json
import time
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, col, select

from .database import get_session
from .models import ApiConfig, ModelConfig, TestResult, utc_now
from .schemas import ApiCreate, ApiRead, ApiUpdate, BatchTestRequest, ModelCreate, ModelRead, ModelUpdate, ResultRead, StateRead


router = APIRouter(prefix="/project/model-test", tags=["project:model-test"])


def endpoint(base_url: str, path: str) -> str:
    clean_base_url = base_url.rstrip("/")
    clean_path = path.strip("/")
    if clean_base_url.endswith(f"/{clean_path}"):
        return clean_base_url
    return f"{clean_base_url}/{clean_path}"


def auth_headers(api_key: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}


def decode_json(value: str | None) -> Any:
    if not value:
        return None
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return value


def response_json_or_error(response: httpx.Response, action: str) -> Any:
    try:
        return response.json()
    except ValueError as exc:
        content_type = response.headers.get("content-type", "unknown")
        preview = response.text[:500] if response.text else "<empty body>"
        raise HTTPException(
            status_code=502,
            detail=(
                f"{action} 返回的不是 JSON。"
                f"请确认 API Base URL 是 OpenAI 兼容根地址，例如 https://example.com/v1，"
                f"不要填写完整 /models 地址。"
                f"上游状态码：{response.status_code}，Content-Type：{content_type}，响应预览：{preview}"
            ),
        ) from exc


def read_result(result: TestResult) -> ResultRead:
    return ResultRead(
        id=result.id,
        api_id=result.api_id,
        api_name=result.api_name,
        model_name=result.model_name,
        ok=result.ok,
        latency_ms=result.latency_ms,
        status_code=result.status_code,
        prompt_tokens=result.prompt_tokens,
        completion_tokens=result.completion_tokens,
        total_tokens=result.total_tokens,
        request=decode_json(result.request_json),
        response=decode_json(result.response_json),
        error=result.error,
        created_at=result.created_at,
    )


def get_api_or_404(session: Session, api_id: str) -> ApiConfig:
    api = session.get(ApiConfig, api_id)
    if not api:
        raise HTTPException(status_code=404, detail="API 配置不存在。")
    return api


def get_model_or_404(session: Session, model_id: str) -> ModelConfig:
    model = session.get(ModelConfig, model_id)
    if not model:
        raise HTTPException(status_code=404, detail="模型配置不存在。")
    return model


@router.get("/state", response_model=StateRead)
def get_state(session: Session = Depends(get_session)) -> StateRead:
    apis = session.exec(select(ApiConfig).order_by(ApiConfig.created_at)).all()
    models = session.exec(select(ModelConfig).order_by(ModelConfig.created_at)).all()
    results = session.exec(select(TestResult).order_by(col(TestResult.created_at).desc()).limit(100)).all()
    return StateRead(
        apis=[ApiRead.model_validate(api) for api in apis],
        models=[ModelRead.model_validate(model) for model in models],
        results=[read_result(result) for result in results],
    )


@router.post("/apis", response_model=ApiRead)
def create_api(payload: ApiCreate, session: Session = Depends(get_session)) -> ApiConfig:
    api = ApiConfig(**payload.model_dump())
    session.add(api)
    session.commit()
    session.refresh(api)
    return api


@router.patch("/apis/{api_id}", response_model=ApiRead)
def update_api(api_id: str, payload: ApiUpdate, session: Session = Depends(get_session)) -> ApiConfig:
    api = get_api_or_404(session, api_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(api, key, value)
    api.updated_at = utc_now()
    session.add(api)
    session.commit()
    session.refresh(api)
    return api


@router.delete("/apis/{api_id}")
def delete_api(api_id: str, session: Session = Depends(get_session)) -> dict[str, bool]:
    api = get_api_or_404(session, api_id)
    models = session.exec(select(ModelConfig).where(ModelConfig.api_id == api_id)).all()
    for model in models:
        session.delete(model)
    session.delete(api)
    session.commit()
    return {"ok": True}


@router.post("/apis/{api_id}/fetch-models", response_model=list[ModelRead])
async def fetch_models(api_id: str, session: Session = Depends(get_session)) -> list[ModelConfig]:
    api = get_api_or_404(session, api_id)
    if not api.base_url or not api.api_key:
        raise HTTPException(status_code=400, detail="请先填写 API 地址和密钥。")

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(endpoint(api.base_url, "models"), headers=auth_headers(api.api_key))
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=f"模型列表请求失败：{exc.response.text[:500]}") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"无法连接模型服务：{exc}") from exc

    data = response_json_or_error(response, "模型列表请求")
    if not isinstance(data, dict) or not isinstance(data.get("data"), list):
        raise HTTPException(
            status_code=502,
            detail="模型列表响应格式不符合 OpenAI 兼容格式，期望 JSON 中包含 data 数组。",
        )
    names = [item.get("id") for item in data.get("data", []) if item.get("id")]
    existing = set(session.exec(select(ModelConfig.name).where(ModelConfig.api_id == api.id)).all())
    created: list[ModelConfig] = []
    for name in names:
        if name in existing:
            continue
        model = ModelConfig(api_id=api.id, name=name, context=128000, enabled=True)
        session.add(model)
        created.append(model)

    session.commit()
    for model in created:
        session.refresh(model)

    return session.exec(select(ModelConfig).where(ModelConfig.api_id == api.id).order_by(ModelConfig.created_at)).all()


@router.post("/models", response_model=ModelRead)
def create_model(payload: ModelCreate, session: Session = Depends(get_session)) -> ModelConfig:
    get_api_or_404(session, payload.api_id)
    model = ModelConfig(**payload.model_dump())
    session.add(model)
    session.commit()
    session.refresh(model)
    return model


@router.patch("/models/{model_id}", response_model=ModelRead)
def update_model(model_id: str, payload: ModelUpdate, session: Session = Depends(get_session)) -> ModelConfig:
    model = get_model_or_404(session, model_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(model, key, value)
    model.updated_at = utc_now()
    session.add(model)
    session.commit()
    session.refresh(model)
    return model


@router.delete("/models/{model_id}")
def delete_model(model_id: str, session: Session = Depends(get_session)) -> dict[str, bool]:
    model = get_model_or_404(session, model_id)
    session.delete(model)
    session.commit()
    return {"ok": True}


async def test_one_model(
    client: httpx.AsyncClient,
    api: ApiConfig,
    model: ModelConfig,
    payload: BatchTestRequest,
    global_semaphore: asyncio.Semaphore,
    api_semaphore: asyncio.Semaphore,
) -> TestResult:
    request_body = {
        "model": model.name,
        "messages": [{"role": "user", "content": payload.input}],
        "temperature": payload.temperature,
        "max_tokens": payload.max_tokens,
    }
    started = time.perf_counter()

    async with global_semaphore, api_semaphore:
        if not api.api_key:
            return TestResult(
                api_id=api.id,
                api_name=api.name,
                model_name=model.name,
                ok=False,
                latency_ms=0,
                request_json=json.dumps(request_body, ensure_ascii=False),
                response_json=None,
                error="API Key 为空。",
                created_at=datetime.now(timezone.utc),
            )

        try:
            response = await client.post(endpoint(api.base_url, "chat/completions"), headers=auth_headers(api.api_key), json=request_body)
            latency_ms = round((time.perf_counter() - started) * 1000)
            try:
                response_data: Any = response.json()
            except ValueError:
                response_data = {"text": response.text}
            usage = response_data.get("usage", {}) if isinstance(response_data, dict) else {}

            return TestResult(
                api_id=api.id,
                api_name=api.name,
                model_name=model.name,
                ok=response.is_success,
                latency_ms=latency_ms,
                status_code=response.status_code,
                prompt_tokens=usage.get("prompt_tokens"),
                completion_tokens=usage.get("completion_tokens"),
                total_tokens=usage.get("total_tokens"),
                request_json=json.dumps(request_body, ensure_ascii=False),
                response_json=json.dumps(response_data, ensure_ascii=False),
                error=None if response.is_success else response.text[:1000],
                created_at=datetime.now(timezone.utc),
            )
        except Exception as exc:  # noqa: BLE001 - individual failures are stored as result rows
            latency_ms = round((time.perf_counter() - started) * 1000)
            return TestResult(
                api_id=api.id,
                api_name=api.name,
                model_name=model.name,
                ok=False,
                latency_ms=latency_ms,
                request_json=json.dumps(request_body, ensure_ascii=False),
                response_json=None,
                error=str(exc),
                created_at=datetime.now(timezone.utc),
            )


@router.post("/tests/batch", response_model=list[ResultRead])
async def batch_test(payload: BatchTestRequest, session: Session = Depends(get_session)) -> list[ResultRead]:
    apis = session.exec(select(ApiConfig).where(ApiConfig.enabled == True)).all()  # noqa: E712
    api_by_id = {api.id: api for api in apis}
    model_query = select(ModelConfig).where(ModelConfig.enabled == True)  # noqa: E712
    if payload.model_ids:
        model_query = model_query.where(col(ModelConfig.id).in_(payload.model_ids))
    models = [model for model in session.exec(model_query).all() if model.api_id in api_by_id]

    if not apis:
        raise HTTPException(status_code=400, detail="请至少启用一个 API。")
    if not models:
        raise HTTPException(status_code=400, detail="请至少启用一个模型。")

    global_semaphore = asyncio.Semaphore(payload.concurrency)
    api_semaphores = {api.id: asyncio.Semaphore(payload.per_api_limit) for api in apis}

    async with httpx.AsyncClient(timeout=payload.timeout_seconds) as client:
        tasks = [
            test_one_model(client, api_by_id[model.api_id], model, payload, global_semaphore, api_semaphores[model.api_id])
            for model in models
        ]
        results = await asyncio.gather(*tasks)

    for result in results:
        session.add(result)
    session.commit()
    for result in results:
        session.refresh(result)

    return [read_result(result) for result in results]


@router.delete("/results")
def clear_results(session: Session = Depends(get_session)) -> dict[str, bool]:
    results = session.exec(select(TestResult)).all()
    for result in results:
        session.delete(result)
    session.commit()
    return {"ok": True}
