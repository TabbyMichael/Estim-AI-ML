"""Domain events for the maintenance module."""

from dataclasses import dataclass

from app.shared.events import DomainEvent


@dataclass(frozen=True, kw_only=True)
class EquipmentRegistered(DomainEvent):
    event_type: str = "maintenance.equipment.registered"
    equipment_id: str = ""


@dataclass(frozen=True, kw_only=True)
class FailurePredicted(DomainEvent):
    event_type: str = "maintenance.failure.predicted"
    equipment_id: str = ""
    prediction_id: str = ""
    risk_level: str = ""
