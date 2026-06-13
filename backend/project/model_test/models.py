from datetime import datetime, timezone
from uuid import uuid4

from sqlmodel import Field, Relationship, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ApiConfig(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    name: str = Field(default="未命名 API")
    base_url: str = Field(default="")
    api_key: str = Field(default="")
    enabled: bool = Field(default=True)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    models: list["ModelConfig"] = Relationship(back_populates="api")


class ModelConfig(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    api_id: str = Field(foreign_key="apiconfig.id", index=True)
    name: str
    context: int = Field(default=128000)
    enabled: bool = Field(default=True)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    api: ApiConfig | None = Relationship(back_populates="models")


class TestResult(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    api_id: str = Field(index=True)
    api_name: str
    model_name: str = Field(index=True)
    ok: bool = Field(index=True)
    latency_ms: int
    status_code: int | None = None
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None
    request_json: str
    response_json: str | None = None
    error: str | None = None
    created_at: datetime = Field(default_factory=utc_now, index=True)
