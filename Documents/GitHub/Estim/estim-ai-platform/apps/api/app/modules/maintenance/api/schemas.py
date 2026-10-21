"""Pydantic schemas for the maintenance API."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.modules.maintenance.domain.entities import Equipment, FailurePrediction


class EquipmentCreate(BaseModel):
    name: str = Field(..., min_length=1)
    equipment_type: str = Field(..., min_length=1)
    site_id: str = Field("")


class EquipmentResponse(BaseModel):
    id: str
    name: str
    equipment_type: str
    site_id: str
    status: str
    operating_hours: float
    created_at: datetime

    @classmethod
    def from_entity(cls, e: Equipment) -> "EquipmentResponse":
        return cls(
            id=e.id,
            name=e.name,
            equipment_type=e.equipment_type,
            site_id=e.site_id,
            status=e.status.value,
            operating_hours=e.operating_hours,
            created_at=e.created_at,
        )


class EquipmentListResponse(BaseModel):
    equipment: list[EquipmentResponse]
    total: int
    skip: int
    limit: int


class MaintenanceLogCreate(BaseModel):
    maintenance_type: str = Field(..., min_length=1)
    description: str = Field("")
    performed_by: str = Field("")
    downtime_hours: float = Field(0.0, ge=0)
    cost: float = Field(0.0, ge=0)


class PredictionCreate(BaseModel):
    failure_probability: float = Field(..., ge=0, le=1)
    horizon_days: int = Field(30, gt=0)


class PredictionResponse(BaseModel):
    id: str
    equipment_id: str
    failure_probability: float
    risk_level: str
    horizon_days: int
    model_version: str
    created_at: datetime
    notes: str | None = None

    @classmethod
    def from_entity(cls, p: FailurePrediction) -> "PredictionResponse":
        return cls(
            id=p.id,
            equipment_id=p.equipment_id,
            failure_probability=p.failure_probability,
            risk_level=p.risk_level.value,
            horizon_days=p.horizon_days,
            model_version=p.model_version,
            created_at=p.created_at,
            notes=p.notes,
        )
