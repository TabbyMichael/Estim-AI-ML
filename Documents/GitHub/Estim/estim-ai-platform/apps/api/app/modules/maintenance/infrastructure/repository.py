"""SQLAlchemy repositories for the maintenance module."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.maintenance.domain.entities import (
    Equipment,
    FailurePrediction,
    MaintenanceRecord,
    NotFoundError,
)
from app.modules.maintenance.infrastructure import mappers
from app.modules.maintenance.infrastructure.models import (
    EquipmentModel,
    FailurePredictionModel,
    MaintenanceRecordModel,
)


class SqlAlchemyEquipmentRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_id(self, equipment_id: str) -> Equipment:
        m = self.session.get(EquipmentModel, uuid.UUID(equipment_id))
        if m is None:
            raise NotFoundError(f"Equipment {equipment_id} not found.")
        return mappers.model_to_equipment(m)

    def save(self, equipment: Equipment) -> Equipment:
        merged = self.session.merge(mappers.equipment_to_model(equipment))
        self.session.flush()
        return mappers.model_to_equipment(merged)

    def list_equipment(
        self, skip: int = 0, limit: int = 100, filters: dict | None = None
    ) -> tuple[list[Equipment], int]:
        stmt = select(EquipmentModel)
        count_stmt = select(func.count(EquipmentModel.id))
        for key in ("site_id", "status", "equipment_type"):
            if filters and filters.get(key):
                col = getattr(EquipmentModel, key)
                stmt = stmt.where(col == filters[key])
                count_stmt = count_stmt.where(col == filters[key])
        total = self.session.execute(count_stmt).scalar_one()
        rows = self.session.execute(stmt.offset(skip).limit(limit)).scalars().all()
        return [mappers.model_to_equipment(r) for r in rows], total


class SqlAlchemyMaintenanceRecordRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def save(self, record: MaintenanceRecord) -> MaintenanceRecord:
        merged = self.session.merge(mappers.record_to_model(record))
        self.session.flush()
        return mappers.model_to_record(merged)

    def list_for_equipment(self, equipment_id: str, limit: int = 100) -> list[MaintenanceRecord]:
        stmt = (
            select(MaintenanceRecordModel)
            .where(MaintenanceRecordModel.equipment_id == equipment_id)
            .order_by(MaintenanceRecordModel.performed_at.desc())
            .limit(limit)
        )
        rows = self.session.execute(stmt).scalars().all()
        return [mappers.model_to_record(r) for r in rows]


class SqlAlchemyFailurePredictionRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def save(self, prediction: FailurePrediction) -> FailurePrediction:
        merged = self.session.merge(mappers.prediction_to_model(prediction))
        self.session.flush()
        return mappers.model_to_prediction(merged)

    def latest_for(self, equipment_id: str) -> FailurePrediction | None:
        stmt = (
            select(FailurePredictionModel)
            .where(FailurePredictionModel.equipment_id == equipment_id)
            .order_by(FailurePredictionModel.created_at.desc())
            .limit(1)
        )
        row = self.session.execute(stmt).scalar_one_or_none()
        return mappers.model_to_prediction(row) if row else None
