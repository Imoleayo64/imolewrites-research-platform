from fastapi import APIRouter
from uuid import uuid4

from backend.models.project import ProjectCreate, Project

router = APIRouter(
    prefix="/projects",
    tags=["Projects"]
)

projects: list[Project] = []


@router.get("/", response_model=list[Project])
def list_projects():
    return projects


@router.post("/", response_model=Project)
def create_project(project: ProjectCreate):
    new_project = Project(
        id=str(uuid4()),
        **project.model_dump()
    )

    projects.append(new_project)
    return new_project
