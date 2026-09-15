import httpx

CROSSREF_BASE = "https://api.crossref.org/works"

STYLES = ["APA", "MLA", "Chicago", "Harvard", "IEEE", "Vancouver"]


async def lookup_doi(doi: str) -> dict | None:
    """Fetch and normalize citation metadata for a DOI via the free CrossRef API."""
    doi = doi.strip()
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.get(f"{CROSSREF_BASE}/{doi}")
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
        except httpx.HTTPError:
            return None

        data = resp.json()

    msg = data.get("message", {})
    return _normalize_crossref(msg)


def _normalize_crossref(msg: dict) -> dict:
    authors = []
    for a in msg.get("author", []) or []:
        given = a.get("given", "")
        family = a.get("family", "")
        if family or given:
            authors.append({"given": given, "family": family})

    date_parts = (
        (msg.get("published-print") or msg.get("published-online") or msg.get("issued") or {})
        .get("date-parts", [[None]])
    )
    year = date_parts[0][0] if date_parts and date_parts[0] else None

    titles = msg.get("title") or []
    container = msg.get("container-title") or []

    return {
        "doi": msg.get("DOI"),
        "title": titles[0] if titles else "Untitled",
        "authors": authors,
        "year": year,
        "venue": container[0] if container else None,
        "volume": msg.get("volume"),
        "issue": msg.get("issue"),
        "pages": msg.get("page"),
        "url": msg.get("URL"),
        "type": msg.get("type", "journal-article"),
    }


def _author_family_given(authors: list[dict]):
    return [(a.get("family", "").strip(), a.get("given", "").strip()) for a in authors if a.get("family") or a.get("given")]


def _initials(given: str) -> str:
    parts = [p for p in given.replace("-", " ").split(" ") if p]
    return " ".join(f"{p[0]}." for p in parts)


def format_bibliography(c: dict, style: str) -> str:
    authors = _author_family_given(c.get("authors") or [])
    title = c.get("title") or "Untitled"
    year = c.get("year") or "n.d."
    venue = c.get("venue")
    volume = c.get("volume")
    issue = c.get("issue")
    pages = c.get("pages")
    doi = c.get("doi")

    def apa_authors():
        if not authors:
            return ""
        parts = [f"{fam}, {_initials(giv)}" for fam, giv in authors]
        if len(parts) == 1:
            return parts[0]
        return ", ".join(parts[:-1]) + ", & " + parts[-1]

    def mla_authors():
        if not authors:
            return ""
        fam0, giv0 = authors[0]
        first = f"{fam0}, {giv0}".strip(", ")
        if len(authors) == 1:
            return first
        if len(authors) == 2:
            fam1, giv1 = authors[1]
            return f"{first}, and {giv1} {fam1}".strip()
        return f"{first}, et al."

    def chicago_authors():
        if not authors:
            return ""
        fam0, giv0 = authors[0]
        first = f"{fam0}, {giv0}".strip(", ")
        rest = [f"{giv}, {fam}" for fam, giv in authors[1:]]
        return ", ".join([first] + rest)

    def harvard_authors():
        if not authors:
            return ""
        parts = [f"{fam}, {_initials(giv)}" for fam, giv in authors]
        if len(parts) == 1:
            return parts[0]
        return ", ".join(parts[:-1]) + " and " + parts[-1]

    def ieee_authors():
        if not authors:
            return ""
        parts = [f"{_initials(giv)} {fam}" for fam, giv in authors]
        if len(parts) <= 2:
            return " and ".join(parts)
        return ", ".join(parts[:-1]) + ", and " + parts[-1]

    def vancouver_authors():
        if not authors:
            return ""
        parts = [f"{fam} {''.join(w[0] for w in giv.replace('-', ' ').split())}" for fam, giv in authors]
        return ", ".join(parts)

    vol_issue = ""
    if volume:
        vol_issue = volume + (f"({issue})" if issue else "")

    doi_str = f"https://doi.org/{doi}" if doi else ""

    if style == "APA":
        s = f"{apa_authors()} ({year}). {title}."
        if venue:
            s += f" {venue}"
            if vol_issue:
                s += f", {vol_issue}"
            if pages:
                s += f", {pages}"
            s += "."
        if doi_str:
            s += f" {doi_str}"
        return s.strip()

    if style == "MLA":
        s = f'{mla_authors()}. "{title}."'
        if venue:
            s += f" {venue},"
        if volume:
            s += f" vol. {volume},"
        if issue:
            s += f" no. {issue},"
        s += f" {year}"
        if pages:
            s += f", pp. {pages}"
        s += "."
        return s.strip()

    if style == "Chicago":
        s = f'{chicago_authors()}. {year}. "{title}."'
        if venue:
            s += f" {venue}"
            if volume:
                s += f" {volume}"
            if issue:
                s += f" ({issue})"
            if pages:
                s += f": {pages}"
        s += "."
        return s.strip()

    if style == "Harvard":
        s = f"{harvard_authors()}, {year}. {title}."
        if venue:
            s += f" {venue}"
            if vol_issue:
                s += f", {vol_issue}"
            if pages:
                s += f", pp.{pages}"
            s += "."
        return s.strip()

    if style == "IEEE":
        s = f'{ieee_authors()}, "{title},"'
        if venue:
            s += f" {venue},"
        if volume:
            s += f" vol. {volume},"
        if issue:
            s += f" no. {issue},"
        if pages:
            s += f" pp. {pages},"
        s += f" {year}."
        return s.strip()

    if style == "Vancouver":
        s = f"{vancouver_authors()}. {title}."
        if venue:
            s += f" {venue}."
        s += f" {year}"
        if vol_issue:
            s += f";{vol_issue}"
        if pages:
            s += f":{pages}"
        s += "."
        return s.strip()

    return f"{apa_authors()} ({year}). {title}."


def format_in_text(c: dict, style: str, index: int = 1) -> str:
    authors = _author_family_given(c.get("authors") or [])
    year = c.get("year") or "n.d."
    families = [fam for fam, _ in authors]

    if style == "IEEE":
        return f"[{index}]"
    if style == "Vancouver":
        return f"({index})"

    if not families:
        return f"(n.d.)"

    if style == "MLA":
        return f"({families[0]})" if len(families) == 1 else f"({families[0]} et al.)"

    if style == "Chicago":
        return f"({families[0]} {year})" if len(families) == 1 else f"({families[0]} et al. {year})"

    # APA / Harvard
    if len(families) == 1:
        return f"({families[0]}, {year})"
    if len(families) == 2:
        joiner = "&" if style == "APA" else "and"
        return f"({families[0]} {joiner} {families[1]}, {year})"
    return f"({families[0]} et al., {year})"


def format_bibtex(c: dict) -> str:
    authors = _author_family_given(c.get("authors") or [])
    author_str = " and ".join(f"{fam}, {giv}" for fam, giv in authors)
    fam0 = authors[0][0].lower().replace(" ", "") if authors else "ref"
    key = f"{fam0}{c.get('year') or ''}"

    lines = [f"@article{{{key},"]
    lines.append(f'  title={{{c.get("title") or ""}}},')
    if author_str:
        lines.append(f"  author={{{author_str}}},")
    if c.get("venue"):
        lines.append(f'  journal={{{c.get("venue")}}},')
    if c.get("volume"):
        lines.append(f'  volume={{{c.get("volume")}}},')
    if c.get("issue"):
        lines.append(f'  number={{{c.get("issue")}}},')
    if c.get("pages"):
        lines.append(f'  pages={{{c.get("pages")}}},')
    if c.get("year"):
        lines.append(f'  year={{{c.get("year")}}},')
    if c.get("doi"):
        lines.append(f'  doi={{{c.get("doi")}}},')
    lines.append("}")
    return "\n".join(lines)


def build_full_citation(c: dict, index: int = 1) -> dict:
    """Attach precomputed bibliography + in-text strings for every supported style, plus BibTeX."""
    out = dict(c)
    out["formatted"] = {style: format_bibliography(c, style) for style in STYLES}
    out["in_text"] = {style: format_in_text(c, style, index) for style in STYLES}
    out["bibtex"] = format_bibtex(c)
    return out
