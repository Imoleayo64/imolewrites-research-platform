from sqlalchemy.orm import Session
from backend.database.models import ProjectModel, ChapterModel, ProjectMemberModel
from backend.models.project import ProjectCreate

def create_project(db: Session, project: ProjectCreate, user_id: int):
    db_project = ProjectModel(
        user_id=user_id,
        title=project.title,
        description=project.description
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)

    db_chapter = ChapterModel(
        project_id=db_project.id,
        title="Untitled Document",
        content=""
    )
    db.add(db_chapter)
    db.commit()
    db.refresh(db_project)

    return db_project

def get_projects(db: Session, user_id: int):
    """Returns projects the user owns, plus projects they've been added to as a collaborator."""
    owned = db.query(ProjectModel).filter(ProjectModel.user_id == user_id).all()
    member_project_ids = [
        row.project_id
        for row in db.query(ProjectMemberModel).filter(ProjectMemberModel.user_id == user_id).all()
    ]
    shared = (
        db.query(ProjectModel).filter(ProjectModel.id.in_(member_project_ids)).all()
        if member_project_ids
        else []
    )
    return owned + shared

def get_project(db: Session, project_id: int, user_id: int):
    """Returns the project if the user owns it or is a member of it, else None."""
    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not project:
        return None
    if project.user_id == user_id:
        return project
    is_member = (
        db.query(ProjectMemberModel)
        .filter(ProjectMemberModel.project_id == project_id, ProjectMemberModel.user_id == user_id)
        .first()
    )
    return project if is_member else None

def update_project(db: Session, project_id: int, user_id: int, title: str, content: str):
    """Allows the owner or any editor-role member to update the project."""
    db_project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not db_project:
        return None

    is_owner = db_project.user_id == user_id
    member = (
        db.query(ProjectMemberModel)
        .filter(ProjectMemberModel.project_id == project_id, ProjectMemberModel.user_id == user_id)
        .first()
    )
    can_edit = is_owner or (member is not None and member.role == "editor")
    if not can_edit:
        return None

    db_project.title = title
    db.commit()
    db.refresh(db_project)

    db_chapter = db.query(ChapterModel).filter(ChapterModel.project_id == project_id).first()
    if db_chapter:
        db_chapter.title = title
        db_chapter.content = content
    else:
        # SAFETY NET: If the chapter doesn't exist for older projects, create it right now
        db_chapter = ChapterModel(project_id=project_id, title=title, content=content)
        db.add(db_chapter)
        
    db.commit()
        
    return db_project

def delete_project(db: Session, project_id: int, user_id: int) -> bool:
    """Only the owner can delete a project — collaborators cannot."""
    db_project = db.query(ProjectModel).filter(ProjectModel.id == project_id, ProjectModel.user_id == user_id).first()
    if not db_project:
        return False
    db.query(ChapterModel).filter(ChapterModel.project_id == project_id).delete(synchronize_session=False)
    db.query(ProjectMemberModel).filter(ProjectMemberModel.project_id == project_id).delete(synchronize_session=False)
    db.delete(db_project)
    db.commit()
    return True