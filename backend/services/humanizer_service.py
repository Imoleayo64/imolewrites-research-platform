import re

from backend.services.gemini_service import gemini_service

MODE_INSTRUCTIONS = {
    "academic": (
        "Rewrite the text in clear, precise academic prose suitable for a peer-reviewed "
        "manuscript. Remove robotic or overly formulaic AI phrasing, vary sentence "
        "structure, and keep it scholarly and objective. Preserve the original meaning "
        "and any facts or claims exactly."
    ),
    "professional": (
        "Rewrite the text in confident, polished professional tone suitable for a grant "
        "proposal or business report. Make it sound natural and human-written, not "
        "robotic. Preserve the original meaning exactly."
    ),
    "natural": (
        "Rewrite the text so it reads naturally, the way a thoughtful person would "
        "actually write it — conversational but still credible. Vary sentence rhythm, "
        "avoid stiff transitions and AI-sounding filler phrases. Preserve the original "
        "meaning exactly."
    ),
    "simple": (
        "Rewrite the text in plain, simple language a general audience could easily "
        "understand, while preserving the original meaning exactly. Shorten sentences "
        "and avoid jargon where possible."
    ),
}

REWRITE_SYSTEM_PROMPT = (
    "You are a writing assistant that rewrites academic and professional text to sound "
    "more natural and human-written while strictly preserving the original meaning and "
    "any facts, numbers, or claims. Respond with ONLY the rewritten text — no preamble, "
    "no quotation marks, no explanation."
)


async def humanize_text(text: str, mode: str) -> dict:
    text = (text or "").strip()
    if not text:
        return {"text": "", "score": 0, "original_score": 0, "words": 0}

    instruction = MODE_INSTRUCTIONS.get(mode, MODE_INSTRUCTIONS["academic"])
    prompt = f"{instruction}\n\nText:\n{text}"

    if not gemini_service.is_configured():
        raise RuntimeError("gemini_not_configured")

    rewritten = await gemini_service.generate_text(prompt, system_instruction=REWRITE_SYSTEM_PROMPT, temperature=0.6)
    # Strip accidental wrapping quotes some models add
    rewritten = rewritten.strip().strip('"').strip()

    return {
        "text": rewritten,
        "score": flesch_reading_ease(rewritten),
        "original_score": flesch_reading_ease(text),
        "words": len(rewritten.split()),
    }


def flesch_reading_ease(text: str) -> int:
    """
    Approximate Flesch Reading Ease score (0-100, higher = easier to read).
    Uses a lightweight heuristic syllable counter — good enough for a UI readability
    indicator, not a substitute for a real NLP library.
    """
    text = text.strip()
    if not text:
        return 0

    sentences = [s for s in re.split(r"[.!?]+", text) if s.strip()]
    words = re.findall(r"[A-Za-z']+", text)

    if not sentences or not words:
        return 0

    syllable_count = sum(_count_syllables(w) for w in words)

    words_per_sentence = len(words) / len(sentences)
    syllables_per_word = syllable_count / len(words)

    score = 206.835 - (1.015 * words_per_sentence) - (84.6 * syllables_per_word)
    return max(0, min(100, round(score)))


def _count_syllables(word: str) -> int:
    word = word.lower()
    vowels = "aeiouy"
    count = 0
    prev_was_vowel = False
    for ch in word:
        is_vowel = ch in vowels
        if is_vowel and not prev_was_vowel:
            count += 1
        prev_was_vowel = is_vowel
    if word.endswith("e") and count > 1:
        count -= 1
    return max(1, count)
