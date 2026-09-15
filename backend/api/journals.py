from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session

from backend.services.journal_service import recommend_journals
from backend.services.auth_service import get_current_user
from backend.services.analytics_service import log_event
from backend.database.session import get_db

router = APIRouter(
    prefix="/journals",
    tags=["Journal Recommendation"]
)


class RecommendRequest(BaseModel):
    abstract: str
    preferences: Optional[List[str]] = None


@router.post("/recommend")
async def recommend(
    payload: RecommendRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        journals = await recommend_journals(payload.abstract, payload.preferences)
    except RuntimeError as e:
        if str(e) == "gemini_not_configured":
            raise HTTPException(status_code=503, detail="Journal recommender is not configured. Set GEMINI_API_KEY on the server.")
        raise HTTPException(status_code=502, detail=f"Journal recommendation failed: {e}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Journal recommendation failed unexpectedly: {e}")

    log_event(db, user_id=current_user.id, event_type="journal_recommend")
    return {"journals": journals}
