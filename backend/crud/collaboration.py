from sqlalchemy.orm import Session

from backend.database.models import ProjectMemberModel, ProjectModel, UserModel


def get_project_role(db: Session, project_id: int, user_id: int) -> str | None:
    """Returns 'owner', 'editor', 'viewer', or None if the user has no access."""
    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not project:
        return None
    if project.user_id == user_id:
        return "owner"
    member = (
        db.query(ProjectMemberModel)
        .filter(ProjectMemberModel.project_id == project_id, ProjectMemberModel.user_id == user_id)
        .first()
    )
    return member.role if member else None


def list_members(db: Session, project_id: int):
    rows = (
        db.query(ProjectMemberModel, UserModel)
        .join(UserModel, ProjectMemberModel.user_id == UserModel.id)
        .filter(ProjectMemberModel.project_id == project_id)
        .all()
    )
    return [{"user_id": u.id, "name": u.full_name, "email": u.email, "role": m.role} for m, u in rows]


def add_member_by_email(db: Session, project_id: int, email: str, role: str = "editor"):
    user = db.query(UserModel).filter(UserModel.email == email).first()
    if not user:
        return None, "user_not_found"

    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if project and project.user_id == user.id:
        return None, "already_owner"

    existing = (
        db.query(ProjectMemberModel)
        .filter(ProjectMemberModel.project_id == project_id, ProjectMemberModel.user_id == user.id)
        .first()
    )
    if existing:
        existing.role = role
        db.commit()
        db.refresh(existing)
        return existing, None

    member = ProjectMemberModel(project_id=project_id, user_id=user.id, role=role)
    db.add(member)
    db.commit()
    db.refresh(member)
    return member, None


def remove_member(db: Session, project_id: int, user_id: int) -> bool:
    member = (
        db.query(ProjectMemberModel)
        .filter(ProjectMemberModel.project_id == project_id, ProjectMemberModel.user_id == user_id)
        .first()
    )
    if not member:
        return False
    db.delete(member)
    db.commit()
    return True
