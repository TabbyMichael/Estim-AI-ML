"""Tests for the audit module (Phase 6.3 gate)."""

from datetime import UTC, datetime, timedelta
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.modules.audit.application.services import AuditService
from app.modules.audit.domain import rules
from app.modules.audit.domain.entities import AuditLog


def _repo() -> Mock:
    repo = Mock()
    repo.save.side_effect = lambda log: log
    repo.list_logs.return_value = ([], 0)
    repo.purge_before.return_value = 0
    return repo


class TestRules:
    def test_should_purge(self) -> None:
        now = datetime.now(UTC)
        assert rules.should_purge(now - timedelta(days=400), 365, now) is True
        assert rules.should_purge(now - timedelta(days=1), 365, now) is False

    def test_summarize(self) -> None:
        logs = [
            AuditLog(
                id="1",
                actor="a",
                action="http_post",
                resource_type="orders",
                resource_id="1",
                created_at=datetime.now(UTC),
            ),
            AuditLog(
                id="2",
                actor="a",
                action="http_delete",
                resource_type="orders",
                resource_id="2",
                created_at=datetime.now(UTC),
            ),
        ]
        summary = rules.summarize(logs)
        assert summary["total"] == 2
        assert summary["by_action"]["http_post"] == 1
        assert summary["by_resource"]["orders"] == 2


class TestAuditService:
    def test_record(self) -> None:
        repo = _repo()
        svc = AuditService(repository=repo)
        log = svc.record(
            actor="u1", action="create", resource_type="po", resource_id="9", details={"k": "v"}
        )
        assert log.id and log.actor == "u1"
        repo.save.assert_called_once()

    def test_record_http(self) -> None:
        repo = _repo()
        svc = AuditService(repository=repo)
        log = svc.record_http(method="POST", path="/api/orders/9", status_code=201, actor="u1")
        assert log.action == "http_post"
        assert log.resource_type == "orders"
        assert log.resource_id == "9"
        assert log.details["status_code"] == 201

    def test_purge_expired(self) -> None:
        repo = _repo()
        repo.purge_before.return_value = 3
        svc = AuditService(repository=repo)
        assert svc.purge_expired(30) == 3


@pytest.fixture
def client() -> TestClient:
    from app.main import app as fastapi_app
    from app.modules.audit.infrastructure.models import AuditLogModel

    engine = create_engine(
        "sqlite:///:memory:", poolclass=StaticPool, connect_args={"check_same_thread": False}
    )

    @event.listens_for(engine, "connect")
    def _fk_on(dbapi_conn, conn_record):  # type: ignore[no-untyped-def]
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    table = AuditLogModel.__table__
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
    def test_record_and_list(self, client: TestClient) -> None:
        rec = client.post(
            "/audit/record",
            json={
                "actor": "u1",
                "action": "create",
                "resource_type": "po",
                "resource_id": "9",
                "details": {"note": "x"},
            },
        )
        assert rec.status_code == 201, rec.text
        assert rec.json()["actor"] == "u1"

        listed = client.get("/audit/logs")
        assert listed.status_code == 200
        assert listed.json()["total"] >= 1

    def test_summary_and_purge(self, client: TestClient) -> None:
        client.post(
            "/audit/record",
            json={"actor": "u1", "action": "http_post", "resource_type": "po", "resource_id": "1"},
        )
        summary = client.get("/audit/summary")
        assert summary.status_code == 200
        assert summary.json()["total_logged"] >= 1

        purged = client.post("/audit/purge", params={"retention_days": 0})
        assert purged.status_code == 200
