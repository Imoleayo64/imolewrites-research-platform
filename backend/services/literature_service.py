import httpx

CROSSREF_BASE = "https://api.crossref.org/works"
# CrossRef asks that you identify your app via a User-Agent with contact info
# ("polite pool") for better reliability — no signup or key required either way.
HEADERS = {"User-Agent": "ImoleWrites/1.0 (mailto:support@imolewrites.com)"}


async def search_papers(
    query: str,
    limit: int = 20,
    year_from: int | None = None,
    year_to: int | None = None,
    open_access_only: bool = False,
):
    """
    Search academic papers via the free CrossRef API (no key or signup required,
    and far more reliable for anonymous/unauthenticated use than most alternatives).
    Returns a normalized list of paper dicts the frontend can render directly.
    """
    if not query or not query.strip():
        return {"total": 0, "results": []}

    limit = max(1, min(limit, 100))

    params = {
        "query": query,
        "rows": limit,
        "select": "title,author,issued,container-title,DOI,URL,is-referenced-by-count,type,link,abstract,volume,issue,page",
    }
    filters = []
    if year_from:
        filters.append(f"from-pub-date:{year_from}-01-01")
    if year_to:
        filters.append(f"until-pub-date:{year_to}-12-31")
    if filters:
        params["filter"] = ",".join(filters)

    async with httpx.AsyncClient(timeout=15.0, headers=HEADERS) as client:
        try:
            print(f"[literature_service] Searching CrossRef for: {query!r}")
            resp = await client.get(CROSSREF_BASE, params=params)
            resp.raise_for_status()
            print(f"[literature_service] CrossRef responded: {resp.status_code}")
        except httpx.HTTPError as e:
            print(f"[literature_service] CrossRef request failed: {e}")
            return {"total": 0, "results": [], "error": f"literature_search_unavailable: {e}"}

        data = resp.json()

    message = data.get("message", {})
    raw_items = message.get("items", [])
    results = [_normalize_paper(p) for p in raw_items]

    if open_access_only:
        results = [r for r in results if r["open_access"]]

    return {
        "total": message.get("total-results", len(results)),
        "results": results,
    }


def _normalize_paper(p: dict) -> dict:
    titles = p.get("title") or []
    title = titles[0] if titles else "Untitled"

    # Keep authors structured ({given, family}) so we can reuse the same
    # citation-formatting logic (APA/MLA/Chicago/etc.) used elsewhere in the app.
    authors = []
    for a in p.get("author", []) or []:
        given = a.get("given", "")
        family = a.get("family", "")
        if given or family:
            authors.append({"given": given, "family": family})

    date_parts = (p.get("issued") or {}).get("date-parts", [[None]])
    year = date_parts[0][0] if date_parts and date_parts[0] else None

    containers = p.get("container-title") or []
    venue = containers[0] if containers else None

    links = p.get("link") or []
    pdf_link = next((l.get("URL") for l in links if l.get("content-type") == "application/pdf"), None)

    return {
        "title": title,
        "abstract": _clean_abstract(p.get("abstract")),
        "year": year,
        "venue": venue,
        "authors": authors,
        "volume": p.get("volume"),
        "issue": p.get("issue"),
        "pages": p.get("page"),
        "citation_count": p.get("is-referenced-by-count") or 0,
        "type": (p.get("type") or "journal-article").replace("-", " ").title(),
        "open_access": bool(pdf_link),
        "pdf_url": pdf_link,
        "doi": p.get("DOI"),
        "url": p.get("URL"),
    }


def _clean_abstract(raw: str | None) -> str:
    if not raw:
        return "No abstract available."
    # CrossRef sometimes wraps abstracts in JATS XML tags (<jats:p>...</jats:p>)
    import re
    text = re.sub(r"<[^>]+>", " ", raw)
    return re.sub(r"\s+", " ", text).strip() or "No abstract available."
