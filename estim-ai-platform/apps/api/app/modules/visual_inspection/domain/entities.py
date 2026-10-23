"""Domain entities for visual inspection."""

from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import Enum


class InspectionStatus(str, Enum):
    PENDING = "pending"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class DefectSeverity(str, Enum):
    NONE = "none"
    MINOR = "minor"
    MAJOR = "major"
    CRITICAL = "critical"


@dataclass
class ImageAsset:
    id: str
    inspection_id: str
    storage_key: str
    filename: str = ""
    content_type: str = "image/jpeg"
    size_bytes: int = 0
    uploaded_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    def __post_init__(self) -> None:
        if not self.id or not self.inspection_id or not self.storage_key:
            raise ValueError("Image id/inspection/storage key required")


@dataclass
class Inspection:
    id: str
    project_id: str
    site_id: str = ""
    title: str = ""
    status: InspectionStatus = InspectionStatus.PENDING
    created_by: str = ""
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None

    def __post_init__(self) -> None:
        if not self.id or not self.project_id:
            raise ValueError("Inspection id/project required")

    def submit_review(self) -> None:
        if self.status != InspectionStatus.PENDING:
            raise InvalidStateError(f"Cannot review in {self.status.value}")
        self.status = InspectionStatus.IN_REVIEW

    def approve(self, reviewer: str) -> None:
        if self.status != InspectionStatus.IN_REVIEW:
            raise InvalidStateError(f"Cannot approve in {self.status.value}")
        self.status = InspectionStatus.APPROVED
        self.reviewed_by = reviewer
        self.reviewed_at = datetime.now(UTC)


@dataclass
class DefectDetection:
    id: str
    image_id: str
    inspection_id: str
    defect_type: str
    confidence: float
    severity: DefectSeverity
    bbox: dict | None = None
    model_version: str = "v1"
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    def __post_init__(self) -> None:
        if not 0.0 <= self.confidence <= 1.0:
            raise ValueError("Confidence must be 0..1")


class InvalidStateError(Exception):
    pass


class NotFoundError(Exception):
    pass
