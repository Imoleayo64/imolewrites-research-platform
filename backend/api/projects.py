
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from uuid import uuid4

router = APIRouter(
    prefix="/projects",
    tags=["Projects"]
)

projects = []


class ProjectCreate(BaseModel):
    title: str
    field: str
    description: str
    target_journal: str


@router.get("/")
def list_projects():
    return projects


@router.post("/")
def create_project(project: ProjectCreate):
    new_project = {
        "id": str(uuid4()),
        **project.model_dump()
    }

    projects.append(new_project)
    return new_project
