from datetime import datetime
from uuid import uuid4

from sqlmodel import Field, SQLModel

from project.model_test.models import utc_now


class SiteProject(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    slug: str = Field(index=True, unique=True)
    title: str
    meta: str = ""
    body: str
    href: str
    external: bool = Field(default=True)
    display_order: int = Field(default=0, index=True)
    enabled: bool = Field(default=True, index=True)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class SiteTool(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    slug: str = Field(index=True, unique=True)
    title: str
    body: str
    href: str
    icon: str = "flask"
    external: bool = Field(default=False)
    display_order: int = Field(default=0, index=True)
    enabled: bool = Field(default=True, index=True)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
