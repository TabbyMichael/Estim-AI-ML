"""Pydantic schemas for the audit API."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.modules.audit.domain.entities import AuditLog


class AuditLogResponse(BaseModel):
    id: str
    actor: str
    action: str
    resource_type: str
    resource_id: str
    details: dict[str, Any]
    ip_address: str
    correlation_id: str
    created_at: datetime

    @classmethod
    def from_entity(cls, log: AuditLog) -> "AuditLogResponse":
        return cls(id=log.id, actor=log.actor, action=log.action,
                   resource_type=log.resource_type, resource_id=log.resource_id,
                   details=log.details, ip_address=log.ip_address,
                   correlation_id=log.correlation_id, created_at=log.created_at)


class AuditLogListResponse(BaseModel):
    logs: list[AuditLogResponse]
    total: int
    skip: int
    limit: int


class AuditPurgeResponse(BaseModel):
    purged: int


class AuditSummaryResponse(BaseModel):
    total: int
    sampled: int
    total_logged: int
    by_action: dict[str, int]
    by_resource: dict[str, int]


class AuditRecordRequest(BaseModel):
    actor: str
    action: str
    resource_type: str | None = None
    resource_id: str | None = None
    details: dict[str, Any] = {}
