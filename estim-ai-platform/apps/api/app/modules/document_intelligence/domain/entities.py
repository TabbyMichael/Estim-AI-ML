"""Domain entities for document intelligence."""

from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import Enum


class DocumentStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    INDEXED = "indexed"
    FAILED = "failed"


@dataclass
class Document:
    id: str
    project_id: str
    filename: str
    storage_key: str
    content_type: str = "application/pdf"
    status: DocumentStatus = DocumentStatus.UPLOADED
    created_by: str = ""
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    indexed_at: datetime | None = None

    def __post_init__(self) -> None:
        if not self.id or not self.filename or not self.storage_key:
            raise ValueError("Document id/filename/storage key required")

    def mark_indexed(self) -> None:
        self.status = DocumentStatus.INDEXED
        self.indexed_at = datetime.now(UTC)


@dataclass
class DocumentChunk:
    id: str
    document_id: str
    chunk_index: int
    text: str
    token_count: int = 0

    def __post_init__(self) -> None:
        if not self.text:
            raise ValueError("Chunk text required")


@dataclass
class Embedding:
    id: str
    chunk_id: str
    document_id: str
    vector: list[float]
    model_version: str = "v1"

    def __post_init__(self) -> None:
        if not self.vector:
            raise ValueError("Embedding vector required")

    def similarity(self, other: list[float]) -> float:
        import math

        dot = sum(a * b for a, b in zip(self.vector, other, strict=False))
        na = math.sqrt(sum(a * a for a in self.vector))
        nb = math.sqrt(sum(b * b for b in other))
        if na == 0 or nb == 0:
            return 0.0
        return dot / (na * nb)


class NotFoundError(Exception):
    pass


class InvalidStateError(Exception):
    pass
