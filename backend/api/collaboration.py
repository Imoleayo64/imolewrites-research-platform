from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from backend.crud.collaboration import get_project_role, list_members, add_member_by_email, remove_member
from backend.database.session import get_db
from backend.services.auth_service import get_current_user

router = APIRouter(
    prefix="/projects/{project_id}/members",
    tags=["Collaboration"]
)


class InviteRequest(BaseModel):
    email: EmailStr
    role: str = "editor"  # editor | viewer


def _require_owner(db: Session, project_id: int, user_id: int):
    role = get_project_role(db, project_id, user_id)
    if role != "owner":
        raise HTTPException(status_code=403, detail="Only the project owner can manage collaborators.")


@router.get("")
def get_members(
    project_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    role = get_project_role(db, project_id, current_user.id)
    if role is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"members": list_members(db, project_id), "your_role": role}


@router.post("")
def invite_member(
    project_id: int,
    payload: InviteRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _require_owner(db, project_id, current_user.id)

    if payload.role not in ("editor", "viewer"):
        raise HTTPException(status_code=422, detail="role must be 'editor' or 'viewer'")

    member, error = add_member_by_email(db, project_id, payload.email, payload.role)
    if error == "user_not_found":
        raise HTTPException(status_code=404, detail="No ImoleWrites account found with that email. They need to register first.")
    if error == "already_owner":
        raise HTTPException(status_code=400, detail="That user already owns this project.")
    return {"added": True}


@router.delete("/{user_id}")
def remove_project_member(
    project_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _require_owner(db, project_id, current_user.id)
    ok = remove_member(db, project_id, user_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"removed": True}
