"""Repository for the audit module (schema: platform)."""

import json
import uuid
from datetime import UTC, datetime

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.modules.audit.domain.entities import AuditLog
from app.modules.audit.infrastructure.models import AuditLogModel


def _tz(v: datetime | None) -> datetime | None:
    if v is None:
        return None
    return v if v.tzinfo else v.replace(tzinfo=UTC)


def log_to_model(log: AuditLog) -> AuditLogModel:
    return AuditLogModel(
        id=uuid.UUID(log.id),
        actor=log.actor,
        action=log.action,
        resource_type=log.resource_type,
        resource_id=log.resource_id,
        details=json.dumps(log.details, default=str),
        ip_address=log.ip_address,
        user_agent=log.user_agent,
        correlation_id=log.correlation_id,
        created_at=log.created_at,
    )


def model_to_log(m: AuditLogModel) -> AuditLog:
    created = _tz(m.created_at)
    assert created is not None
    raw = m.details
    details: dict = json.loads(raw) if isinstance(raw, str) else (raw or {})
    return AuditLog(
        id=str(m.id),
        actor=m.actor,
        action=m.action,
        resource_type=m.resource_type,
        resource_id=m.resource_id,
        details=details,
        ip_address=m.ip_address,
        user_agent=m.user_agent,
        correlation_id=m.correlation_id,
        created_at=created,
    )


class SqlAlchemyAuditRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def save(self, log: AuditLog) -> AuditLog:
        merged = self.session.merge(log_to_model(log))
        self.session.flush()
        return model_to_log(merged)

    def list_logs(
        self, skip: int = 0, limit: int = 100, filters: dict | None = None
    ) -> tuple[list[AuditLog], int]:
        stmt = select(AuditLogModel)
        count_stmt = select(func.count(AuditLogModel.id))
        for key in ("actor", "action", "resource_type"):
            if filters and filters.get(key):
                col = getattr(AuditLogModel, key)
                stmt = stmt.where(col == filters[key])
                count_stmt = count_stmt.where(col == filters[key])
        stmt = stmt.order_by(AuditLogModel.created_at.desc())
        total = self.session.execute(count_stmt).scalar_one()
        rows = self.session.execute(stmt.offset(skip).limit(limit)).scalars()
        return [model_to_log(r) for r in rows], total

    def purge_before(self, cutoff: datetime) -> int:
        """Delete logs older than cutoff; returns rows deleted."""
        count = self.session.execute(
            select(func.count(AuditLogModel.id)).where(AuditLogModel.created_at < cutoff)
        ).scalar_one()
        self.session.execute(delete(AuditLogModel).where(AuditLogModel.created_at < cutoff))
        self.session.flush()
        return int(count)

    def count_all(self) -> int:
        return int(self.session.execute(select(func.count(AuditLogModel.id))).scalar_one())
