from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.database.session import get_db
from backend.services.analytics_service import get_overview
from backend.services.auth_service import get_current_user

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"]
)


@router.get("/overview")
def overview(
    days: int = Query(30, ge=7, le=400),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_overview(db, user_id=current_user.id, days=days)
