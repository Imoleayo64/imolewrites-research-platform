from datetime import datetime, timezone
from urllib.parse import quote

import httpx

from backend.core.config import settings

AUTHORIZE_URL = "https://api.mendeley.com/oauth/authorize"
TOKEN_URL = "https://api.mendeley.com/oauth/token"
API_BASE = "https://api.mendeley.com"


def is_configured() -> bool:
    return bool(settings.MENDELEY_CLIENT_ID and settings.MENDELEY_CLIENT_SECRET)


def build_authorize_url(state: str) -> str:
    params = (
        f"client_id={quote(str(settings.MENDELEY_CLIENT_ID))}"
        f"&redirect_uri={quote(settings.MENDELEY_REDIRECT_URI, safe='')}"
        f"&response_type=code"
        f"&scope=all"
        f"&state={quote(state, safe='')}"
    )
    return f"{AUTHORIZE_URL}?{params}"


async def exchange_code_for_tokens(code: str) -> dict:
    """Returns {access_token, refresh_token, expires_in} from Mendeley."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.MENDELEY_REDIRECT_URI,
            },
            auth=(settings.MENDELEY_CLIENT_ID, settings.MENDELEY_CLIENT_SECRET),
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        resp.raise_for_status()
        return resp.json()


async def refresh_access_token(refresh_token: str) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            TOKEN_URL,
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
            },
            auth=(settings.MENDELEY_CLIENT_ID, settings.MENDELEY_CLIENT_SECRET),
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        resp.raise_for_status()
        return resp.json()


async def get_valid_access_token(user) -> str | None:
    """Returns a usable access token for this user, refreshing it first if expired."""
    if not user.mendeley_access_token:
        return None

    expires_at = user.mendeley_token_expires_at
    # SQLite frequently returns a naive datetime even for a timezone-aware
    # column — comparing that directly against an aware datetime.now(utc)
    # raises a TypeError. Normalize to UTC-aware before comparing.
    if expires_at is not None and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    is_expired = expires_at is not None and expires_at <= datetime.now(timezone.utc)

    if not is_expired:
        return user.mendeley_access_token

    if not user.mendeley_refresh_token:
        return None

    data = await refresh_access_token(user.mendeley_refresh_token)
    return data.get("access_token")


async def list_library_documents(access_token: str, limit: int = 50) -> list[dict]:
    async with httpx.AsyncClient(timeout=15.0) as client:
        print(f"[mendeley_service] Fetching library documents (limit={limit})...")
        resp = await client.get(
            f"{API_BASE}/documents",
            params={"limit": limit, "view": "bib"},
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.mendeley-document.1+json",
            },
        )
        print(f"[mendeley_service] Mendeley responded: {resp.status_code}")
        if resp.status_code != 200:
            print(f"[mendeley_service] Response body: {resp.text[:500]}")
        resp.raise_for_status()
        data = resp.json()
        print(f"[mendeley_service] Got {len(data) if isinstance(data, list) else 'non-list'} result(s)")
        return data


def normalize_mendeley_doc(doc: dict) -> dict:
    authors = []
    for a in doc.get("authors", []) or []:
        first = a.get("first_name", "")
        last = a.get("last_name", "")
        if first or last:
            authors.append({"given": first, "family": last})

    identifiers = doc.get("identifiers", {}) or {}

    return {
        "mendeley_id": doc.get("id"),
        "doi": identifiers.get("doi"),
        "title": doc.get("title") or "Untitled",
        "authors": authors,
        "year": doc.get("year"),
        "venue": doc.get("source"),
        "volume": doc.get("volume"),
        "issue": doc.get("issue"),
        "pages": doc.get("pages"),
        "url": doc.get("websites", [None])[0] if doc.get("websites") else None,
        "type": doc.get("type", "journal-article"),
    }
