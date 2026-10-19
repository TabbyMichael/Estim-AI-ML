"""Domain events for the project risk module."""

from dataclasses import dataclass

from app.shared.events import DomainEvent


@dataclass(frozen=True, kw_only=True)
class MilestoneTracked(DomainEvent):
    event_type: str = "project_risk.milestone.tracked"
    milestone_id: str = ""
    project_id: str = ""


@dataclass(frozen=True, kw_only=True)
class DelayPredicted(DomainEvent):
    event_type: str = "project_risk.delay.predicted"
    project_id: str = ""
    milestone_id: str = ""
    risk_level: str = ""
