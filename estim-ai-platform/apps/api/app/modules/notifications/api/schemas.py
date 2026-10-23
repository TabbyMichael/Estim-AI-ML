"""Pydantic schemas for the notifications API."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.modules.notifications.domain.entities import Notification


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    channel: str
    subject: str
    body: str
    status: str
    event_type: str
    created_at: datetime
    sent_at: datetime | None = None
    read_at: datetime | None = None

    @classmethod
    def from_entity(cls, n: Notification) -> "NotificationResponse":
        return cls(
            id=n.id,
            user_id=n.user_id,
            channel=n.channel.value,
            subject=n.subject,
            body=n.body,
            status=n.status.value,
            event_type=n.event_type,
            created_at=n.created_at,
            sent_at=n.sent_at,
            read_at=n.read_at,
        )


class NotificationListResponse(BaseModel):
    notifications: list[NotificationResponse]
    total: int
    skip: int
    limit: int


class PreferenceUpsert(BaseModel):
    channel: str = Field(..., min_length=1)
    event_type: str = Field("*")
    enabled: bool = True


class PreferenceResponse(BaseModel):
    user_id: str
    channel: str
    event_type: str
    enabled: bool


class NotificationCreateRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    event_type: str = Field(default="default")
    subject: str = Field(default="")
    body: str = Field(default="")
    context: dict = Field(default_factory=dict)
    event_id: str = Field(default="")


class NotificationStatsResponse(BaseModel):
    total: int
    unread: int
    read: int
    failed: int
