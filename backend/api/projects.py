from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.crud.projects import create_project, get_projects
from backend.database.session import get_db
from backend.models.project import ProjectCreate

router = APIRouter(
    prefix="/projects",
    tags=["Projects"]
)


@router.get("/")
def list_projects(db: Session = Depends(get_db)):
    return get_projects(db)


@router.post("/")
def add_project(
    project: ProjectCreate,
    db: Session = Depends(get_db)
):
    return create_project(db, project)
