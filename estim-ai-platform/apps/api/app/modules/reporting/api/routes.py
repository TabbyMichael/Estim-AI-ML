# mypy: ignore-errors
"""Reporting API routes: /reports/*."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import BadRequestError
from app.core.exceptions import NotFoundError as CoreNotFound
from app.modules.reporting.api.schemas import (
    ReportCreateRequest,
    ReportListResponse,
    ReportResponse,
    ScheduleCreateRequest,
    ScheduleResponse,
)
from app.modules.reporting.application.services import (
    ReportService,
    ScheduleService,
    registry,
)
from app.modules.reporting.domain.entities import (
    NotFoundError,
    ReportFormat,
    UnknownReportTypeError,
)
from app.modules.reporting.infrastructure.repository import (
    SqlAlchemyReportRepository,
    SqlAlchemyScheduleRepository,
)

router = APIRouter(prefix="/reports", tags=["reports"])


# Built-in self-describing provider; modules register their own at startup.
def _platform_overview(filters: dict) -> dict:
    return {"registered_report_types": registry.types(), "filters_applied": filters}


registry.register("platform_overview", _platform_overview)


def _report_service(db: Session = Depends(get_db)) -> ReportService:
    return ReportService(reports=SqlAlchemyReportRepository(db))


def _schedule_service(db: Session = Depends(get_db)) -> ScheduleService:
    return ScheduleService(schedules=SqlAlchemyScheduleRepository(db), reports=_report_service(db))


@router.post("/generate", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def generate_report(
    body: ReportCreateRequest,
    svc: ReportService = Depends(_report_service),
    db: Session = Depends(get_db),
) -> ReportResponse:
    try:
        report = svc.generate(
            body.report_type,
            filters=body.filters,
            fmt=ReportFormat(body.format.value),
            generated_by=body.generated_by,
        )
    except UnknownReportTypeError as exc:
        raise BadRequestError(str(exc)) from exc
    db.commit()
    return ReportResponse.from_entity(report)


@router.get("", response_model=ReportListResponse)
def list_reports(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    report_type: str | None = Query(None),
    svc: ReportService = Depends(_report_service),
) -> ReportListResponse:
    filters = {"report_type": report_type} if report_type else {}
    reports, total = svc.list_reports(skip, limit, filters)
    return ReportListResponse(
        reports=[ReportResponse.from_entity(r) for r in reports],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/schedules/list", response_model=list[ScheduleResponse])
def list_schedules(
    svc: ScheduleService = Depends(_schedule_service),
) -> list[ScheduleResponse]:
    return [ScheduleResponse.from_entity(s) for s in svc.list_schedules()]


@router.get("/{report_id}", response_model=ReportResponse)
def get_report(
    report_id: str,
    svc: ReportService = Depends(_report_service),
) -> ReportResponse:
    try:
        return ReportResponse.from_entity(svc.get_report(report_id))
    except NotFoundError as exc:
        raise CoreNotFound(str(exc)) from exc


@router.post("/schedules", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_schedule(
    body: ScheduleCreateRequest,
    svc: ScheduleService = Depends(_schedule_service),
    db: Session = Depends(get_db),
) -> ScheduleResponse:
    schedule = svc.create_schedule(body.report_type, body.interval, body.created_by)
    db.commit()
    return ScheduleResponse.from_entity(schedule)


@router.post("/schedules/tick", response_model=ReportListResponse)
def tick(
    svc: ScheduleService = Depends(_schedule_service),
    db: Session = Depends(get_db),
) -> ReportListResponse:
    """Run all due schedules now (normally invoked by Celery beat)."""
    try:
        generated = svc.tick()
    except UnknownReportTypeError as exc:
        raise BadRequestError(str(exc)) from exc
    db.commit()
    return ReportListResponse(
        reports=[ReportResponse.from_entity(r) for r in generated],
        total=len(generated),
        skip=0,
        limit=len(generated) or 1,
    )
