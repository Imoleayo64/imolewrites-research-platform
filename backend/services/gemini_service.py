from backend.core.config import settings


class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY

    def is_configured(self):
        return self.api_key is not None


gemini_service = GeminiService()
