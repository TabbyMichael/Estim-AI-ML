"""Application services: DocumentService + RAGService."""

import uuid
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

from app.modules.document_intelligence.application.ports import (
    ChunkRepository,
    DocumentRepository,
    EmbeddingRepository,
)
from app.modules.document_intelligence.domain import rules
from app.modules.document_intelligence.domain.entities import (
    Document,
    DocumentStatus,
    Embedding,
)


class DocumentService:
    def __init__(
        self,
        documents: DocumentRepository,
        chunks: ChunkRepository | None = None,
        embeddings: EmbeddingRepository | None = None,
    ) -> None:
        self.documents = documents
        self.chunks = chunks
        self.embeddings = embeddings

    def upload(
        self,
        project_id: str,
        filename: str,
        storage_key: str,
        content_type: str = "application/pdf",
        created_by: str = "",
    ) -> Document:
        doc = Document(
            id=str(uuid.uuid4()),
            project_id=project_id,
            filename=filename,
            storage_key=storage_key,
            content_type=content_type,
            status=DocumentStatus.UPLOADED,
            created_by=created_by,
            created_at=datetime.now(UTC),
        )
        return self.documents.save(doc)

    def list_documents(
        self, skip: int = 0, limit: int = 100, filters: dict | None = None
    ) -> tuple[list[Document], int]:
        return self.documents.list_documents(skip, limit, filters or {})

    def index_document(
        self,
        document_id: str,
        text: str,
        embed_fn: Callable[[str], list[float]] | None = None,
    ) -> dict:
        doc = self.documents.get_by_id(document_id)
        if not rules.can_index(doc):
            raise ValueError(f"Cannot index in {doc.status.value}")
        if self.chunks is None:
            raise ValueError("Chunk repository not configured")
        built = rules.build_chunks(document_id, text)
        saved = self.chunks.save_all(built)
        count = len(saved)
        if self.embeddings is not None and embed_fn is not None:
            embs = [
                Embedding(
                    id=str(uuid.uuid4()),
                    chunk_id=c.id,
                    document_id=document_id,
                    vector=embed_fn(c.text),
                )
                for c in saved
            ]
            self.embeddings.save_all(embs)
        doc.mark_indexed()
        self.documents.save(doc)
        return {"document_id": document_id, "chunk_count": count}


class RAGService:
    def __init__(
        self,
        chunks: ChunkRepository,
        embeddings: EmbeddingRepository,
        embed_fn: Callable[[str], list[float]] | None = None,
    ) -> None:
        self.chunks = chunks
        self.embeddings = embeddings
        self.embed_fn = embed_fn or (lambda t: [float(len(t))] * 8)

    def search(self, query: str, limit: int = 5) -> list[dict]:
        qvec = self.embed_fn(query)
        hits = self.embeddings.search_brute_force(qvec, limit)
        results: list[dict[str, Any]] = []
        for emb, score in hits:
            results.append(
                {"chunk_id": emb.chunk_id, "document_id": emb.document_id, "score": round(score, 4)}
            )
        # Attach chunk text lazily per document.
        for r in results:
            for c in self.chunks.list_for_document(r["document_id"]):
                if c.id == r["chunk_id"]:
                    r["text"] = c.text[:500]
                    break
        return results

    def answer(self, query: str, limit: int = 3) -> dict:
        hits = self.search(query, limit)
        context = "\n---\n".join(h.get("text", "") for h in hits)
        draft = (
            f"Based on {len(hits)} retrieved passage(s), "
            f"here is what the corpus says about '{query}':\n{context[:1500]}"
        )
        return {"query": query, "answer": draft, "sources": hits}
