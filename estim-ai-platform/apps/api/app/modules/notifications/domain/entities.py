"""Domain entities for the notifications module."""

from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import Enum


class Channel(str, Enum):
    EMAIL = "email"
    IN_APP = "in_app"


class NotificationStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    READ = "read"
    FAILED = "failed"


@dataclass
class Notification:
    id: str
    user_id: str
    channel: Channel
    subject: str
    body: str
    status: NotificationStatus = NotificationStatus.PENDING
    template_key: str = ""
    event_type: str = ""
    event_id: str = ""
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    sent_at: datetime | None = None
    read_at: datetime | None = None
    error: str | None = None

    def __post_init__(self) -> None:
        if not self.id or not self.user_id:
            raise ValueError("Notification id/user required")
        if not self.subject:
            raise ValueError("Notification subject required")

    def mark_sent(self) -> None:
        self.status = NotificationStatus.SENT
        self.sent_at = datetime.now(UTC)

    def mark_failed(self, error: str) -> None:
        self.status = NotificationStatus.FAILED
        self.error = error

    def mark_read(self) -> None:
        if self.status == NotificationStatus.SENT:
            self.status = NotificationStatus.READ
            self.read_at = datetime.now(UTC)


@dataclass
class NotificationPreference:
    user_id: str
    channel: Channel
    event_type: str = "*"
    enabled: bool = True

    def __post_init__(self) -> None:
        if not self.user_id:
            raise ValueError("Preference user required")


class NotFoundError(Exception):
    pass


class InvalidStateError(Exception):
    pass
