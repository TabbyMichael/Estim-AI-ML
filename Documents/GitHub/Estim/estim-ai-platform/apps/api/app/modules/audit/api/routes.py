# mypy: ignore-errors
"""Audit API routes: /audit/*."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.audit.api.schemas import (
    AuditLogListResponse,
    AuditLogResponse,
    AuditPurgeResponse,
    AuditRecordRequest,
    AuditSummaryResponse,
)
from app.modules.audit.application.services import AuditService
from app.modules.audit.infrastructure.repository import SqlAlchemyAuditRepository

router = APIRouter(prefix="/audit", tags=["audit"])


def _audit_service(db: Session = Depends(get_db)) -> AuditService:
    return AuditService(repository=SqlAlchemyAuditRepository(db))


@router.post("/record", response_model=AuditLogResponse,
             status_code=status.HTTP_201_CREATED)
def record(
    body: AuditRecordRequest,
    svc: AuditService = Depends(_audit_service),
    db: Session = Depends(get_db),
) -> AuditLogResponse:
    log = svc.record(
        actor=body.actor, action=body.action,
        resource_type=body.resource_type or "",
        resource_id=body.resource_id or "",
        details=body.details,
    )
    db.commit()
    return AuditLogResponse.from_entity(log)


@router.get("/logs", response_model=AuditLogListResponse)
def list_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    actor: str | None = Query(None),
    action: str | None = Query(None),
    resource_type: str | None = Query(None),
    svc: AuditService = Depends(_audit_service),
) -> AuditLogListResponse:
    filters: dict[str, str] = {}
    if actor:
        filters["actor"] = actor
    if action:
        filters["action"] = action
    if resource_type:
        filters["resource_type"] = resource_type
    logs, total = svc.list_logs(skip, limit, filters or None)
    return AuditLogListResponse(
        logs=[AuditLogResponse.from_entity(log) for log in logs],
        total=total, skip=skip, limit=limit,
    )


@router.get("/summary", response_model=AuditSummaryResponse)
def summary(
    svc: AuditService = Depends(_audit_service),
) -> AuditSummaryResponse:
    data = svc.summary()
    return AuditSummaryResponse(
        total=data.get("total", 0),
        sampled=data.get("sampled", 0),
        total_logged=data.get("total_logged", 0),
        by_action=data.get("by_action", {}),
        by_resource=data.get("by_resource", {}),
    )


@router.post("/purge", response_model=AuditPurgeResponse)
def purge(
    retention_days: int | None = Query(None),
    svc: AuditService = Depends(_audit_service),
    db: Session = Depends(get_db),
) -> AuditPurgeResponse:
    purged = svc.purge_expired(retention_days)
    db.commit()
    return AuditPurgeResponse(purged=purged)
