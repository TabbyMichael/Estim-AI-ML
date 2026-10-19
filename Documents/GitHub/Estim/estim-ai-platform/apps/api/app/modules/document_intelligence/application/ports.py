"""Ports for document intelligence."""

from __future__ import annotations

from typing import Protocol

from app.modules.document_intelligence.domain.entities import (
    Document,
    DocumentChunk,
    Embedding,
)


class DocumentRepository(Protocol):
    def get_by_id(self, document_id: str) -> Document: ...
    def save(self, document: Document) -> Document: ...
    def list_documents(
        self, skip: int = 0, limit: int = 100, filters: dict | None = None
    ) -> tuple[list[Document], int]: ...


class ChunkRepository(Protocol):
    def save_all(self, chunks: list[DocumentChunk]) -> list[DocumentChunk]: ...
    def list_for_document(self, document_id: str) -> list[DocumentChunk]: ...


class EmbeddingRepository(Protocol):
    def save_all(self, embeddings: list[Embedding]) -> list[Embedding]: ...
    def list_for_document(self, document_id: str) -> list[Embedding]: ...
    def search_brute_force(
        self, query: list[float], limit: int = 5
    ) -> list[tuple[Embedding, float]]: ...
