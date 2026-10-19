"""SQLAlchemy models for document intelligence.

Production uses pgvector VECTOR columns for embeddings; the model keeps a
portable JSON fallback (`vector_json`) so SQLite tests run without the
extension. Repositories prefer the vector column when available.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(UTC)


class DocumentModel(Base):
    __tablename__ = "documents"
    __table_args__ = {"schema": "document_intelligence"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True,
                                          default=uuid.uuid4)
    project_id: Mapped[str] = mapped_column(String(100), nullable=False,
                                            index=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100),
                                              default="application/pdf")
    status: Mapped[str] = mapped_column(String(30), default="uploaded")
    created_by: Mapped[str] = mapped_column(String(100), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),
                                                 default=_utcnow)
    indexed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True)


class DocumentChunkModel(Base):
    __tablename__ = "document_chunks"
    __table_args__ = {"schema": "document_intelligence"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True,
                                          default=uuid.uuid4)
    document_id: Mapped[str] = mapped_column(String(100), nullable=False,
                                             index=True)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int] = mapped_column(Integer, default=0)


class EmbeddingModel(Base):
    __tablename__ = "embeddings"
    __table_args__ = {"schema": "document_intelligence"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True,
                                          default=uuid.uuid4)
    chunk_id: Mapped[str] = mapped_column(String(100), nullable=False,
                                          index=True)
    document_id: Mapped[str] = mapped_column(String(100), nullable=False,
                                             index=True)
    vector_json: Mapped[str] = mapped_column(Text, nullable=False,
                                             default="[]")
    model_version: Mapped[str] = mapped_column(String(50), default="v1")
