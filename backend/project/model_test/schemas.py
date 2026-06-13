from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ApiCreate(BaseModel):
    name: str = "未命名 API"
    base_url: str = ""
    api_key: str = ""
    enabled: bool = True


class ApiUpdate(BaseModel):
    name: str | None = None
    base_url: str | None = None
    api_key: str | None = None
    enabled: bool | None = None


class ApiRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    base_url: str
    api_key: str
    enabled: bool
    created_at: datetime
    updated_at: datetime


class ModelCreate(BaseModel):
    api_id: str
    name: str = Field(min_length=1)
    context: int = 128000
    enabled: bool = True


class ModelUpdate(BaseModel):
    name: str | None = None
    context: int | None = None
    enabled: bool | None = None


class ModelRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    api_id: str
    name: str
    context: int
    enabled: bool
    created_at: datetime
    updated_at: datetime


class ResultRead(BaseModel):
    id: str
    api_id: str
    api_name: str
    model_name: str
    ok: bool
    latency_ms: int
    status_code: int | None = None
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None
    request: Any
    response: Any = None
    error: str | None = None
    created_at: datetime


class StateRead(BaseModel):
    apis: list[ApiRead]
    models: list[ModelRead]
    results: list[ResultRead]


class BatchTestRequest(BaseModel):
    input: str = Field(min_length=1)
    max_tokens: int = Field(default=512, ge=1, le=8192)
    temperature: float = Field(default=0.2, ge=0, le=2)
    concurrency: int = Field(default=4, ge=1, le=64)
    per_api_limit: int = Field(default=2, ge=1, le=32)
    timeout_seconds: float = Field(default=60, ge=1, le=300)
    model_ids: list[str] | None = None
