from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SiteProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    slug: str
    title: str
    meta: str
    body: str
    href: str
    external: bool
    display_order: int
    created_at: datetime
    updated_at: datetime


class SiteToolRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    slug: str
    title: str
    body: str
    href: str
    icon: str
    external: bool
    display_order: int
    created_at: datetime
    updated_at: datetime


class SiteContentRead(BaseModel):
    projects: list[SiteProjectRead]
    tools: list[SiteToolRead]
