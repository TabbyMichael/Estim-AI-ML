"""Domain events for document intelligence."""

from dataclasses import dataclass

from app.shared.events import DomainEvent


@dataclass(frozen=True, kw_only=True)
class DocumentUploaded(DomainEvent):
    event_type: str = "document_intelligence.uploaded"
    document_id: str = ""
    project_id: str = ""


@dataclass(frozen=True, kw_only=True)
class DocumentIndexed(DomainEvent):
    event_type: str = "document_intelligence.indexed"
    document_id: str = ""
    chunk_count: int = 0
