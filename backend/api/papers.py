from fastapi import APIRouter, Depends, Query
from typing import Optional
from sqlalchemy.orm import Session

from backend.services.literature_service import search_papers
from backend.services.citation_service import build_full_citation
from backend.services.auth_service import get_current_user
from backend.services.analytics_service import log_event
from backend.database.session import get_db

router = APIRouter(
    prefix="/papers",
    tags=["Literature"]
)


@router.get("")
@router.get("/")
async def search(
    query: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100),
    year_from: Optional[int] = Query(None),
    year_to: Optional[int] = Query(None),
    open_access: bool = Query(False),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        result = await search_papers(
            query=query,
            limit=limit,
            year_from=year_from,
            year_to=year_to,
            open_access_only=open_access,
        )

        # Attach real multi-style citation formatting (APA/MLA/Chicago/Harvard/IEEE/
        # Vancouver) + BibTeX to every result, reusing the same logic the Citation
        # Manager uses — so "download as APA .txt" etc. is genuinely correct, not
        # a separately hand-rolled (and easily inconsistent) formatter.
        result["results"] = [
            build_full_citation(paper, index=i + 1)
            for i, paper in enumerate(result.get("results", []))
        ]
    except Exception as e:
        # Last-resort catch-all: never let an unexpected error hang the request —
        # always return a clear JSON error the frontend can display.
        return {"total": 0, "results": [], "error": f"unexpected_error: {e}"}

    log_event(db, user_id=current_user.id, event_type="paper_search")
    return result
