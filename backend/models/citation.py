from pydantic import BaseModel
from typing import Optional, List, Union


class AuthorIn(BaseModel):
    given: str = ""
    family: str = ""


class CitationCreate(BaseModel):
    doi: Optional[str] = None
    title: str
    # Accept either structured {given, family} objects or plain "Last, First" strings
    authors: Optional[List[Union[AuthorIn, str]]] = None
    year: Optional[int] = None
    venue: Optional[str] = None
    volume: Optional[str] = None
    issue: Optional[str] = None
    pages: Optional[str] = None
    url: Optional[str] = None
    type: Optional[str] = "journal-article"


def normalize_authors(authors) -> list[dict]:
    if not authors:
        return []
    normalized = []
    for a in authors:
        if isinstance(a, dict):
            normalized.append({"given": a.get("given", ""), "family": a.get("family", "")})
        elif hasattr(a, "given"):
            normalized.append({"given": a.given, "family": a.family})
        elif isinstance(a, str):
            if "," in a:
                family, given = [p.strip() for p in a.split(",", 1)]
            else:
                parts = a.strip().rsplit(" ", 1)
                given, family = (parts[0], parts[1]) if len(parts) == 2 else ("", parts[0])
            normalized.append({"given": given, "family": family})
    return normalized
