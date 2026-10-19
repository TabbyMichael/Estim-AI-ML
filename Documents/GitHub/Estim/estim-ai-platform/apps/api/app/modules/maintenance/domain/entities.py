"""Domain entities for the maintenance module."""

from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import Enum


class EquipmentStatus(str, Enum):
    OPERATIONAL = "operational"
    DEGRADED = "degraded"
    DOWN = "down"
    UNDER_MAINTENANCE = "under_maintenance"


class MaintenanceType(str, Enum):
    PREVENTIVE = "preventive"
    CORRECTIVE = "corrective"
    PREDICTIVE = "predictive"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class Equipment:
    id: str
    name: str
    equipment_type: str
    site_id: str = ""
    status: EquipmentStatus = EquipmentStatus.OPERATIONAL
    install_date: datetime | None = None
    operating_hours: float = 0.0
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    def __post_init__(self) -> None:
        if not self.id or not self.name:
            raise ValueError("Equipment id/name required")

    def mark_down(self) -> None:
        self.status = EquipmentStatus.DOWN

    def mark_operational(self) -> None:
        self.status = EquipmentStatus.OPERATIONAL


@dataclass
class MaintenanceRecord:
    id: str
    equipment_id: str
    maintenance_type: MaintenanceType
    description: str = ""
    performed_by: str = ""
    performed_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    downtime_hours: float = 0.0
    cost: float = 0.0

    def __post_init__(self) -> None:
        if not self.id or not self.equipment_id:
            raise ValueError("Record id/equipment required")


@dataclass
class FailurePrediction:
    id: str
    equipment_id: str
    failure_probability: float
    risk_level: RiskLevel
    horizon_days: int = 30
    model_version: str = "v1"
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    notes: str | None = None

    def __post_init__(self) -> None:
        if not 0.0 <= self.failure_probability <= 1.0:
            raise ValueError("Probability must be 0..1")


class InvalidStateError(Exception):
    pass


class NotFoundError(Exception):
    pass
