# TEST
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from uuid import uuid4

app = FastAPI(
    title="ImoleWrites Research Platform",
    description="AI-powered research platform for academic writing and scientific publishing",
    version="1.0.0"
)

# -----------------------------
# Temporary In-Memory Database
# -----------------------------
projects = []


class ResearchProject(BaseModel):
    title: str
    field: str
    description: str
    target_journal: str


class Project(ResearchProject):
    id: str


@app.get("/")
def home():
    return {
        "platform": "ImoleWrites Research Platform",
        "status": "Running",
        "version": "1.0.0"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


@app.get("/projects", response_model=List[Project])
def get_projects():
    return projects


@app.post("/projects", response_model=Project)
def create_project(project: ResearchProject):
    new_project = {
        "id": str(uuid4()),
        **project.model_dump()
    }

    projects.append(new_project)
    return new_project
