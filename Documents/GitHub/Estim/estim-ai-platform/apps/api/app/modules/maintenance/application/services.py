"""Application services for the maintenance module."""

import uuid
from datetime import UTC, datetime

from app.modules.maintenance.application.ports import (
    EquipmentRepository,
    FailurePredictionRepository,
    MaintenanceRecordRepository,
)
from app.modules.maintenance.domain import rules
from app.modules.maintenance.domain.entities import (
    Equipment,
    FailurePrediction,
    MaintenanceRecord,
    MaintenanceType,
)


class MaintenanceService:
    def __init__(
        self,
        equipment: EquipmentRepository,
        records: MaintenanceRecordRepository | None = None,
        predictions: FailurePredictionRepository | None = None,
    ) -> None:
        self.equipment = equipment
        self.records = records
        self.predictions = predictions

    def register_equipment(
        self, name: str, equipment_type: str, site_id: str = "",
    ) -> Equipment:
        eq = Equipment(id=str(uuid.uuid4()), name=name,
                       equipment_type=equipment_type, site_id=site_id,
                       created_at=datetime.now(UTC))
        return self.equipment.save(eq)

    def list_equipment(
        self, skip: int = 0, limit: int = 100, filters: dict | None = None
    ) -> tuple[list[Equipment], int]:
        return self.equipment.list_equipment(skip, limit, filters or {})

    def log_maintenance(
        self, equipment_id: str, maintenance_type: str,
        description: str = "", performed_by: str = "",
        downtime_hours: float = 0.0, cost: float = 0.0,
    ) -> MaintenanceRecord:
        if self.records is None:
            raise ValueError("Record repository not configured")
        self.equipment.get_by_id(equipment_id)
        rec = MaintenanceRecord(
            id=str(uuid.uuid4()), equipment_id=equipment_id,
            maintenance_type=MaintenanceType(maintenance_type),
            description=description, performed_by=performed_by,
            performed_at=datetime.now(UTC),
            downtime_hours=downtime_hours, cost=cost)
        return self.records.save(rec)

    def record_prediction(
        self, equipment_id: str, probability: float,
        horizon_days: int = 30,
    ) -> FailurePrediction:
        if self.predictions is None:
            raise ValueError("Prediction repository not configured")
        self.equipment.get_by_id(equipment_id)
        pred = FailurePrediction(
            id=str(uuid.uuid4()), equipment_id=equipment_id,
            failure_probability=probability,
            risk_level=rules.risk_from_probability(probability),
            horizon_days=horizon_days)
        return self.predictions.save(pred)

    def health_report(self, equipment_id: str) -> dict:
        eq = self.equipment.get_by_id(equipment_id)
        history = self.records.list_for_equipment(equipment_id) \
            if self.records else []
        latest = self.predictions.latest_for(equipment_id) \
            if self.predictions else None
        return {
            "equipment_id": eq.id, "status": eq.status.value,
            "operating_hours": eq.operating_hours,
            "needs_maintenance": rules.needs_maintenance(eq),
            "mtbf_hours": rules.mtbf_hours(history, eq.operating_hours),
            "latest_risk": latest.risk_level.value if latest else None,
            "critical": rules.is_critical(latest) if latest else False,
        }
