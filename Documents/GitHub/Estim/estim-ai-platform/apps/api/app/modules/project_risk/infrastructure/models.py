"""SQLAlchemy models for project risk (schema: project_risk)."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, Float, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(UTC)


class MilestoneModel(Base):
    __tablename__ = "milestones"
    __table_args__ = {"schema": "project_risk"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True,
                                          default=uuid.uuid4)
    project_id: Mapped[str] = mapped_column(String(100), nullable=False,
                                            index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    planned_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    planned_end: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(30), default="not_started")
    actual_start: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True)
    actual_end: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True)
    progress_pct: Mapped[float] = mapped_column(Float, default=0.0)


class RiskPredictionModel(Base):
    __tablename__ = "risk_predictions"
    __table_args__ = {"schema": "project_risk"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True,
                                          default=uuid.uuid4)
    project_id: Mapped[str] = mapped_column(String(100), nullable=False,
                                            index=True)
    milestone_id: Mapped[str] = mapped_column(String(100), nullable=False,
                                              index=True)
    delay_probability: Mapped[float] = mapped_column(Float, nullable=False)
    predicted_delay_days: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False)
    model_version: Mapped[str] = mapped_column(String(50), default="v1")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),
                                                 default=_utcnow)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
