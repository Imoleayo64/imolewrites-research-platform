import httpx

from backend.core.config import settings

GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model = settings.GEMINI_MODEL

    def is_configured(self):
        return bool(self.api_key)

    async def generate(self, contents: list[dict], system_instruction: str | None = None, temperature: float = 0.7, response_mime_type: str | None = None) -> str:
        """
        Low-level call to Gemini's generateContent endpoint.
        `contents` is a list of {"role": "user"|"model", "parts": [{"text": "..."}]}.
        `response_mime_type="application/json"` forces Gemini to return valid JSON
        only — much more reliable than asking for JSON via the prompt alone.
        Returns the model's plain text reply. Raises RuntimeError on failure.
        """
        if not self.is_configured():
            raise RuntimeError("gemini_not_configured")

        generation_config = {"temperature": temperature}
        if response_mime_type:
            generation_config["responseMimeType"] = response_mime_type

        body = {
            "contents": contents,
            "generationConfig": generation_config,
        }
        if system_instruction:
            body["systemInstruction"] = {"parts": [{"text": system_instruction}]}

        url = f"{GEMINI_BASE}/{self.model}:generateContent"
        headers = {
            "x-goog-api-key": self.api_key,
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=headers, json=body)

        if resp.status_code != 200:
            raise RuntimeError(f"gemini_api_error:{resp.status_code}:{resp.text[:300]}")

        data = resp.json()
        try:
            candidates = data["candidates"]
            parts = candidates[0]["content"]["parts"]
            return "".join(p.get("text", "") for p in parts).strip()
        except (KeyError, IndexError):
            finish_reason = (data.get("candidates") or [{}])[0].get("finishReason", "unknown")
            raise RuntimeError(f"gemini_no_content:{finish_reason}")

    async def chat(self, messages: list[dict], system_instruction: str | None = None) -> str:
        """
        messages: list of {"role": "user"|"assistant", "content": "..."} (frontend chat format).
        Converts to Gemini's role/parts format and returns the reply text.
        """
        contents = []
        for m in messages:
            role = "model" if m.get("role") == "assistant" else "user"
            text = m.get("content", "")
            if not text:
                continue
            contents.append({"role": role, "parts": [{"text": text}]})

        if not contents:
            return "I didn't receive a message to respond to."

        return await self.generate(contents, system_instruction=system_instruction)

    async def generate_text(self, prompt: str, system_instruction: str | None = None, temperature: float = 0.7, response_mime_type: str | None = None) -> str:
        return await self.generate(
            [{"role": "user", "parts": [{"text": prompt}]}],
            system_instruction=system_instruction,
            temperature=temperature,
            response_mime_type=response_mime_type,
        )


gemini_service = GeminiService()
