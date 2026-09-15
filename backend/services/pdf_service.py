import io

from pypdf import PdfReader


def extract_text_and_pages(content: bytes) -> tuple[str, int]:
    reader = PdfReader(io.BytesIO(content))
    page_count = len(reader.pages)
    text_parts = []
    for page in reader.pages:
        try:
            text_parts.append(page.extract_text() or "")
        except Exception:
            continue
    return "\n\n".join(text_parts), page_count
