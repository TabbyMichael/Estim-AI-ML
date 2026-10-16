"""Application services for reporting.

ProviderRegistry keeps module->report-provider wiring OUT of reporting's
schema (ADR-002: no cross-schema reads). Each module registers a callable
`(filters: dict) -> dict` at startup; ReportService renders via templates.
ScheduleService materializes due schedules via tick().
"""

import uuid
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

from app.modules.reporting.application.ports import (
    ReportRepository,
    ScheduleRepository,
)
from app.modules.reporting.domain import rules
from app.modules.reporting.domain.entities import (
    Report,
    ReportFormat,
    ReportSchedule,
    ReportStatus,
    UnknownReportTypeError,
)

Provider = Callable[[dict[str, Any]], dict[str, Any]]


class ProviderRegistry:
    def __init__(self) -> None:
        self._providers: dict[str, Provider] = {}

    def register(self, report_type: str, provider: Provider) -> None:
        self._providers[report_type] = provider

    def get(self, report_type: str) -> Provider:
        provider = self._providers.get(report_type)
        if provider is None:
            raise UnknownReportTypeError(
                f"No provider registered for '{report_type}'. "
                f"Known: {sorted(self._providers)}")
        return provider

    def types(self) -> list[str]:
        return sorted(self._providers)


registry = ProviderRegistry()


class ReportService:
    def __init__(self, reports: ReportRepository,
                 providers: ProviderRegistry | None = None) -> None:
        self.reports = reports
        self.providers = providers or registry

    def generate(
        self, report_type: str, filters: dict[str, Any] | None = None,
        fmt: ReportFormat = ReportFormat.MARKDOWN, generated_by: str = "system",
    ) -> Report:
        report = Report(
            id=str(uuid.uuid4()), report_type=report_type,
            title=rules.title_for(report_type), status=ReportStatus.PENDING,
            format=fmt, generated_by=generated_by)
        report = self.reports.save(report)
        try:
            payload = self.providers.get(report_type)(filters or {})
            content = rules.render(payload, fmt, title=report.title)
            report.complete(payload, content)
        except UnknownReportTypeError as exc:
            report.fail(str(exc))
            self.reports.save(report)
            raise
        except Exception as exc:  # noqa: BLE001 - provider isolation
            report.fail(str(exc))
        return self.reports.save(report)

    def get_report(self, report_id: str) -> Report:
        return self.reports.get_by_id(report_id)

    def list_reports(
        self, skip: int = 0, limit: int = 50, filters: dict | None = None
    ) -> tuple[list[Report], int]:
        return self.reports.list_reports(skip, limit, filters or {})


class ScheduleService:
    def __init__(self, schedules: ScheduleRepository,
                 reports: ReportService | None = None) -> None:
        self.schedules = schedules
        self.reports = reports

    def create_schedule(
        self, report_type: str, interval: str = "daily",
        created_by: str = "system",
    ) -> ReportSchedule:
        schedule = ReportSchedule(
            id=str(uuid.uuid4()), report_type=report_type,
            interval=interval, created_by=created_by,
            next_run_at=rules.next_run(interval))
        return self.schedules.save(schedule)

    def list_schedules(self) -> list[ReportSchedule]:
        return self.schedules.list_schedules()

    def tick(self, now: datetime | None = None) -> list[Report]:
        """Generate reports for every due, enabled schedule."""
        generated: list[Report] = []
        if self.reports is None:
            return generated
        ref = now or datetime.now(UTC)
        for schedule in self.schedules.list_schedules():
            if not schedule.enabled or not rules.is_due(
                schedule.last_run_at, schedule.interval, ref):
                continue
            report = self.reports.generate(
                schedule.report_type, generated_by="scheduler")
            schedule.last_run_at = ref
            schedule.next_run_at = rules.next_run(schedule.interval, ref)
            self.schedules.save(schedule)
            generated.append(report)
        return generated
