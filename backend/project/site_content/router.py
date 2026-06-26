from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from project.model_test.database import get_session

from .models import SiteProject, SiteTool
from .schemas import SiteContentRead, SiteProjectRead, SiteToolRead


router = APIRouter(prefix="/site", tags=["site"])


@router.get("/content", response_model=SiteContentRead)
def get_site_content(session: Session = Depends(get_session)) -> SiteContentRead:
    projects = session.exec(
        select(SiteProject).where(SiteProject.enabled == True).order_by(SiteProject.display_order, SiteProject.created_at)  # noqa: E712
    ).all()
    tools = session.exec(
        select(SiteTool).where(SiteTool.enabled == True).order_by(SiteTool.display_order, SiteTool.created_at)  # noqa: E712
    ).all()

    return SiteContentRead(
        projects=[SiteProjectRead.model_validate(project) for project in projects],
        tools=[SiteToolRead.model_validate(tool) for tool in tools],
    )
