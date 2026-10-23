"""Shared cross-module contracts (Phase 2.2).

Protocols that any module can depend on without importing another
module's models. Concrete impls live in owning modules and are
wired via bootstrap.py (ADR-003).
"""

from typing import Any, Protocol


class AuditLogger(Protocol):
    def log_action(
        self,
        user_id: str,
        action: str,
        entity_type: str,
        entity_id: str,
        details: dict[str, Any] | None = None,
    ) -> None: ...


class Notifier(Protocol):
    def send_alert(self, recipient: str, message: str, priority: str = "medium") -> None: ...

    def send_email(self, to: list[str], subject: str, body: str) -> None: ...


class PaginatedResult(dict[str, Any]):
    """Convention: {'items': [...], 'total': int, 'skip': int, 'limit': int}."""
