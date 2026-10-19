"""Mappers + repositories for notifications (schema: platform)."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.notifications.domain.entities import (
    Channel,
    Notification,
    NotificationPreference,
    NotificationStatus,
    NotFoundError,
)
from app.modules.notifications.infrastructure.models import (
    NotificationModel,
    NotificationPreferenceModel,
)


def _tz(v: datetime | None) -> datetime | None:
    if v is None:
        return None
    return v if v.tzinfo else v.replace(tzinfo=UTC)


def notification_to_model(n: Notification) -> NotificationModel:
    return NotificationModel(
        id=uuid.UUID(n.id), user_id=n.user_id, channel=n.channel.value,
        subject=n.subject, body=n.body, status=n.status.value,
        template_key=n.template_key, event_type=n.event_type,
        event_id=n.event_id, created_at=n.created_at, sent_at=n.sent_at,
        read_at=n.read_at, error=n.error)


def model_to_notification(m: NotificationModel) -> Notification:
    created = _tz(m.created_at)
    assert created is not None
    return Notification(
        id=str(m.id), user_id=m.user_id, channel=Channel(m.channel),
        subject=m.subject, body=m.body,
        status=NotificationStatus(m.status), template_key=m.template_key,
        event_type=m.event_type, event_id=m.event_id, created_at=created,
        sent_at=_tz(m.sent_at), read_at=_tz(m.read_at), error=m.error)


def pref_to_model(p: NotificationPreference) -> NotificationPreferenceModel:
    return NotificationPreferenceModel(
        user_id=p.user_id, channel=p.channel.value, event_type=p.event_type,
        enabled=p.enabled)


def model_to_pref(m: NotificationPreferenceModel) -> NotificationPreference:
    return NotificationPreference(
        user_id=m.user_id, channel=Channel(m.channel),
        event_type=m.event_type, enabled=m.enabled)


class SqlAlchemyNotificationRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_id(self, notification_id: str) -> Notification:
        m = self.session.get(NotificationModel, uuid.UUID(notification_id))
        if m is None:
            raise NotFoundError(f"Notification {notification_id} not found.")
        return model_to_notification(m)

    def save(self, notification: Notification) -> Notification:
        merged = self.session.merge(notification_to_model(notification))
        self.session.flush()
        return model_to_notification(merged)

    def delete(self, notification_id: str) -> None:
        m = self.session.get(NotificationModel, uuid.UUID(notification_id))
        if m is None:
            raise NotFoundError(f"Notification {notification_id} not found.")
        self.session.delete(m)
        self.session.flush()

    def list_for_user(
        self, user_id: str, skip: int = 0, limit: int = 50,
        status: str | None = None,
    ) -> tuple[list[Notification], int]:
        stmt = select(NotificationModel).where(
            NotificationModel.user_id == user_id)
        count_stmt = select(func.count(NotificationModel.id)).where(
            NotificationModel.user_id == user_id)
        if status:
            stmt = stmt.where(NotificationModel.status == status)
            count_stmt = count_stmt.where(NotificationModel.status == status)
        stmt = stmt.order_by(NotificationModel.created_at.desc())
        total = self.session.execute(count_stmt).scalar_one()
        rows = self.session.execute(stmt.offset(skip).limit(limit)).scalars()
        return [model_to_notification(r) for r in rows], total


class SqlAlchemyPreferenceRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def save(self, pref: NotificationPreference) -> NotificationPreference:
        merged = self.session.merge(pref_to_model(pref))
        self.session.flush()
        return model_to_pref(merged)

    def list_for_user(self, user_id: str) -> list[NotificationPreference]:
        stmt = select(NotificationPreferenceModel).where(
            NotificationPreferenceModel.user_id == user_id)
        rows = self.session.execute(stmt).scalars().all()
        return [model_to_pref(r) for r in rows]
