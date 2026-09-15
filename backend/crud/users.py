from sqlalchemy.orm import Session

from backend.database.models import UserModel
from backend.models.user import UserCreate
from backend.services.security import hash_password


def get_user_by_email(db: Session, email: str):
    return (
        db.query(UserModel)
        .filter(UserModel.email == email)
        .first()
    )


def create_user(db: Session, user: UserCreate):
    is_first_user = db.query(UserModel).count() == 0

    db_user = UserModel(
        full_name=user.full_name,
        email=user.email,
        password_hash=hash_password(user.password),
        is_admin=1 if is_first_user else 0,
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user