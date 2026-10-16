"""Tests for the notifications module (Phase 6.1 gate)."""

from unittest.mock import Mock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.modules.notifications.application.services import (
    EventNotificationBridge,
    NotificationService,
)
from app.modules.notifications.domain import rules
from app.modules.notifications.domain.entities import (
    Channel,
    Notification,
    NotificationPreference,
    NotificationStatus,
)
from app.shared.events import InMemoryEventBus


def _svc() -> tuple[NotificationService, Mock]:
    repo = Mock()
    repo.save.side_effect = lambda n: n
    repo.list_for_user.return_value = ([], 0)
    prefs = Mock()
    prefs.list_for_user.return_value = []
    svc = NotificationService(notifications=repo, preferences=prefs,
                              email=Mock())
    return svc, repo


class TestTemplates:
    def test_render_known(self) -> None:
        subject, body = rules.render("forecast.approved", {
            "project_id": "P1", "forecast_id": "F1",
            "predicted_amount": "100k", "approved_by": "mgr"})
        assert "P1" in subject and "F1" in body

    def test_render_missing_context(self) -> None:
        subject, _ = rules.render("forecast.approved", {})
        assert subject

    def test_template_for_event(self) -> None:
        assert rules.template_for_event("cost_forecasting.forecast.approved") \
            == "forecast.approved"
        assert rules.template_for_event("unknown.event") == "default"


class TestPreferences:
    def test_default_allow(self) -> None:
        assert rules.allows([], "u1", Channel.EMAIL, "e") is True

    def test_explicit_disable(self) -> None:
        prefs = [NotificationPreference(user_id="u1", channel=Channel.EMAIL,
                                        event_type="*", enabled=False)]
        assert rules.allows(prefs, "u1", Channel.EMAIL, "e") is False
        assert rules.allows(prefs, "u1", Channel.IN_APP, "e") is True


class TestService:
    def test_notify_creates_rows(self) -> None:
        svc, repo = _svc()
        created = svc.notify("u1", "cost_forecasting.forecast.approved", {
            "project_id": "P1", "forecast_id": "F1",
            "predicted_amount": "1", "approved_by": "m"})
        assert len(created) == 2  # in_app + email
        assert all(c.status == NotificationStatus.SENT for c in created)
        assert repo.save.call_count == 2

    def test_mark_read(self) -> None:
        svc, repo = _svc()
        n = Notification(id=str(uuid4()), user_id="u1",
                         channel=Channel.IN_APP, subject="s", body="b",
                         status=NotificationStatus.SENT)
        repo.get_by_id.return_value = n
        assert svc.mark_read(n.id).status == NotificationStatus.READ


class TestEventBridge:
    def test_bus_to_notification(self) -> None:
        svc, repo = _svc()
        bus = InMemoryEventBus()
        bridge = EventNotificationBridge(svc, default_users=("u1",))
        bridge.subscribe(bus, ["cost_forecasting.forecast.approved"])
        from app.modules.cost_forecasting.domain.events import ForecastApproved

        bus.publish(ForecastApproved(forecast_id="F1", project_id="P1",
                                     approved_by="mgr"))
        assert repo.save.call_count == 2  # one per channel for u1


@pytest.fixture
def client() -> TestClient:
    from app.main import app as fastapi_app
    from app.modules.notifications.infrastructure.models import (
        NotificationModel,
        NotificationPreferenceModel,
    )

    engine = create_engine("sqlite:///:memory:", poolclass=StaticPool,
                           connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def _fk_on(dbapi_conn, conn_record):  # type: ignore[no-untyped-def]
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    for table in (NotificationModel.__table__,
                  NotificationPreferenceModel.__table__):
        table.schema = None
        table.create(bind=engine, checkfirst=True)

    def override_db():  # type: ignore[no-untyped-def]
        with Session(engine) as sess:
            yield sess

    fastapi_app.dependency_overrides[get_db] = override_db
    with TestClient(fastapi_app, raise_server_exceptions=False) as c:
        yield c
    fastapi_app.dependency_overrides.clear()


class TestApi:
    def test_list_and_preferences(self, client: TestClient) -> None:
        listed = client.get("/notifications", params={"user_id": "u1"})
        assert listed.status_code == 200, listed.text
        pref = client.put("/notifications/u1/preferences", json={
            "channel": "email", "event_type": "*", "enabled": False})
        assert pref.status_code == 200, pref.text
        prefs = client.get("/notifications/u1/preferences")
        assert prefs.status_code == 200
        assert prefs.json()[0]["enabled"] is False
