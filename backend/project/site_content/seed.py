from sqlmodel import Session, select

from .models import SiteProject, SiteTool


PROJECTS = [
    SiteProject(
        slug="butailing-search",
        title="BuTaiLingSearch",
        meta="Open source / Python",
        body="Playwright-powered search utility for discovering result links and resource pages from the command line.",
        href="https://github.com/mai-hn/BuTaiLingSearch",
        external=True,
        display_order=10,
    ),
    SiteProject(
        slug="tele-video-upload",
        title="TeleVideoUpload",
        meta="Open source / Python",
        body="Telegram video upload workflow for selecting videos from WebDAV storage and publishing them to a channel.",
        href="https://github.com/mai-hn/TeleVideoUpload",
        external=True,
        display_order=20,
    ),
]

TOOLS = [
    SiteTool(
        slug="model-tester",
        title="Model tester",
        body="OpenAI-compatible API and model benchmark console with charts and request details.",
        href="/projects/model-test",
        icon="flask",
        external=False,
        display_order=10,
    )
]


def seed_site_content(session: Session) -> None:
    for project in PROJECTS:
        exists = session.exec(select(SiteProject).where(SiteProject.slug == project.slug)).first()
        if not exists:
            session.add(project)

    for tool in TOOLS:
        exists = session.exec(select(SiteTool).where(SiteTool.slug == tool.slug)).first()
        if not exists:
            session.add(tool)

    session.commit()
