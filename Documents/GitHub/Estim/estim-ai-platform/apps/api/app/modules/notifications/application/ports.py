"""Ports for the notifications module."""

from __future__ import annotations

from typing import Protocol

from app.modules.notifications.domain.entities import (
    Notification,
    NotificationPreference,
)


class NotificationRepository(Protocol):
    def get_by_id(self, notification_id: str) -> Notification: ...
    def save(self, notification: Notification) -> Notification: ...
    def list_for_user(
        self, user_id: str, skip: int = 0, limit: int = 50,
        status: str | None = None,
    ) -> tuple[list[Notification], int]: ...


class PreferenceRepository(Protocol):
    def save(self, pref: NotificationPreference) -> NotificationPreference: ...
    def list_for_user(self, user_id: str) -> list[NotificationPreference]: ...
