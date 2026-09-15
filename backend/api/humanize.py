from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.services.humanizer_service import humanize_text
from backend.services.auth_service import get_current_user
from backend.services.analytics_service import log_event
from backend.database.session import get_db

router = APIRouter(tags=["Humanizer"])


class HumanizeRequest(BaseModel):
    text: str
    mode: str = "academic"


@router.post("/humanize")
async def humanize(
    payload: HumanizeRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        result = await humanize_text(payload.text, payload.mode)
    except RuntimeError as e:
        if str(e) == "gemini_not_configured":
            raise HTTPException(status_code=503, detail="Humanizer is not configured. Set GEMINI_API_KEY on the server.")
        raise HTTPException(status_code=502, detail=f"Humanize request failed: {e}")

    log_event(db, user_id=current_user.id, event_type="humanize")
    return result
