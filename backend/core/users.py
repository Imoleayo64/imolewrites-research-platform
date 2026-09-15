from sqlalchemy.orm import Session

from backend.database.models import UserModel
from backend.models.user import UserCreate
from backend.services.security import hash_password


def create_user(db: Session, user: UserCreate):
    db_user = UserModel(
        full_name=user.full_name,
        email=user.email,
        password_hash=hash_password(user.password)
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user


def get_user_by_email(db: Session, email: str):
    return (
        db.query(UserModel)
        .filter(UserModel.email == email)
        .first()
    )
