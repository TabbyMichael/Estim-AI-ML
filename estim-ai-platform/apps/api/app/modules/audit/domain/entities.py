"""Domain entities for the audit module."""

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any


@dataclass
class AuditLog:
    id: str
    actor: str
    action: str  # e.g. create/update/delete/login/export
    resource_type: str = ""  # e.g. purchase_order
    resource_id: str = ""
    details: dict[str, Any] = field(default_factory=dict)
    ip_address: str = ""
    user_agent: str = ""
    correlation_id: str = ""
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    def __post_init__(self) -> None:
        if not self.id or not self.actor or not self.action:
            raise ValueError("AuditLog id/actor/action required")


class NotFoundError(Exception):
    pass
