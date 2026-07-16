from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.crud.users import create_user, get_user_by_email
from backend.database.session import get_db
from backend.models.user import UserCreate

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/register")
def register(
    user: UserCreate,
    db: Session = Depends(get_db)
):
    existing = get_user_by_email(db, user.email)

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email already exists."
        )

    return create_user(db, user)


@router.get("/")
def status():
    return {
        "service": "Authentication",
        "status": "running"
    }
