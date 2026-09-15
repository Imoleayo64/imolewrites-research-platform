from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
import asyncio

from backend.api.auth import router as auth_router
from backend.api.projects import router as projects_router
from backend.api.papers import router as papers_router
from backend.api.citations import router as citations_router
from backend.api.ai import router as ai_router
from backend.api.humanize import router as humanize_router
from backend.api.journals import router as journals_router
from backend.api.analytics import router as analytics_router
from backend.api.admin import router as admin_router
from backend.api.collaboration import router as collaboration_router
from backend.api.pdfs import router as pdfs_router
from backend.api.mendeley import router as mendeley_router
from backend.core.config import settings

# Database
from backend.database.database import Base, engine

# Import all SQLAlchemy models so SQLAlchemy knows what tables to create
from backend.database.models import UserModel, ProjectModel, ChapterModel, CitationModel, UsageEventModel, ProjectMemberModel, PdfDocumentModel, PdfAnnotationModel

# Create database tables if they don't already exist
Base.metadata.create_all(bind=engine)


def _run_lightweight_migrations():
    """
    SQLite + SQLAlchemy's create_all() only creates missing TABLES, not missing
    COLUMNS on tables that already exist. Since this project has no Alembic
    migration setup, this adds any newly-introduced columns to an existing
    database on startup, so local dev databases from earlier versions of the
    app don't break instead of requiring the .db file to be deleted.
    """
    import sqlite3

    db_url = str(engine.url)
    if not db_url.startswith("sqlite"):
        return  # only needed for the SQLite dev database

    db_path = db_url.split("///")[-1]
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    tables_and_columns = {
        "users": [
            ("institution", "VARCHAR(255)"),
            ("field", "VARCHAR(255)"),
            ("role", "VARCHAR(50)"),
            ("bio", "TEXT"),
            ("avatar_key", "VARCHAR(500)"),
            ("is_admin", "INTEGER DEFAULT 0"),
            ("mendeley_access_token", "VARCHAR(2000)"),
            ("mendeley_refresh_token", "VARCHAR(2000)"),
            ("mendeley_token_expires_at", "DATETIME"),
        ],
        "projects": [
            ("status", "VARCHAR(50) DEFAULT 'draft'"),
        ],
        "pdf_annotations": [
            ("position_json", "TEXT"),
        ],
    }

    for table, columns in tables_and_columns.items():
        cur.execute(f"PRAGMA table_info({table})")
        existing = {row[1] for row in cur.fetchall()}
        if not existing:
            continue  # table doesn't exist yet (fresh DB) — create_all already handled it
        for col_name, col_type in columns:
            if col_name not in existing:
                cur.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}")

    conn.commit()

    # Bootstrap: if no user is marked admin yet (e.g. accounts created before
    # the is_admin column existed), promote the earliest-registered user.
    cur.execute("SELECT COUNT(*) FROM users WHERE is_admin = 1")
    if cur.fetchone()[0] == 0:
        cur.execute("SELECT id FROM users ORDER BY id ASC LIMIT 1")
        row = cur.fetchone()
        if row:
            cur.execute("UPDATE users SET is_admin = 1 WHERE id = ?", (row[0],))
            conn.commit()

    conn.close()


_run_lightweight_migrations()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered research platform for researchers worldwide."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ] + ([settings.EXTRA_CORS_ORIGIN] if settings.EXTRA_CORS_ORIGIN else []),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Register API routers
app.include_router(projects_router)
app.include_router(auth_router)
app.include_router(papers_router)
app.include_router(citations_router)
app.include_router(ai_router)
app.include_router(humanize_router)
app.include_router(journals_router)
app.include_router(analytics_router)
app.include_router(admin_router)
app.include_router(collaboration_router)
app.include_router(pdfs_router)
app.include_router(mendeley_router)

# Real-time collaboration: mount the Yjs-compatible WebSocket relay at /collab.
# Clients connect to  ws(s)://<host>/collab/{project_id}?token=<jwt>
# This is wrapped in a try/except on purpose: it depends on pycrdt/pycrdt-websocket,
# which are optional. If they're not installed (or fail to import for any reason),
# the rest of the app must keep working — only live co-editing is unavailable.
_collab_state = {}
_collab_available = False

try:
    from backend.services.collab_server import (
        asgi_collab_server,
        start_collab_server,
        stop_collab_server,
        periodic_sync_to_db,
    )
    app.mount("/collab", asgi_collab_server)
    _collab_available = True
except Exception as e:
    print(f"[startup] Real-time collaboration is disabled — pycrdt/pycrdt-websocket "
          f"failed to load ({e}). Everything else will run normally.")


@app.on_event("startup")
async def _startup_collab():
    if not _collab_available:
        return
    _collab_state["task"] = await start_collab_server()
    _collab_state["sync_task"] = asyncio.create_task(periodic_sync_to_db())


@app.on_event("shutdown")
async def _shutdown_collab():
    if not _collab_available:
        return
    sync_task = _collab_state.get("sync_task")
    if sync_task:
        sync_task.cancel()
    await stop_collab_server()


@app.get("/")
def home():
    return {
        "platform": settings.APP_NAME,
        "status": "Running",
        "version": settings.APP_VERSION
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }