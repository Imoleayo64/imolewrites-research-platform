from fastapi import FastAPI

from backend.api.projects import router as projects_router
from backend.core.config import settings

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered research platform for researchers worldwide."
)

app.include_router(projects_router)


@app.get("/")
def home():
    return {
        "platform": settings.APP_NAME,
        "status": "Running",
        "version": settings.APP_VERSION
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }
