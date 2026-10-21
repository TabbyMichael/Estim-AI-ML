"""SQLAlchemy models for the cost forecasting module (schema: cost_forecasting).

Tables: cost_forecasts, cost_snapshots, forecast_models.
Cross-schema FKs are forbidden (ADR-002).
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(UTC)


class CostForecastModel(Base):
    __tablename__ = "cost_forecasts"
    __table_args__ = {"schema": "cost_forecasting"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    forecast_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    predicted_amount: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False)
    confidence_interval_low: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False)
    confidence_interval_high: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False)
    model_version: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    created_by: Mapped[str] = mapped_column(String(100), nullable=False)
    actual_amount: Mapped[float | None] = mapped_column(Numeric(18, 2), nullable=True)
    variance: Mapped[float | None] = mapped_column(Numeric(18, 2), nullable=True)
    accuracy_score: Mapped[float | None] = mapped_column(nullable=True)
    approved_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class CostSnapshotModel(Base):
    __tablename__ = "cost_snapshots"
    __table_args__ = {"schema": "cost_forecasting"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    snapshot_metadata: Mapped[dict] = mapped_column(Text, nullable=False)


class ForecastModelModel(Base):
    __tablename__ = "forecast_models"
    __table_args__ = {"schema": "cost_forecasting"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    model_type: Mapped[str] = mapped_column(String(50), nullable=False)
    training_period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    training_period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    metrics: Mapped[dict] = mapped_column(Text, nullable=False)
