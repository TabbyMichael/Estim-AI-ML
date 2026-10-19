"""SQLAlchemy models for the inventory module (schema: inventory)."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(UTC)


class StockSnapshotModel(Base):
    __tablename__ = "stock_snapshots"
    __table_args__ = {"schema": "inventory"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True,
                                          default=uuid.uuid4)
    material_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    site_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    quantity_on_hand: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False)
    unit: Mapped[str] = mapped_column(String(20), default="units")
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),
                                                  default=_utcnow)
    reorder_point: Mapped[float] = mapped_column(Numeric(18, 4), default=0.0)
    snapshot_metadata: Mapped[str] = mapped_column(Text, default="{}")


class DemandForecastModel(Base):
    __tablename__ = "demand_forecasts"
    __table_args__ = {"schema": "inventory"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True,
                                          default=uuid.uuid4)
    material_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    site_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    forecast_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    predicted_quantity: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False)
    confidence_low: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False)
    confidence_high: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False)
    horizon_days: Mapped[int] = mapped_column(default=30)
    model_version: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),
                                                 default=_utcnow)
    created_by: Mapped[str] = mapped_column(String(100), nullable=False)
    approved_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
