from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
import json

from backend.crud.pdfs import (
    list_pdfs, get_pdf, create_pdf, delete_pdf,
    list_annotations, create_annotation, delete_annotation,
)
from backend.database.session import get_db
from backend.services.auth_service import get_current_user
from backend.services.analytics_service import log_event
from backend.services.pdf_service import extract_text_and_pages
from backend.services.storage_service import save_file, read_file, delete_file, is_using_persistent_storage
from backend.services.gemini_service import gemini_service

router = APIRouter(prefix="/pdfs", tags=["PDF Workspace"])

MAX_PDF_BYTES = 25 * 1024 * 1024  # 25 MB


@router.get("/storage-info")
def storage_info(current_user=Depends(get_current_user)):
    return {"persistent": is_using_persistent_storage()}


@router.get("")
@router.get("/")
def get_pdfs(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    docs = list_pdfs(db, current_user.id)
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "page_count": d.page_count,
            "size_bytes": d.size_bytes,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in docs
    ]


@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=422, detail="Only PDF files are supported.")

    content = await file.read()
    if len(content) > MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail="File is too large (25 MB max).")

    try:
        text, page_count = extract_text_and_pages(content)
    except Exception:
        raise HTTPException(status_code=422, detail="Couldn't read that PDF — it may be corrupted or scanned-image-only.")

    key = save_file(current_user.id, file.filename, content)
    doc = create_pdf(db, current_user.id, file.filename, key, page_count, text, len(content))
    return {
        "id": doc.id,
        "filename": doc.filename,
        "page_count": doc.page_count,
        "size_bytes": doc.size_bytes,
    }


@router.get("/{pdf_id}/file")
def get_pdf_file(pdf_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    doc = get_pdf(db, pdf_id, current_user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="PDF not found")
    content = read_file(doc.storage_key)
    return Response(content=content, media_type="application/pdf")


@router.delete("/{pdf_id}")
def remove_pdf(pdf_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    key = delete_pdf(db, pdf_id, current_user.id)
    if not key:
        raise HTTPException(status_code=404, detail="PDF not found")
    delete_file(key)
    return {"deleted": True}


class AnnotationCreate(BaseModel):
    page_number: int = 1
    highlighted_text: Optional[str] = None
    note: Optional[str] = None
    color: Optional[str] = "#facc15"
    position: Optional[List[Dict[str, Any]]] = None  # [{xPct, yPct, widthPct, heightPct}, ...]


def _annotation_dict(a):
    return {
        "id": a.id,
        "page_number": a.page_number,
        "highlighted_text": a.highlighted_text,
        "note": a.note,
        "color": a.color,
        "position": json.loads(a.position_json) if a.position_json else None,
    }


@router.get("/{pdf_id}/annotations")
def get_annotations(pdf_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    doc = get_pdf(db, pdf_id, current_user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="PDF not found")
    rows = list_annotations(db, pdf_id)
    return [_annotation_dict(a) for a in rows]


@router.post("/{pdf_id}/annotations")
def add_annotation(
    pdf_id: int,
    payload: AnnotationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    doc = get_pdf(db, pdf_id, current_user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="PDF not found")
    position_json = json.dumps(payload.position) if payload.position else None
    a = create_annotation(
        db, pdf_id, current_user.id, payload.page_number,
        payload.highlighted_text, payload.note, payload.color,
        position_json=position_json,
    )
    return _annotation_dict(a)


@router.delete("/annotations/{annotation_id}")
def remove_annotation(annotation_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    ok = delete_annotation(db, annotation_id, current_user.id)
    if not ok:
        raise HTTPException(status_code=404, detail="Annotation not found")
    return {"deleted": True}


class AskRequest(BaseModel):
    question: str


@router.post("/{pdf_id}/ask")
async def ask_about_pdf(
    pdf_id: int,
    payload: AskRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    doc = get_pdf(db, pdf_id, current_user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="PDF not found")
    if not gemini_service.is_configured():
        raise HTTPException(status_code=503, detail="AI assistant is not configured. Set GEMINI_API_KEY on the server.")

    context = (doc.extracted_text or "")[:20000]  # keep prompt size reasonable
    if not context.strip():
        raise HTTPException(status_code=422, detail="No extractable text was found in this PDF (it may be scanned images).")

    prompt = f"Document text:\n{context}\n\nQuestion: {payload.question}\n\nAnswer using only the document above. If the answer isn't in the document, say so."
    try:
        answer = await gemini_service.generate_text(prompt, system_instruction="You are a research assistant answering questions strictly grounded in the provided document text.")
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=f"AI request failed: {e}")

    log_event(db, user_id=current_user.id, event_type="ai_chat")
    return {"answer": answer}
