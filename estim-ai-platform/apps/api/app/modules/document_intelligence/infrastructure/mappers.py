"""Mappers for document intelligence."""

import json
import uuid
from datetime import UTC, datetime

from app.modules.document_intelligence.domain.entities import (
    Document,
    DocumentChunk,
    DocumentStatus,
    Embedding,
)
from app.modules.document_intelligence.infrastructure.models import (
    DocumentChunkModel,
    DocumentModel,
    EmbeddingModel,
)


def _tz(v: datetime | None) -> datetime | None:
    if v is None:
        return None
    return v if v.tzinfo else v.replace(tzinfo=UTC)


def document_to_model(d: Document) -> DocumentModel:
    return DocumentModel(
        id=uuid.UUID(d.id),
        project_id=d.project_id,
        filename=d.filename,
        storage_key=d.storage_key,
        content_type=d.content_type,
        status=d.status.value,
        created_by=d.created_by,
        created_at=d.created_at,
        indexed_at=d.indexed_at,
    )


def model_to_document(m: DocumentModel) -> Document:
    created = _tz(m.created_at)
    assert created is not None
    return Document(
        id=str(m.id),
        project_id=m.project_id,
        filename=m.filename,
        storage_key=m.storage_key,
        content_type=m.content_type,
        status=DocumentStatus(m.status),
        created_by=m.created_by,
        created_at=created,
        indexed_at=_tz(m.indexed_at),
    )


def chunk_to_model(c: DocumentChunk) -> DocumentChunkModel:
    return DocumentChunkModel(
        id=uuid.UUID(c.id),
        document_id=c.document_id,
        chunk_index=c.chunk_index,
        text=c.text,
        token_count=c.token_count,
    )


def model_to_chunk(m: DocumentChunkModel) -> DocumentChunk:
    return DocumentChunk(
        id=str(m.id),
        document_id=m.document_id,
        chunk_index=m.chunk_index,
        text=m.text,
        token_count=m.token_count,
    )


def embedding_to_model(e: Embedding) -> EmbeddingModel:
    return EmbeddingModel(
        id=uuid.UUID(e.id),
        chunk_id=e.chunk_id,
        document_id=e.document_id,
        vector_json=json.dumps(e.vector),
        model_version=e.model_version,
    )


def model_to_embedding(m: EmbeddingModel) -> Embedding:
    vec: list[float] = json.loads(m.vector_json or "[]")
    return Embedding(
        id=str(m.id),
        chunk_id=m.chunk_id,
        document_id=m.document_id,
        vector=vec,
        model_version=m.model_version,
    )
