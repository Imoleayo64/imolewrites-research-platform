from fastapi import APIRouter
from uuid import uuid4

from backend.models.user import User, UserCreate

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

users: list[User] = []


@router.get("/")
def auth_status():
    return {
        "message": "Authentication service is ready."
    }


@router.post("/register", response_model=User)
def register(user: UserCreate):
    new_user = User(
        id=str(uuid4()),
        full_name=user.full_name,
        email=user.email
    )

    users.append(new_user)
    return new_user
