"""Ports for the reporting module."""

from __future__ import annotations

from typing import Protocol

from app.modules.reporting.domain.entities import Report, ReportSchedule


class ReportRepository(Protocol):
    def get_by_id(self, report_id: str) -> Report: ...
    def save(self, report: Report) -> Report: ...
    def list_reports(
        self, skip: int = 0, limit: int = 50, filters: dict | None = None
    ) -> tuple[list[Report], int]: ...


class ScheduleRepository(Protocol):
    def save(self, schedule: ReportSchedule) -> ReportSchedule: ...
    def list_schedules(self) -> list[ReportSchedule]: ...
