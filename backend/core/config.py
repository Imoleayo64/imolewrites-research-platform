from dotenv import load_dotenv
import os

load_dotenv()


class Settings:
    APP_NAME = "ImoleWrites Research Platform"
    APP_VERSION = "2.0.0"

    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-pro")
    DATABASE_URL = os.getenv("DATABASE_URL")
    SECRET_KEY = os.getenv("SECRET_KEY")
    SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "imolewrites-development-secret"
    )

    MENDELEY_CLIENT_ID = os.getenv("MENDELEY_CLIENT_ID")
    MENDELEY_CLIENT_SECRET = os.getenv("MENDELEY_CLIENT_SECRET")
    MENDELEY_REDIRECT_URI = os.getenv("MENDELEY_REDIRECT_URI", "https://imolewrites-backend.onrender.com/mendeley/callback")
    FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "https://imolewrites-research-platform.vercel.app")
    EXTRA_CORS_ORIGIN = os.getenv("EXTRA_CORS_ORIGIN")  # your deployed frontend's real URL, once live


settings = Settings()
