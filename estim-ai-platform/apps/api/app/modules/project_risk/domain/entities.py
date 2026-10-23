"""Domain entities for the project risk module."""

from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import Enum


class MilestoneStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DELAYED = "delayed"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class Milestone:
    id: str
    project_id: str
    name: str
    planned_start: datetime
    planned_end: datetime
    status: MilestoneStatus = MilestoneStatus.NOT_STARTED
    actual_start: datetime | None = None
    actual_end: datetime | None = None
    progress_pct: float = 0.0

    def __post_init__(self) -> None:
        if not self.id or not self.project_id or not self.name:
            raise ValueError("Milestone id/project/name required")
        if self.planned_end < self.planned_start:
            raise ValueError("Planned end must be >= start")

    def delay_days(self, as_of: datetime | None = None) -> float:
        ref = self.actual_end or as_of or datetime.now(UTC)
        if self.status == MilestoneStatus.COMPLETED and self.actual_end:
            ref = self.actual_end
        delta = ref - self.planned_end
        return max(0.0, delta.total_seconds() / 86400)


@dataclass
class RiskPrediction:
    id: str
    project_id: str
    milestone_id: str
    delay_probability: float
    predicted_delay_days: float
    risk_level: RiskLevel
    model_version: str = "v1"
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    notes: str | None = None

    def __post_init__(self) -> None:
        if not 0.0 <= self.delay_probability <= 1.0:
            raise ValueError("Probability must be 0..1")
        if self.predicted_delay_days < 0:
            raise ValueError("Delay days cannot be negative")


class NotFoundError(Exception):
    pass


class InvalidStateError(Exception):
    pass
