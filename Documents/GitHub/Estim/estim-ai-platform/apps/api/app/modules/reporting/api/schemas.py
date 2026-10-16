"""Pydantic schemas for the reporting API."""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field

from app.modules.reporting.domain.entities import Report, ReportSchedule


class ReportFormatEnum(str, Enum):  # noqa: UP042 - str-enum for JSON compat
    JSON = "json"
    MARKDOWN = "markdown"
    CSV = "csv"


class ReportCreateRequest(BaseModel):
    report_type: str = Field(..., min_length=1)
    format: ReportFormatEnum = Field(ReportFormatEnum.MARKDOWN)
    filters: dict[str, Any] = Field(default_factory=dict)
    generated_by: str = Field("api")


class ReportResponse(BaseModel):
    id: str
    report_type: str
    title: str
    status: str
    format: str
    content: str
    generated_by: str
    created_at: datetime
    error: str | None = None

    @classmethod
    def from_entity(cls, r: Report) -> "ReportResponse":
        return cls(id=r.id, report_type=r.report_type, title=r.title,
                   status=r.status.value, format=r.format.value,
                   content=r.content, generated_by=r.generated_by,
                   created_at=r.created_at, error=r.error)


class ReportListResponse(BaseModel):
    reports: list[ReportResponse]
    total: int
    skip: int
    limit: int


class ScheduleCreateRequest(BaseModel):
    report_type: str = Field(..., min_length=1)
    interval: str = Field("daily", pattern="^(daily|weekly)$")
    created_by: str = Field("api")


class ScheduleResponse(BaseModel):
    id: str
    report_type: str
    interval: str
    enabled: bool
    created_by: str
    created_at: datetime
    next_run_at: datetime | None = None

    @classmethod
    def from_entity(cls, s: ReportSchedule) -> "ScheduleResponse":
        return cls(id=s.id, report_type=s.report_type, interval=s.interval,
                   enabled=s.enabled, created_by=s.created_by,
                   created_at=s.created_at, next_run_at=s.next_run_at)
