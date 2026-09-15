import json
from sqlalchemy.orm import Session

from backend.database.models import CitationModel


def list_citations(db: Session, user_id: int):
    return (
        db.query(CitationModel)
        .filter(CitationModel.user_id == user_id)
        .order_by(CitationModel.created_at.desc())
        .all()
    )


def create_citation(db: Session, user_id: int, data: dict):
    db_citation = CitationModel(
        user_id=user_id,
        doi=data.get("doi"),
        title=data.get("title") or "Untitled",
        authors_json=json.dumps(data.get("authors") or []),
        year=data.get("year"),
        venue=data.get("venue"),
        volume=data.get("volume"),
        issue=data.get("issue"),
        pages=data.get("pages"),
        url=data.get("url"),
        source_type=data.get("type") or "journal-article",
    )
    db.add(db_citation)
    db.commit()
    db.refresh(db_citation)
    return db_citation


def delete_citation(db: Session, user_id: int, citation_id: int) -> bool:
    db_citation = (
        db.query(CitationModel)
        .filter(CitationModel.id == citation_id, CitationModel.user_id == user_id)
        .first()
    )
    if not db_citation:
        return False
    db.delete(db_citation)
    db.commit()
    return True
