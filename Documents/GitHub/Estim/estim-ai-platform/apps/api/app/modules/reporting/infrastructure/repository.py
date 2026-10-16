"""Mappers + repositories for reporting (schema: platform)."""

import json
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.reporting.domain.entities import (
    NotFoundError,
    Report,
    ReportFormat,
    ReportSchedule,
    ReportStatus,
)
from app.modules.reporting.infrastructure.models import (
    ReportModel,
    ReportScheduleModel,
)


def _tz(v: datetime | None) -> datetime | None:
    if v is None:
        return None
    return v if v.tzinfo else v.replace(tzinfo=UTC)


def report_to_model(r: Report) -> ReportModel:
    return ReportModel(
        id=uuid.UUID(r.id), report_type=r.report_type, title=r.title,
        status=r.status.value, format=r.format.value,
        payload_json=json.dumps(r.payload, default=str), content=r.content,
        generated_by=r.generated_by, created_at=r.created_at,
        completed_at=r.completed_at, error=r.error)


def model_to_report(m: ReportModel) -> Report:
    created = _tz(m.created_at)
    assert created is not None
    payload: dict[str, Any] = json.loads(m.payload_json or "{}")
    return Report(
        id=str(m.id), report_type=m.report_type, title=m.title,
        status=ReportStatus(m.status), format=ReportFormat(m.format),
        payload=payload, content=m.content, generated_by=m.generated_by,
        created_at=created, completed_at=_tz(m.completed_at), error=m.error)


def schedule_to_model(s: ReportSchedule) -> ReportScheduleModel:
    return ReportScheduleModel(
        id=uuid.UUID(s.id), report_type=s.report_type, interval=s.interval,
        enabled=s.enabled, created_by=s.created_by, created_at=s.created_at,
        last_run_at=s.last_run_at, next_run_at=s.next_run_at)


def model_to_schedule(m: ReportScheduleModel) -> ReportSchedule:
    created = _tz(m.created_at)
    assert created is not None
    return ReportSchedule(
        id=str(m.id), report_type=m.report_type, interval=m.interval,
        enabled=m.enabled, created_by=m.created_by, created_at=created,
        last_run_at=_tz(m.last_run_at), next_run_at=_tz(m.next_run_at))


class SqlAlchemyReportRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_id(self, report_id: str) -> Report:
        m = self.session.get(ReportModel, uuid.UUID(report_id))
        if m is None:
            raise NotFoundError(f"Report {report_id} not found.")
        return model_to_report(m)

    def save(self, report: Report) -> Report:
        merged = self.session.merge(report_to_model(report))
        self.session.flush()
        return model_to_report(merged)

    def list_reports(
        self, skip: int = 0, limit: int = 50, filters: dict | None = None
    ) -> tuple[list[Report], int]:
        stmt = select(ReportModel)
        count_stmt = select(func.count(ReportModel.id))
        for key in ("report_type", "status"):
            if filters and filters.get(key):
                col = getattr(ReportModel, key)
                stmt = stmt.where(col == filters[key])
                count_stmt = count_stmt.where(col == filters[key])
        stmt = stmt.order_by(ReportModel.created_at.desc())
        total = self.session.execute(count_stmt).scalar_one()
        rows = self.session.execute(stmt.offset(skip).limit(limit)).scalars()
        return [model_to_report(r) for r in rows], total


class SqlAlchemyScheduleRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def save(self, schedule: ReportSchedule) -> ReportSchedule:
        merged = self.session.merge(schedule_to_model(schedule))
        self.session.flush()
        return model_to_schedule(merged)

    def list_schedules(self) -> list[ReportSchedule]:
        rows = self.session.execute(select(ReportScheduleModel)).scalars()
        return [model_to_schedule(r) for r in rows]
