"""Application services for the audit module."""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from app.core.config import settings
from app.modules.audit.application.ports import AuditRepository
from app.modules.audit.domain import rules
from app.modules.audit.domain.entities import AuditLog


class AuditService:
    def __init__(self, repository: AuditRepository) -> None:
        self.repository = repository

    def record(
        self,
        actor: str,
        action: str,
        resource_type: str = "",
        resource_id: str = "",
        details: dict[str, Any] | None = None,
        ip_address: str = "",
        user_agent: str = "",
        correlation_id: str = "",
    ) -> AuditLog:
        log = AuditLog(
            id=str(uuid.uuid4()),
            actor=actor,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
            ip_address=ip_address,
            user_agent=user_agent,
            correlation_id=correlation_id,
            created_at=datetime.now(UTC),
        )
        return self.repository.save(log)

    def record_http(
        self,
        method: str,
        path: str,
        status_code: int,
        actor: str = "anonymous",
        ip_address: str = "",
        user_agent: str = "",
        correlation_id: str = "",
    ) -> AuditLog:
        """Record an HTTP mutation using rules.MUTATING_METHODS."""
        action = f"http_{method.lower()}"
        parts = [p for p in path.strip("/").split("/") if p]
        # Skip a leading "/api" prefix so the resource reflects the domain.
        if parts and parts[0] == "api":
            parts = parts[1:]
        resource_type = parts[0] if parts else "api"
        resource_id = parts[1] if len(parts) > 1 else ""
        return self.record(
            actor=actor,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details={"path": path, "status_code": status_code},
            ip_address=ip_address,
            user_agent=user_agent,
            correlation_id=correlation_id,
        )

    def list_logs(
        self, skip: int = 0, limit: int = 100, filters: dict | None = None
    ) -> tuple[list[AuditLog], int]:
        return self.repository.list_logs(skip, limit, filters or {})

    def purge_expired(self, retention_days: int | None = None) -> int:
        days = retention_days or settings.audit_log_retention_days
        cutoff = datetime.now(UTC) - timedelta(days=days)
        return self.repository.purge_before(cutoff)

    def summary(self, skip: int = 0, limit: int = 1000, filters: dict | None = None) -> dict:
        logs, total = self.repository.list_logs(skip, limit, filters or {})
        return rules.summarize(logs) | {"sampled": len(logs), "total_logged": total}
