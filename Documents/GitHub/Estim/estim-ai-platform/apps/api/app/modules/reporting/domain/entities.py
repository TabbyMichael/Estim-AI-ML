"""Domain entities for the reporting module."""

from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import Enum
from typing import Any


class ReportFormat(str, Enum):  # noqa: UP042 - str-enum for JSON compat
    JSON = "json"
    MARKDOWN = "markdown"
    CSV = "csv"


class ReportStatus(str, Enum):  # noqa: UP042 - str-enum for JSON compat
    PENDING = "pending"
    GENERATED = "generated"
    FAILED = "failed"


@dataclass
class Report:
    id: str
    report_type: str
    title: str
    status: ReportStatus = ReportStatus.PENDING
    format: ReportFormat = ReportFormat.JSON
    payload: dict[str, Any] = field(default_factory=dict)
    content: str = ""
    generated_by: str = "system"
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    completed_at: datetime | None = None
    error: str | None = None

    def __post_init__(self) -> None:
        if not self.id or not self.report_type:
            raise ValueError("Report id/type required")

    def complete(self, payload: dict[str, Any], content: str) -> None:
        self.payload = payload
        self.content = content
        self.status = ReportStatus.GENERATED
        self.completed_at = datetime.now(UTC)

    def fail(self, error: str) -> None:
        self.status = ReportStatus.FAILED
        self.error = error


@dataclass
class ReportSchedule:
    id: str
    report_type: str
    interval: str = "daily"  # daily | weekly
    enabled: bool = True
    created_by: str = "system"
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    last_run_at: datetime | None = None
    next_run_at: datetime | None = None

    def __post_init__(self) -> None:
        if self.interval not in ("daily", "weekly"):
            raise ValueError("interval must be daily or weekly")


class NotFoundError(Exception):
    pass


class UnknownReportTypeError(ValueError):
    pass
