from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.database.session import get_db
from backend.services.auth_service import get_current_user
from backend.services.jwt_service import decode_access_token, create_access_token
from backend.crud.users import get_user_by_email
from backend.crud.citations import create_citation
from backend.services.citation_service import build_full_citation
from backend.services.analytics_service import log_event
from backend.services import mendeley_service

router = APIRouter(prefix="/mendeley", tags=["Mendeley"])


@router.get("/status")
async def status(current_user=Depends(get_current_user)):
    return {
        "configured": mendeley_service.is_configured(),
        "connected": bool(current_user.mendeley_access_token),
    }


@router.get("/connect")
async def connect(current_user=Depends(get_current_user)):
    if not mendeley_service.is_configured():
        raise HTTPException(status_code=503, detail="Mendeley isn't configured on the server yet.")

    # Re-use our own JWT as the OAuth "state" so the callback (a plain browser
    # redirect with no Authorization header) can identify which user this is for.
    state = create_access_token({"sub": current_user.email})
    url = mendeley_service.build_authorize_url(state)
    return {"url": url}


@router.get("/callback")
async def callback(code: str = None, state: str = None, error: str = None, db: Session = Depends(get_db)):
    frontend_settings_url = f"{settings.FRONTEND_BASE_URL}/app/settings.html"

    if error or not code or not state:
        return RedirectResponse(url=f"{frontend_settings_url}?mendeley=error")

    email = decode_access_token(state)
    if not email:
        return RedirectResponse(url=f"{frontend_settings_url}?mendeley=error")

    user = get_user_by_email(db, email)
    if not user:
        return RedirectResponse(url=f"{frontend_settings_url}?mendeley=error")

    try:
        tokens = await mendeley_service.exchange_code_for_tokens(code)
    except httpx.HTTPError:
        return RedirectResponse(url=f"{frontend_settings_url}?mendeley=error")

    user.mendeley_access_token = tokens.get("access_token")
    user.mendeley_refresh_token = tokens.get("refresh_token")
    expires_in = tokens.get("expires_in", 3600)
    user.mendeley_token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    db.commit()

    return RedirectResponse(url=f"{frontend_settings_url}?mendeley=connected")


@router.post("/disconnect")
async def disconnect(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    current_user.mendeley_access_token = None
    current_user.mendeley_refresh_token = None
    current_user.mendeley_token_expires_at = None
    db.commit()
    return {"disconnected": True}


async def _get_token_or_raise(current_user):
    """Shared helper so a crash here always produces a clean JSON error,
    instead of an unhandled exception that hides the real cause from the UI."""
    try:
        token = await mendeley_service.get_valid_access_token(current_user)
    except httpx.HTTPStatusError as e:
        print(f"[mendeley] token refresh failed: {e.response.status_code} — {e.response.text[:500]}")
        raise HTTPException(status_code=502, detail=f"Mendeley token refresh failed ({e.response.status_code}). Try disconnecting and reconnecting Mendeley.")
    except Exception as e:
        print(f"[mendeley] token refresh failed (unexpected): {type(e).__name__}: {e}")
        raise HTTPException(status_code=502, detail=f"Unexpected error refreshing Mendeley token: {type(e).__name__}: {e}")

    if not token:
        raise HTTPException(status_code=401, detail="Mendeley isn't connected. Connect it first.")
    return token


@router.get("/library")
async def library(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    token = await _get_token_or_raise(current_user)

    try:
        docs = await mendeley_service.list_library_documents(token)
    except httpx.HTTPStatusError as e:
        print(f"[mendeley] library fetch failed: {e.response.status_code} — {e.response.text[:500]}")
        raise HTTPException(status_code=502, detail=f"Mendeley returned {e.response.status_code}: {e.response.text[:200]}")
    except httpx.HTTPError as e:
        print(f"[mendeley] library fetch failed (network): {e}")
        raise HTTPException(status_code=502, detail=f"Couldn't reach Mendeley: {e}")
    except Exception as e:
        print(f"[mendeley] library fetch failed (unexpected): {type(e).__name__}: {e}")
        raise HTTPException(status_code=502, detail=f"Unexpected error: {type(e).__name__}: {e}")

    return {"documents": [mendeley_service.normalize_mendeley_doc(d) for d in docs]}


@router.post("/import/{mendeley_id}")
async def import_document(
    mendeley_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    token = await _get_token_or_raise(current_user)

    try:
        docs = await mendeley_service.list_library_documents(token, limit=500)
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Mendeley returned {e.response.status_code}: {e.response.text[:200]}")
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Couldn't reach Mendeley: {e}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Unexpected error: {type(e).__name__}: {e}")

    match = next((d for d in docs if d.get("id") == mendeley_id), None)
    if not match:
        raise HTTPException(status_code=404, detail="That document wasn't found in your Mendeley library.")

    normalized = mendeley_service.normalize_mendeley_doc(match)
    row = create_citation(db, user_id=current_user.id, data=normalized)
    log_event(db, user_id=current_user.id, event_type="citation_added")
    return build_full_citation(row.as_dict())
