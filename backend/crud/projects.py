from sqlalchemy.orm import Session

from backend.database.models import ProjectModel
from backend.models.project import ProjectCreate


def create_project(db: Session, project: ProjectCreate):
    db_project = ProjectModel(
        title=project.title,
        field=project.field,
        description=project.description,
        target_journal=project.target_journal
    )

    db.add(db_project)
    db.commit()
    db.refresh(db_project)

    return db_project


def get_projects(db: Session):
    return db.query(ProjectModel).all()
