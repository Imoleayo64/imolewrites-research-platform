from dotenv import load_dotenv
import os

load_dotenv()


class Settings:
    APP_NAME = "ImoleWrites Research Platform"
    APP_VERSION = "2.0.0"

    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
    DATABASE_URL = os.getenv("DATABASE_URL")
    SECRET_KEY = os.getenv("SECRET_KEY")
    SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "imolewrites-development-secret"
    )

    MENDELEY_CLIENT_ID = os.getenv("MENDELEY_CLIENT_ID")
    MENDELEY_CLIENT_SECRET = os.getenv("MENDELEY_CLIENT_SECRET")
    MENDELEY_REDIRECT_URI = os.getenv("MENDELEY_REDIRECT_URI", "http://127.0.0.1:8000/mendeley/callback")
    FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://127.0.0.1:5500/frontend")
    EXTRA_CORS_ORIGIN = os.getenv("EXTRA_CORS_ORIGIN")  # your deployed frontend's real URL, once live


settings = Settings()
