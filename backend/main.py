from fastapi import FastAPI
from backend.api.projects import router as projects_router

app = FastAPI(
    title="ImoleWrites Research Platform",
    version="2.0.0",
    description="AI-powered research platform for researchers worldwide."
)

app.include_router(projects_router)


@app.get("/")
def home():
    return {
        "message": "Welcome to ImoleWrites Research Platform",
        "status": "running",
        "version": "2.0.0"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }
