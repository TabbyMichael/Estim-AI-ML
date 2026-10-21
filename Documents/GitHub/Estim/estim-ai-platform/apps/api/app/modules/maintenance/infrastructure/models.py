"""SQLAlchemy models for the maintenance module (schema: maintenance)."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, Float, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(UTC)


class EquipmentModel(Base):
    __tablename__ = "equipment"
    __table_args__ = {"schema": "maintenance"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    equipment_type: Mapped[str] = mapped_column(String(100), nullable=False)
    site_id: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="operational")
    operating_hours: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class MaintenanceRecordModel(Base):
    __tablename__ = "maintenance_records"
    __table_args__ = {"schema": "maintenance"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    equipment_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    maintenance_type: Mapped[str] = mapped_column(String(30), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    performed_by: Mapped[str] = mapped_column(String(100), default="")
    performed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    downtime_hours: Mapped[float] = mapped_column(Float, default=0.0)
    cost: Mapped[float] = mapped_column(Float, default=0.0)


class FailurePredictionModel(Base):
    __tablename__ = "failure_predictions"
    __table_args__ = {"schema": "maintenance"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    equipment_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    failure_probability: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False)
    horizon_days: Mapped[int] = mapped_column(default=30)
    model_version: Mapped[str] = mapped_column(String(50), default="v1")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
