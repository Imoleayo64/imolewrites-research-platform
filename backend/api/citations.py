from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.crud.citations import list_citations, create_citation, delete_citation
from backend.database.session import get_db
from backend.models.citation import CitationCreate, normalize_authors
from backend.services.auth_service import get_current_user
from backend.services.citation_service import lookup_doi, build_full_citation
from backend.services.analytics_service import log_event

router = APIRouter(
    prefix="/citations",
    tags=["Citations"]
)


@router.get("")
@router.get("/")
def get_citations(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    rows = list_citations(db, user_id=current_user.id)
    return [
        build_full_citation(row.as_dict(), index=i + 1)
        for i, row in enumerate(rows)
    ]


@router.post("")
@router.post("/")
def add_citation(
    payload: CitationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    data = payload.model_dump()
    data["authors"] = normalize_authors(payload.authors)
    row = create_citation(db, user_id=current_user.id, data=data)
    log_event(db, user_id=current_user.id, event_type="citation_added")
    return build_full_citation(row.as_dict())


@router.delete("/{citation_id}")
def remove_citation(
    citation_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ok = delete_citation(db, user_id=current_user.id, citation_id=citation_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Citation not found")
    return {"deleted": True}


@router.get("/doi/{doi:path}")
async def doi_lookup(
    doi: str,
    current_user=Depends(get_current_user),
):
    result = await lookup_doi(doi)
    if not result:
        raise HTTPException(status_code=404, detail="No metadata found for that DOI")
    return build_full_citation(result)
