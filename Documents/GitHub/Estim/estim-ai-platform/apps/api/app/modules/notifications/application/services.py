"""Application services for notifications: dispatch + event bridge.

NotificationService owns create/list/read + channel delivery.
EventNotificationBridge subscribes to the platform event bus and turns
domain events into user notifications using templates + preferences.
"""

import logging
import smtplib
import uuid
from collections import deque
from datetime import UTC, datetime
from email.message import EmailMessage

from app.core.config import settings
from app.modules.notifications.application.ports import (
    NotificationRepository,
    PreferenceRepository,
)
from app.modules.notifications.domain import rules
from app.modules.notifications.domain.entities import (
    Channel,
    Notification,
)

logger = logging.getLogger("estim.notifications")


class NotificationQueue:
    """In-memory delivery queue (Roadmap 1.3): pending -> dispatched.

    Persisted rows live in the notifications table; this queue stages
    outbound delivery attempts with retry metadata for the worker.
    """

    def __init__(self, maxsize: int = 1000) -> None:
        self._queue: deque[dict] = deque(maxlen=maxsize)

    def enqueue(self, notification_id: str, channel: str, attempts: int = 0) -> dict:
        entry = {
            "notification_id": notification_id,
            "channel": channel,
            "attempts": attempts,
            "enqueued_at": datetime.now(UTC).isoformat(),
        }
        self._queue.append(entry)
        return entry

    def dequeue(self) -> dict | None:
        return self._queue.popleft() if self._queue else None

    def pending(self) -> list[dict]:
        return list(self._queue)

    def __len__(self) -> int:
        return len(self._queue)


notification_queue = NotificationQueue()


class NotificationTrigger:
    """Declarative trigger registry (Roadmap 1.3): event -> recipients + channels."""

    _triggers: dict[str, dict] = {}

    @classmethod
    def register(
        cls, event_type: str, channels: tuple[str, ...] = ("in_app", "email"),
        description: str = "",
    ) -> None:
        cls._triggers[event_type] = {"channels": channels, "description": description}

    @classmethod
    def triggers(cls) -> dict[str, dict]:
        return dict(cls._triggers)

    @classmethod
    def channels_for(cls, event_type: str) -> tuple[str, ...]:
        cfg = cls._triggers.get(event_type)
        if cfg:
            return tuple(cfg["channels"])
        return ("in_app", "email")


for _et in (
    "procurement.anomaly.detected",
    "cost_forecasting.forecast.updated",
    "inventory.low_stock",
    "maintenance.equipment.alert",
    "project_risk.level.changed",
    "visual_inspection.completed",
    "document_intelligence.processed",
    "reporting.generated",
    "system.announcement",
):
    NotificationTrigger.register(_et)


class EmailChannel:
    """SMTP sender; when SMTP is unconfigured it logs instead (dev mode)."""

    def send(self, to: str, subject: str, body: str) -> None:
        if not settings.smtp_host:
            logger.info("email(dev) to=%s subject=%s", to, subject)
            return
        msg = EmailMessage()
        msg["From"] = settings.smtp_from
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(body)
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as client:
            if settings.smtp_tls:
                client.starttls()
            if settings.smtp_user:
                client.login(settings.smtp_user, settings.smtp_password)
            client.send_message(msg)


class NotificationService:
    def __init__(
        self,
        notifications: NotificationRepository,
        preferences: PreferenceRepository | None = None,
        email: EmailChannel | None = None,
    ) -> None:
        self.notifications = notifications
        self.preferences = preferences
        self.email = email or EmailChannel()

    def list_for_user(
        self, user_id: str, skip: int = 0, limit: int = 50,
        status: str | None = None,
    ) -> tuple[list[Notification], int]:
        return self.notifications.list_for_user(user_id, skip, limit, status)

    def mark_read(self, notification_id: str) -> Notification:
        n = self.notifications.get_by_id(notification_id)
        n.mark_read()
        return self.notifications.save(n)

    def mark_all_read(self, user_id: str) -> int:
        """Mark all sent notifications read; returns count marked."""
        items, _ = self.notifications.list_for_user(user_id, 0, 1000, status="sent")
        count = 0
        for n in items:
            n.mark_read()
            self.notifications.save(n)
            count += 1
        return count

    def delete(self, notification_id: str) -> None:
        n = self.notifications.get_by_id(notification_id)
        self.notifications.delete(n.id)

    def stats_for_user(self, user_id: str) -> dict:
        items, total = self.notifications.list_for_user(user_id, 0, 1000)
        unread = sum(1 for n in items if n.status.value == "sent")
        read = sum(1 for n in items if n.status.value == "read")
        failed = sum(1 for n in items if n.status.value == "failed")
        return {"total": total, "unread": unread, "read": read, "failed": failed}

    def notify(
        self, user_id: str, event_type: str, context: dict,
        channels: tuple[Channel, ...] = (Channel.IN_APP, Channel.EMAIL),
        event_id: str = "",
    ) -> list[Notification]:
        """Render + dispatch a notification on the allowed channels."""
        prefs = (self.preferences.list_for_user(user_id)
                 if self.preferences else [])
        key = rules.template_for_event(event_type)
        subject, body = rules.render(key, context)
        # Trigger registry can narrow channels per event type (Roadmap 1.3)
        allowed_triggers = NotificationTrigger.channels_for(event_type)
        created: list[Notification] = []
        for channel in channels:
            if channel.value not in allowed_triggers:
                continue
            if not rules.allows(prefs, user_id, channel, event_type):
                continue
            n = Notification(
                id=str(uuid.uuid4()), user_id=user_id, channel=channel,
                subject=subject, body=body, template_key=key,
                event_type=event_type, event_id=event_id)
            if channel == Channel.EMAIL:
                try:
                    self.email.send(user_id, subject, body)
                    n.mark_sent()
                except Exception as exc:  # noqa: BLE001 - delivery isolation
                    n.mark_failed(str(exc))
            else:
                n.mark_sent()
            self.notifications.save(n)
            notification_queue.enqueue(n.id, channel.value)
            # Live push to the user's open WebSocket tabs (Roadmap 1.2/1.3)
            if channel == Channel.IN_APP:
                try:
                    from app.core import realtime

                    realtime.publish(user_id, {
                        "type": "event",
                        "event": "notification.created",
                        "data": {
                            "id": n.id, "subject": n.subject, "body": n.body,
                            "event_type": n.event_type, "created_at":
                            n.created_at.isoformat(),
                        },
                    })
                except Exception:  # noqa: BLE001 - push must never break dispatch
                    pass
            created.append(n)
        return created


class EventNotificationBridge:
    """Consumes DomainEvent payloads -> notifications for target users.

    `user_resolver(event_type, payload)` maps an event to recipient IDs
    (e.g. project managers). Unmapped events fall back to `default_users`.
    """

    def __init__(
        self, service: NotificationService,
        user_resolver=None,  # type: ignore[no-untyped-def]
        default_users: tuple[str, ...] = (),
    ) -> None:
        self.service = service
        self.user_resolver = user_resolver
        self.default_users = default_users

    def handle(self, payload: dict) -> None:
        event_type = str(payload.get("event_type", ""))
        users = (self.user_resolver(event_type, payload)
                 if self.user_resolver else None)
        if not users:
            users = list(self.default_users)
        for user_id in users:
            self.service.notify(
                user_id=user_id, event_type=event_type,
                context=dict(payload),
                event_id=str(payload.get("event_id", "")))

    def subscribe(self, bus, event_types: list[str]) -> None:  # type: ignore[no-untyped-def]
        for et in event_types:
            bus.subscribe(et, self)  # type: ignore[arg-type]


def bridge_for(bus, service: NotificationService) -> EventNotificationBridge:  # type: ignore[no-untyped-def]
    """Wire the bridge onto an event bus for all known event types."""
    bridge = EventNotificationBridge(service)
    bridge.subscribe(bus, list(rules.EVENT_TEMPLATES))
    return bridge

