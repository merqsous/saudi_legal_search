import os
from pathlib import Path
from dotenv import load_dotenv
from urllib.parse import urlparse

load_dotenv(Path(__file__).resolve().parent.parent / "saudi_legal_scraper" / ".env")

# Support Railway/Render DATABASE_URL, fall back to individual env vars
DATABASE_URL = os.getenv("DATABASE_URL", "")

if DATABASE_URL:
    parsed = urlparse(DATABASE_URL)
    DB_NAME = parsed.path.lstrip("/")
    DB_USER = parsed.username
    DB_PASSWORD = parsed.password or ""
    DB_HOST = parsed.hostname
    DB_PORT = str(parsed.port or 5432)
else:
    DB_NAME = os.getenv("DB_NAME", "saudi_cases")
    DB_USER = os.getenv("DB_USER", os.getenv("USER", "postgres"))
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
EMBEDDING_MODEL = "text-embedding-3-small"
