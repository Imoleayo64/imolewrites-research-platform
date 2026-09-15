from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database.session import get_db
from backend.services.admin_service import get_admin_overview
from backend.services.auth_service import get_current_user

router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


def require_admin(current_user=Depends(get_current_user)):
    if not getattr(current_user, "is_admin", 0):
        raise HTTPException(status_code=403, detail="Admin access required.")
    return current_user


@router.get("/overview")
def overview(
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    return get_admin_overview(db)
