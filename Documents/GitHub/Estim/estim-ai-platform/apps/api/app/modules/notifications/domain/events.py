"""Domain events for the notifications module."""

from dataclasses import dataclass

from app.shared.events import DomainEvent


@dataclass(frozen=True, kw_only=True)
class NotificationSent(DomainEvent):
    event_type: str = "notifications.sent"
    notification_id: str = ""
    user_id: str = ""
    channel: str = ""


@dataclass(frozen=True, kw_only=True)
class NotificationFailed(DomainEvent):
    event_type: str = "notifications.failed"
    notification_id: str = ""
    user_id: str = ""
    error: str = ""
