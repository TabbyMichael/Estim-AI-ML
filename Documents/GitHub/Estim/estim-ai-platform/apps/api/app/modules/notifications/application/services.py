"""Application services for notifications: dispatch + event bridge.

NotificationService owns create/list/read + channel delivery.
EventNotificationBridge subscribes to the platform event bus and turns
domain events into user notifications using templates + preferences.
"""

import logging
import smtplib
import uuid
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
        created: list[Notification] = []
        for channel in channels:
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
            self.notifications.save(n)
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

