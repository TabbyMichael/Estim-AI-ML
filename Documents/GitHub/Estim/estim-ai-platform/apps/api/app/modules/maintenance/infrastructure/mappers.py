"""Entity <-> model mappers for the maintenance module."""

import uuid
from datetime import UTC, datetime

from app.modules.maintenance.domain.entities import (
    Equipment,
    EquipmentStatus,
    FailurePrediction,
    MaintenanceRecord,
    MaintenanceType,
    RiskLevel,
)
from app.modules.maintenance.infrastructure.models import (
    EquipmentModel,
    FailurePredictionModel,
    MaintenanceRecordModel,
)


def _tz(v: datetime | None) -> datetime | None:
    if v is None:
        return None
    return v if v.tzinfo else v.replace(tzinfo=UTC)


def equipment_to_model(e: Equipment) -> EquipmentModel:
    return EquipmentModel(id=uuid.UUID(e.id), name=e.name,
                          equipment_type=e.equipment_type, site_id=e.site_id,
                          status=e.status.value,
                          operating_hours=e.operating_hours,
                          created_at=e.created_at)


def model_to_equipment(m: EquipmentModel) -> Equipment:
    created = _tz(m.created_at)
    assert created is not None
    return Equipment(id=str(m.id), name=m.name,
                     equipment_type=m.equipment_type, site_id=m.site_id,
                     status=EquipmentStatus(m.status),
                     operating_hours=m.operating_hours, created_at=created)


def record_to_model(r: MaintenanceRecord) -> MaintenanceRecordModel:
    return MaintenanceRecordModel(
        id=uuid.UUID(r.id), equipment_id=r.equipment_id,
        maintenance_type=r.maintenance_type.value, description=r.description,
        performed_by=r.performed_by, performed_at=r.performed_at,
        downtime_hours=r.downtime_hours, cost=r.cost)


def model_to_record(m: MaintenanceRecordModel) -> MaintenanceRecord:
    performed = _tz(m.performed_at)
    assert performed is not None
    return MaintenanceRecord(
        id=str(m.id), equipment_id=m.equipment_id,
        maintenance_type=MaintenanceType(m.maintenance_type),
        description=m.description, performed_by=m.performed_by,
        performed_at=performed, downtime_hours=m.downtime_hours, cost=m.cost)


def prediction_to_model(p: FailurePrediction) -> FailurePredictionModel:
    return FailurePredictionModel(
        id=uuid.UUID(p.id), equipment_id=p.equipment_id,
        failure_probability=p.failure_probability,
        risk_level=p.risk_level.value, horizon_days=p.horizon_days,
        model_version=p.model_version, created_at=p.created_at, notes=p.notes)


def model_to_prediction(m: FailurePredictionModel) -> FailurePrediction:
    created = _tz(m.created_at)
    assert created is not None
    return FailurePrediction(
        id=str(m.id), equipment_id=m.equipment_id,
        failure_probability=m.failure_probability,
        risk_level=RiskLevel(m.risk_level), horizon_days=m.horizon_days,
        model_version=m.model_version, created_at=created, notes=m.notes)
