"""Ports for the audit module."""

from __future__ import annotations

from datetime import datetime
from typing import Protocol

from app.modules.audit.domain.entities import AuditLog


class AuditRepository(Protocol):
    def save(self, log: AuditLog) -> AuditLog: ...
    def list_logs(
        self, skip: int = 0, limit: int = 100, filters: dict | None = None
    ) -> tuple[list[AuditLog], int]: ...
    def purge_before(self, cutoff: datetime) -> int: ...
