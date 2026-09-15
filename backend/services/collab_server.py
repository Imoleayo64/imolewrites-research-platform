"""
Real-time collaborative editing server for ImoleWrites, built on pycrdt +
pycrdt-websocket (the same CRDT stack JupyterLab uses for its own real-time
collaboration). Each project gets its own "room"; clients sync a shared
Y.Text named "content" using the standard Yjs wire protocol, so the browser
can use the official `yjs` + `y-websocket` JS libraries unchanged.

Persistence works in two layers:
1. Every CRDT update is durably persisted to a SQLite-backed YStore
   (crash/restart safe, keeps full document history).
2. A lightweight background task periodically mirrors the live plain-text
   content back into the main app's `chapters.content` column, so the rest
   of the app (word counts, export, analytics) keeps working unchanged.

Known limitation (v1): access control is enforced at connection time (only
project owners/members can join a room), but a "viewer" role is not yet
enforced as read-only at the CRDT layer — anyone who can connect can send
edits. Real read-only enforcement is a follow-up.
"""
import asyncio
import os
from urllib.parse import parse_qs

from pycrdt import Text
from pycrdt_websocket import WebsocketServer, ASGIServer
from pycrdt_websocket.ystore import SQLiteYStore

from backend.database.session import SessionLocal
from backend.database.models import ChapterModel
from backend.crud.collaboration import get_project_role
from backend.crud.users import get_user_by_email
from backend.services.jwt_service import decode_access_token

COLLAB_DB_PATH = os.getenv("COLLAB_DB_PATH", "collab_store.db")


class ImoleYStore(SQLiteYStore):
    db_path = COLLAB_DB_PATH


class ImoleWebsocketServer(WebsocketServer):
    """Seeds a brand-new room's shared text with the project's saved content,
    so the first collaborator to join sees real existing content instead of
    a blank document."""

    async def get_room(self, name: str):
        is_new_room = name not in self.rooms
        room = await super().get_room(name)
        if is_new_room:
            project_id = _project_id_from_room_name(name)
            if project_id is not None:
                initial_text = _load_chapter_content(project_id)
                if initial_text:
                    ytext = room.ydoc.get("content", type=Text)
                    if str(ytext) == "":
                        ytext += initial_text
        return room


def _project_id_from_room_name(name: str) -> int | None:
    try:
        return int(name.strip("/"))
    except (ValueError, AttributeError):
        return None


def _load_chapter_content(project_id: int) -> str:
    db = SessionLocal()
    try:
        chapter = db.query(ChapterModel).filter(ChapterModel.project_id == project_id).first()
        return chapter.content if chapter and chapter.content else ""
    finally:
        db.close()


def _save_chapter_content(project_id: int, content: str):
    db = SessionLocal()
    try:
        chapter = db.query(ChapterModel).filter(ChapterModel.project_id == project_id).first()
        if chapter and chapter.content != content:
            chapter.content = content
            db.commit()
    finally:
        db.close()


websocket_server = ImoleWebsocketServer(auto_clean_rooms=True)


async def on_connect(msg: dict, scope: dict) -> bool:
    """Returns True to REJECT the connection, False/None to accept — per
    pycrdt-websocket's ASGIServer contract."""
    query_string = scope.get("query_string", b"").decode()
    params = parse_qs(query_string)
    token = (params.get("token") or [None])[0]
    if not token:
        return True

    email = decode_access_token(token)
    if not email:
        return True

    project_id = _project_id_from_room_name(scope.get("path", ""))
    if project_id is None:
        return True

    db = SessionLocal()
    try:
        user = get_user_by_email(db, email)
        if not user:
            return True
        role = get_project_role(db, project_id, user.id)
        return role is None  # reject if the user has no access to this project
    finally:
        db.close()


asgi_collab_server = ASGIServer(websocket_server, on_connect=on_connect)


async def start_collab_server():
    task = asyncio.create_task(websocket_server.start())
    await websocket_server.started.wait()
    return task


async def stop_collab_server():
    await websocket_server.stop()


async def periodic_sync_to_db(interval_seconds: int = 4):
    """Background loop: mirrors each active room's live text into the main
    database so the rest of the app sees up-to-date content."""
    last_synced: dict[str, str] = {}
    while True:
        await asyncio.sleep(interval_seconds)
        for room_name, room in list(websocket_server.rooms.items()):
            project_id = _project_id_from_room_name(room_name)
            if project_id is None:
                continue
            try:
                ytext = room.ydoc.get("content", type=Text)
                current = str(ytext)
            except Exception:
                continue
            if last_synced.get(room_name) != current:
                _save_chapter_content(project_id, current)
                last_synced[room_name] = current
