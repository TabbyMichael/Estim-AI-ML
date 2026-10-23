"""Ports for the maintenance module."""

from __future__ import annotations

from typing import Protocol

from app.modules.maintenance.domain.entities import (
    Equipment,
    FailurePrediction,
    MaintenanceRecord,
)


class EquipmentRepository(Protocol):
    def get_by_id(self, equipment_id: str) -> Equipment: ...
    def save(self, equipment: Equipment) -> Equipment: ...
    def list_equipment(
        self, skip: int = 0, limit: int = 100, filters: dict | None = None
    ) -> tuple[list[Equipment], int]: ...


class MaintenanceRecordRepository(Protocol):
    def save(self, record: MaintenanceRecord) -> MaintenanceRecord: ...
    def list_for_equipment(
        self, equipment_id: str, limit: int = 100
    ) -> list[MaintenanceRecord]: ...


class FailurePredictionRepository(Protocol):
    def save(self, prediction: FailurePrediction) -> FailurePrediction: ...
    def latest_for(self, equipment_id: str) -> FailurePrediction | None: ...
