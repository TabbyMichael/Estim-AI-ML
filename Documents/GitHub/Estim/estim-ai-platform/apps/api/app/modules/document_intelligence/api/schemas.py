"""Pydantic schemas for document intelligence."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.modules.document_intelligence.domain.entities import Document


class DocumentUploadRequest(BaseModel):
    project_id: str = Field(..., min_length=1)
    filename: str = Field(..., min_length=1)
    storage_key: str = Field(..., min_length=1)
    content_type: str = Field("application/pdf")
    created_by: str = Field("")


class DocumentResponse(BaseModel):
    id: str
    project_id: str
    filename: str
    storage_key: str
    content_type: str
    status: str
    created_by: str
    created_at: datetime

    @classmethod
    def from_entity(cls, d: Document) -> "DocumentResponse":
        return cls(
            id=d.id,
            project_id=d.project_id,
            filename=d.filename,
            storage_key=d.storage_key,
            content_type=d.content_type,
            status=d.status.value,
            created_by=d.created_by,
            created_at=d.created_at,
        )


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int
    skip: int
    limit: int


class IndexRequest(BaseModel):
    text: str = Field(..., min_length=1)


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    limit: int = Field(5, gt=0, le=20)


class AskRequest(BaseModel):
    query: str = Field(..., min_length=1)
    limit: int = Field(3, gt=0, le=10)


class SourceHit(BaseModel):
    chunk_id: str
    document_id: str
    score: float
    text: str | None = None


class AskResponse(BaseModel):
    query: str
    answer: str
    sources: list[SourceHit]
