"""SQLAlchemy model for the audit module (schema: platform)."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import JSON, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(UTC)


class AuditLogModel(Base):
    __tablename__ = "audit_logs"
    __table_args__ = {"schema": "platform"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    resource_type: Mapped[str] = mapped_column(String(100), default="", index=True)
    resource_id: Mapped[str] = mapped_column(String(100), default="")
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    ip_address: Mapped[str] = mapped_column(String(64), default="")
    user_agent: Mapped[str] = mapped_column(String(500), default="")
    correlation_id: Mapped[str] = mapped_column(String(100), default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, index=True
    )
