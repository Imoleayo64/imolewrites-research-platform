import json
import re

from backend.services.gemini_service import gemini_service

SYSTEM_PROMPT = (
    "You are an academic journal-matching assistant. Given a manuscript abstract, "
    "suggest real, well-known, currently-publishing academic journals that genuinely "
    "fit its subject and methodology. Only suggest journals you are confident actually "
    "exist and are still active — never invent a journal name or publisher. Do NOT "
    "provide acceptance rates, impact factors, or article processing charges — you "
    "cannot verify current figures, so omit them entirely rather than guess. "
    "Respond with ONLY valid JSON, no markdown fences, no commentary, matching this "
    "exact shape:\n"
    '{"journals": [{"name": "...", "publisher": "...", "scope_fit": "1-2 sentence '
    'reason this journal fits the abstract", "open_access": true|false, '
    '"frequency": "e.g. Monthly / Continuous / Quarterly"}]}'
)


async def recommend_journals(abstract: str, preferences: list[str] | None = None) -> list[dict]:
    abstract = (abstract or "").strip()
    if not abstract:
        return []

    if not gemini_service.is_configured():
        raise RuntimeError("gemini_not_configured")

    pref_note = ""
    if preferences:
        pref_note = f"\n\nThe author prefers journals that are: {', '.join(preferences)}."

    prompt = (
        f"Suggest 4-6 real academic journals that best fit this abstract, ranked best "
        f"match first.{pref_note}\n\nAbstract:\n{abstract}"
    )

    print("[journal_service] Calling Gemini with structured JSON output...")
    raw = await gemini_service.generate_text(
        prompt,
        system_instruction=SYSTEM_PROMPT,
        temperature=0.4,
        response_mime_type="application/json",
    )
    print(f"[journal_service] Gemini raw response: {raw[:500]!r}")
    parsed = _parse_journals(raw)
    print(f"[journal_service] Parsed {len(parsed)} journals")
    return parsed


def _parse_journals(raw: str) -> list[dict]:
    cleaned = (raw or "").strip()
    # Strip accidental markdown code fences
    cleaned = re.sub(r"^```(?:json)?|```$", "", cleaned, flags=re.MULTILINE).strip()

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        # Gemini sometimes wraps/pads valid JSON with stray text — try to salvage
        # the first {...} or [...] block before giving up entirely.
        match = re.search(r"(\{.*\}|\[.*\])", cleaned, flags=re.DOTALL)
        if not match:
            return []
        try:
            data = json.loads(match.group(1))
        except json.JSONDecodeError:
            return []

    # Accept either {"journals": [...]} or a bare [...] — Gemini doesn't always
    # follow the wrapper-object instruction exactly.
    if isinstance(data, list):
        journals = data
    elif isinstance(data, dict):
        journals = data.get("journals", [])
    else:
        return []

    if not isinstance(journals, list):
        return []

    results = []
    for j in journals:
        if not isinstance(j, dict) or not j.get("name"):
            continue
        results.append({
            "name": j.get("name"),
            "publisher": j.get("publisher") or "Unknown publisher",
            "scope_fit": j.get("scope_fit") or "",
            "open_access": bool(j.get("open_access")),
            "frequency": j.get("frequency") or None,
        })
    return results
