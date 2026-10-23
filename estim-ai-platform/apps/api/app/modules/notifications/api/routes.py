# mypy: ignore-errors
"""Notifications API routes: /notifications/*."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import NotFoundError as CoreNotFound
from app.modules.notifications.api.schemas import (
    NotificationCreateRequest,
    NotificationListResponse,
    NotificationResponse,
    NotificationStatsResponse,
    PreferenceResponse,
    PreferenceUpsert,
)
from app.modules.notifications.application.services import NotificationService
from app.modules.notifications.domain import entities as domain_errors
from app.modules.notifications.domain.entities import Channel
from app.modules.notifications.infrastructure.repository import (
    SqlAlchemyNotificationRepository,
    SqlAlchemyPreferenceRepository,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _service(db: Session = Depends(get_db)) -> NotificationService:
    return NotificationService(
        notifications=SqlAlchemyNotificationRepository(db),
        preferences=SqlAlchemyPreferenceRepository(db),
    )


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    user_id: str = Query(..., min_length=1),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status_filter: str | None = Query(None, alias="status"),
    svc: NotificationService = Depends(_service),
) -> NotificationListResponse:
    items, total = svc.list_for_user(user_id, skip, limit, status_filter)
    return NotificationListResponse(
        notifications=[NotificationResponse.from_entity(n) for n in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post("/{notification_id}/read", response_model=NotificationResponse)
def mark_read(
    notification_id: str,
    svc: NotificationService = Depends(_service),
    db: Session = Depends(get_db),
) -> NotificationResponse:
    try:
        n = svc.mark_read(notification_id)
    except domain_errors.NotFoundError as exc:
        raise CoreNotFound(str(exc)) from exc
    db.commit()
    return NotificationResponse.from_entity(n)


@router.get("/{user_id}/preferences", response_model=list[PreferenceResponse])
def list_preferences(
    user_id: str,
    svc: NotificationService = Depends(_service),
) -> list[PreferenceResponse]:
    prefs = svc.preferences.list_for_user(user_id) if svc.preferences else []
    return [
        PreferenceResponse(
            user_id=p.user_id, channel=p.channel.value, event_type=p.event_type, enabled=p.enabled
        )
        for p in prefs
    ]


@router.put("/{user_id}/preferences", response_model=PreferenceResponse)
def upsert_preference(
    user_id: str,
    body: PreferenceUpsert,
    svc: NotificationService = Depends(_service),
    db: Session = Depends(get_db),
) -> PreferenceResponse:
    from app.modules.notifications.domain.entities import NotificationPreference

    if svc.preferences is None:
        raise CoreNotFound("Preferences not configured")
    pref = NotificationPreference(
        user_id=user_id,
        channel=Channel(body.channel),
        event_type=body.event_type,
        enabled=body.enabled,
    )
    svc.preferences.save(pref)
    db.commit()
    return PreferenceResponse(
        user_id=pref.user_id,
        channel=pref.channel.value,
        event_type=pref.event_type,
        enabled=pref.enabled,
    )


@router.post("", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
def create_notification(
    body: NotificationCreateRequest,
    svc: NotificationService = Depends(_service),
    db: Session = Depends(get_db),
) -> NotificationResponse:
    """Create + dispatch a notification (queue + triggers entrypoint)."""
    created = svc.notify(
        user_id=body.user_id,
        event_type=body.event_type,
        context={"subject": body.subject, "body": body.body, **body.context},
        event_id=body.event_id,
    )
    db.commit()
    if created:
        return NotificationResponse.from_entity(created[0])
    fallback = svc.notify(
        user_id=body.user_id,
        event_type="default",
        context={"event_type": body.event_type},
        event_id=body.event_id,
    )
    db.commit()
    return NotificationResponse.from_entity(fallback[0])


@router.post("/read-all", response_model=dict)
def mark_all_read(
    user_id: str = Query(..., min_length=1),
    svc: NotificationService = Depends(_service),
    db: Session = Depends(get_db),
) -> dict:
    count = svc.mark_all_read(user_id)
    db.commit()
    return {"user_id": user_id, "marked_read": count}


@router.get("/stats/summary", response_model=NotificationStatsResponse)
def notification_stats(
    user_id: str = Query(..., min_length=1),
    svc: NotificationService = Depends(_service),
) -> NotificationStatsResponse:
    return NotificationStatsResponse(**svc.stats_for_user(user_id))


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    notification_id: str,
    svc: NotificationService = Depends(_service),
    db: Session = Depends(get_db),
) -> None:
    try:
        svc.delete(notification_id)
    except domain_errors.NotFoundError as exc:
        raise CoreNotFound(str(exc)) from exc
    db.commit()
