"""Business rules for document intelligence."""

from app.modules.document_intelligence.domain.entities import (
    Document,
    DocumentChunk,
    DocumentStatus,
)

CHUNK_SIZE = 500
CHUNK_OVERLAP = 50


def chunk_text(text: str, size: int = CHUNK_SIZE,
               overlap: int = CHUNK_OVERLAP) -> list[str]:
    words = text.split()
    if not words:
        return []
    chunks, i = [], 0
    step = max(size - overlap, 1)
    while i < len(words):
        chunks.append(" ".join(words[i: i + size]))
        i += step
    return chunks


def can_index(document: Document) -> bool:
    return document.status in (DocumentStatus.UPLOADED, DocumentStatus.FAILED)


def build_chunks(document_id: str, text: str) -> list[DocumentChunk]:
    import uuid
    out = []
    for idx, piece in enumerate(chunk_text(text)):
        out.append(DocumentChunk(id=str(uuid.uuid4()), document_id=document_id,
                                chunk_index=idx, text=piece,
                                token_count=len(piece.split())))
    return out
