from sqlalchemy.orm import Session

from backend.crud.users import get_user_by_email
from backend.services.security import verify_password
from backend.services.jwt_service import create_access_token


def login_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)

    if not user:
        return None

    if not verify_password(password, user.password_hash):
        return None

    return {
        "access_token": create_access_token(
            {"sub": user.email}
        ),
        "token_type": "bearer"
    }
