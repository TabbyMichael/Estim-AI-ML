"""SQLAlchemy models for notifications (schema: platform)."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(UTC)


class NotificationModel(Base):
    __tablename__ = "notifications"
    __table_args__ = {"schema": "platform"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    channel: Mapped[str] = mapped_column(String(20), nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", index=True)
    template_key: Mapped[str] = mapped_column(String(100), default="")
    event_type: Mapped[str] = mapped_column(String(150), default="")
    event_id: Mapped[str] = mapped_column(String(100), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)


class NotificationPreferenceModel(Base):
    __tablename__ = "notification_preferences"
    __table_args__ = {"schema": "platform"}

    user_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    channel: Mapped[str] = mapped_column(String(20), primary_key=True)
    event_type: Mapped[str] = mapped_column(String(150), primary_key=True, default="*")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
