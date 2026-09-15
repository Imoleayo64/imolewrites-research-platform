from sqlalchemy.orm import Session

from backend.database.models import PdfDocumentModel, PdfAnnotationModel


def list_pdfs(db: Session, user_id: int):
    return db.query(PdfDocumentModel).filter(PdfDocumentModel.user_id == user_id).order_by(PdfDocumentModel.created_at.desc()).all()


def get_pdf(db: Session, pdf_id: int, user_id: int):
    return db.query(PdfDocumentModel).filter(PdfDocumentModel.id == pdf_id, PdfDocumentModel.user_id == user_id).first()


def create_pdf(db: Session, user_id: int, filename: str, storage_key: str, page_count: int, extracted_text: str, size_bytes: int):
    doc = PdfDocumentModel(
        user_id=user_id,
        filename=filename,
        storage_key=storage_key,
        page_count=page_count,
        extracted_text=extracted_text,
        size_bytes=size_bytes,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def delete_pdf(db: Session, pdf_id: int, user_id: int) -> str | None:
    doc = get_pdf(db, pdf_id, user_id)
    if not doc:
        return None
    key = doc.storage_key
    db.query(PdfAnnotationModel).filter(PdfAnnotationModel.pdf_id == pdf_id).delete(synchronize_session=False)
    db.delete(doc)
    db.commit()
    return key


def list_annotations(db: Session, pdf_id: int):
    return db.query(PdfAnnotationModel).filter(PdfAnnotationModel.pdf_id == pdf_id).order_by(PdfAnnotationModel.page_number, PdfAnnotationModel.created_at).all()


def create_annotation(db: Session, pdf_id: int, user_id: int, page_number: int, highlighted_text: str, note: str, color: str, position_json: str = None):
    ann = PdfAnnotationModel(
        pdf_id=pdf_id, user_id=user_id, page_number=page_number,
        highlighted_text=highlighted_text, note=note, color=color or "#fde047",
        position_json=position_json,
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)
    return ann


def delete_annotation(db: Session, annotation_id: int, user_id: int) -> bool:
    ann = db.query(PdfAnnotationModel).filter(PdfAnnotationModel.id == annotation_id, PdfAnnotationModel.user_id == user_id).first()
    if not ann:
        return False
    db.delete(ann)
    db.commit()
    return True
