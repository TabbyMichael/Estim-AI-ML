"""Domain events for visual inspection."""

from dataclasses import dataclass

from app.shared.events import DomainEvent


@dataclass(frozen=True, kw_only=True)
class InspectionCreated(DomainEvent):
    event_type: str = "visual_inspection.created"
    inspection_id: str = ""
    project_id: str = ""


@dataclass(frozen=True, kw_only=True)
class DefectDetected(DomainEvent):
    event_type: str = "visual_inspection.defect.detected"
    inspection_id: str = ""
    image_id: str = ""
    severity: str = ""
