from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
import io

from backend.services.gemini_service import gemini_service
from backend.services.auth_service import get_current_user
from backend.services.analytics_service import log_event
from backend.services.pdf_service import extract_text_and_pages
from backend.database.session import get_db

router = APIRouter(
    prefix="/ai",
    tags=["AI Assistant"]
)

SYSTEM_PROMPT = (
    "You are the ImoleWrites AI Research Assistant, embedded in an academic writing "
    "and research platform. Help researchers, students, and academic writers with "
    "literature summaries, drafting, methodology guidance, statistics advice, and "
    "citation help. Be precise, concise, and cite uncertainty when you have it — "
    "never invent citations, DOIs, or statistics. When helpful, use short paragraphs "
    "or bullet points."
)


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]


@router.post("/chat")
async def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not gemini_service.is_configured():
        raise HTTPException(
            status_code=503,
            detail="AI assistant is not configured. Set GEMINI_API_KEY on the server.",
        )

    try:
        reply = await gemini_service.chat(
            [m.model_dump() for m in payload.messages],
            system_instruction=SYSTEM_PROMPT,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=f"AI request failed: {e}")

    log_event(db, user_id=current_user.id, event_type="ai_chat")
    return {"reply": reply}


MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024  # 15 MB
MAX_EXTRACTED_CHARS = 20000  # keep prompt size sane


@router.post("/extract-text")
async def extract_text(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    """
    One-shot text extraction for documents attached to a chat message —
    doesn't save anything permanently (unlike PDF Workspace uploads).
    Supports PDF, DOCX, and plain text files.
    """
    content = await file.read()
    if len(content) > MAX_ATTACHMENT_BYTES:
        raise HTTPException(status_code=413, detail="File is too large (15 MB max).")

    filename = file.filename or "document"
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

    try:
        if ext == "pdf":
            text, _ = extract_text_and_pages(content)
        elif ext == "docx":
            from docx import Document
            doc = Document(io.BytesIO(content))
            text = "\n".join(p.text for p in doc.paragraphs)
        elif ext in ("txt", "md", "csv"):
            text = content.decode("utf-8", errors="ignore")
        else:
            raise HTTPException(status_code=422, detail="Supported file types: PDF, DOCX, TXT, MD, CSV.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Couldn't read that file: {e}")

    text = (text or "").strip()
    if not text:
        raise HTTPException(status_code=422, detail="No extractable text was found in this file.")

    truncated = len(text) > MAX_EXTRACTED_CHARS
    return {
        "filename": filename,
        "text": text[:MAX_EXTRACTED_CHARS],
        "truncated": truncated,
    }
