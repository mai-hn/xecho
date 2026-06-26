from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session

from project.model_test.database import engine, init_db
from project.model_test.router import router as model_test_router
from project.site_content.router import router as site_content_router
from project.site_content.seed import seed_site_content


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    with Session(engine) as session:
        seed_site_content(session)
    yield


app = FastAPI(title="xEcho API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(model_test_router)
app.include_router(site_content_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
