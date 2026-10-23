"""Repositories for document intelligence."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.document_intelligence.domain.entities import (
    Document,
    DocumentChunk,
    Embedding,
    NotFoundError,
)
from app.modules.document_intelligence.infrastructure import mappers
from app.modules.document_intelligence.infrastructure.models import (
    DocumentChunkModel,
    DocumentModel,
    EmbeddingModel,
)


class SqlAlchemyDocumentRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_id(self, document_id: str) -> Document:
        m = self.session.get(DocumentModel, uuid.UUID(document_id))
        if m is None:
            raise NotFoundError(f"Document {document_id} not found.")
        return mappers.model_to_document(m)

    def save(self, document: Document) -> Document:
        merged = self.session.merge(mappers.document_to_model(document))
        self.session.flush()
        return mappers.model_to_document(merged)

    def list_documents(
        self, skip: int = 0, limit: int = 100, filters: dict | None = None
    ) -> tuple[list[Document], int]:
        stmt = select(DocumentModel)
        count_stmt = select(func.count(DocumentModel.id))
        for key in ("project_id", "status"):
            if filters and filters.get(key):
                col = getattr(DocumentModel, key)
                stmt = stmt.where(col == filters[key])
                count_stmt = count_stmt.where(col == filters[key])
        total = self.session.execute(count_stmt).scalar_one()
        rows = self.session.execute(stmt.offset(skip).limit(limit)).scalars()
        return [mappers.model_to_document(r) for r in rows], total


class SqlAlchemyChunkRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def save_all(self, chunks: list[DocumentChunk]) -> list[DocumentChunk]:
        out = []
        for c in chunks:
            merged = self.session.merge(mappers.chunk_to_model(c))
            self.session.flush()
            out.append(mappers.model_to_chunk(merged))
        return out

    def list_for_document(self, document_id: str) -> list[DocumentChunk]:
        stmt = (
            select(DocumentChunkModel)
            .where(DocumentChunkModel.document_id == document_id)
            .order_by(DocumentChunkModel.chunk_index)
        )
        rows = self.session.execute(stmt).scalars().all()
        return [mappers.model_to_chunk(r) for r in rows]


class SqlAlchemyEmbeddingRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def save_all(self, embeddings: list[Embedding]) -> list[Embedding]:
        out = []
        for e in embeddings:
            merged = self.session.merge(mappers.embedding_to_model(e))
            self.session.flush()
            out.append(mappers.model_to_embedding(merged))
        return out

    def list_for_document(self, document_id: str) -> list[Embedding]:
        stmt = select(EmbeddingModel).where(EmbeddingModel.document_id == document_id)
        rows = self.session.execute(stmt).scalars().all()
        return [mappers.model_to_embedding(r) for r in rows]

    def search_brute_force(
        self, query: list[float], limit: int = 5
    ) -> list[tuple[Embedding, float]]:
        stmt = select(EmbeddingModel).limit(500)
        rows = self.session.execute(stmt).scalars().all()
        scored = []
        for m in rows:
            emb = mappers.model_to_embedding(m)
            scored.append((emb, emb.similarity(query)))
        scored.sort(key=lambda t: t[1], reverse=True)
        return scored[:limit]
