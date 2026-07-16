from dotenv import load_dotenv
import os

load_dotenv()


class Settings:
    APP_NAME = "ImoleWrites Research Platform"
    APP_VERSION = "2.0.0"

    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    DATABASE_URL = os.getenv("DATABASE_URL")
    SECRET_KEY = os.getenv("SECRET_KEY")
    SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "imolewrites-development-secret"
    )


settings = Settings()
