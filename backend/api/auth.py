from backend.services.auth_service import login_user, get_current_user
from backend.models.user import UserLogin, ProfileUpdate, PasswordChange
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.orm import Session

from backend.crud.users import create_user, get_user_by_email
from backend.database.session import get_db
from backend.database.models import ProjectModel, ChapterModel, CitationModel, UsageEventModel, UserModel
from backend.models.user import UserCreate
from backend.services.security import hash_password, verify_password
from backend.services.storage_service import save_file, read_file

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

@router.post("/login")
def login(
    credentials: UserLogin,
    db: Session = Depends(get_db)
):
    user = get_user_by_email(db, credentials.email)

    print("\n========== LOGIN DEBUG ==========")
    print("Email:", credentials.email)
    print("User found:", user)
    print("=================================\n")

    token = login_user(
        db,
        credentials.email,
        credentials.password
    )

    if token is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )

    return token

# ==========================================
# NEW: Real, secure /me endpoint
# ==========================================
@router.get("/me")
def get_user_profile(current_user = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.full_name,
        "email": current_user.email,
        "institution": current_user.institution,
        "field": current_user.field,
        "role": current_user.role or "Researcher",
        "bio": current_user.bio,
        "has_avatar": bool(current_user.avatar_key),
        "is_admin": bool(current_user.is_admin),
    }


@router.patch("/me")
def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(current_user, key, value)
    db.commit()
    db.refresh(current_user)
    return {
        "id": current_user.id,
        "name": current_user.full_name,
        "email": current_user.email,
        "institution": current_user.institution,
        "field": current_user.field,
        "role": current_user.role or "Researcher",
        "bio": current_user.bio,
        "has_avatar": bool(current_user.avatar_key),
        "is_admin": bool(current_user.is_admin),
    }


MAX_AVATAR_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(status_code=422, detail="Please upload a JPEG, PNG, WEBP, or GIF image.")

    content = await file.read()
    if len(content) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=413, detail="Image is too large (5 MB max).")

    key = save_file(current_user.id, f"avatar_{file.filename}", content)
    current_user.avatar_key = key
    db.commit()
    return {"has_avatar": True}


@router.get("/me/avatar/{user_id}")
def get_avatar(user_id: int, db: Session = Depends(get_db)):
    """Public (no auth) so plain <img> tags can load it — profile photos aren't sensitive."""
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user or not user.avatar_key:
        raise HTTPException(status_code=404, detail="No avatar set")
    content = read_file(user.avatar_key)
    return Response(content=content, media_type="image/*")


@router.post("/change-password")
def change_password(
    payload: PasswordChange,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect.")
    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"updated": True}


@router.delete("/me")
def delete_account(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    project_ids = [p.id for p in db.query(ProjectModel).filter(ProjectModel.user_id == current_user.id).all()]
    if project_ids:
        db.query(ChapterModel).filter(ChapterModel.project_id.in_(project_ids)).delete(synchronize_session=False)
        db.query(ProjectModel).filter(ProjectModel.id.in_(project_ids)).delete(synchronize_session=False)
    db.query(CitationModel).filter(CitationModel.user_id == current_user.id).delete(synchronize_session=False)
    db.query(UsageEventModel).filter(UsageEventModel.user_id == current_user.id).delete(synchronize_session=False)
    db.delete(current_user)
    db.commit()
    return {"deleted": True}