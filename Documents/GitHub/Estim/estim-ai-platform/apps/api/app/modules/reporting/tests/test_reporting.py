"""Tests for the reporting module (Phase 6.2 gate)."""

from datetime import UTC, datetime, timedelta
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.modules.reporting.application.services import (
    ProviderRegistry,
    ReportService,
    ScheduleService,
)
from app.modules.reporting.domain import rules
from app.modules.reporting.domain.entities import (
    ReportFormat,
    ReportStatus,
    UnknownReportTypeError,
)


def _svc() -> tuple[ReportService, Mock, ProviderRegistry]:
    repo = Mock()
    repo.save.side_effect = lambda r: r
    repo.list_reports.return_value = ([], 0)
    reg = ProviderRegistry()
    reg.register("demo", lambda filters: {"count": len(filters), "rows": [{"a": 1, "b": 2}]})
    return ReportService(reports=repo, providers=reg), repo, reg


class TestTemplates:
    def test_render_markdown(self) -> None:
        out = rules.render({"total": 5, "rows": [{"x": 1}]}, ReportFormat.MARKDOWN, title="T")
        assert "# T" in out and "| x |" in out

    def test_render_csv(self) -> None:
        out = rules.render({"rows": [{"x": 1, "y": 2}]}, ReportFormat.CSV)
        assert out.splitlines()[0] == "x,y"

    def test_render_json(self) -> None:
        assert '"total"' in rules.render({"total": 5}, ReportFormat.JSON)


class TestSchedules:
    def test_due_math(self) -> None:
        now = datetime.now(UTC)
        assert rules.is_due(None, "daily", now) is True
        assert rules.is_due(now - timedelta(hours=1), "daily", now) is False
        assert rules.is_due(now - timedelta(days=2), "daily", now) is True

    def test_tick_generates(self) -> None:
        svc, repo, _ = _svc()
        sched_repo = Mock()
        sched_repo.list_schedules.return_value = []
        sched_repo.save.side_effect = lambda s: s
        sched_svc = ScheduleService(schedules=sched_repo, reports=svc)
        assert sched_svc.tick() == []

    def test_tick_skips_not_due(self) -> None:
        svc, _, _ = _svc()
        sched_repo = Mock()
        schedule = Mock()
        schedule.enabled = True
        schedule.interval = "daily"
        schedule.last_run_at = datetime.now(UTC)
        sched_repo.list_schedules.return_value = [schedule]
        sched_svc = ScheduleService(schedules=sched_repo, reports=svc)
        assert sched_svc.tick() == []


class TestReportService:
    def test_generate_ok(self) -> None:
        svc, repo, _ = _svc()
        report = svc.generate("demo", {"k": "v"})
        assert report.status == ReportStatus.GENERATED
        assert report.content

    def test_generate_unknown_type(self) -> None:
        svc, repo, _ = _svc()
        with pytest.raises(UnknownReportTypeError):
            svc.generate("nope")
        assert repo.save.call_count == 2  # pending persisted, then failed


@pytest.fixture
def client() -> TestClient:
    from app.main import app as fastapi_app
    from app.modules.reporting.infrastructure.models import (
        ReportModel,
        ReportScheduleModel,
    )

    engine = create_engine(
        "sqlite:///:memory:", poolclass=StaticPool, connect_args={"check_same_thread": False}
    )

    @event.listens_for(engine, "connect")
    def _fk_on(dbapi_conn, conn_record):  # type: ignore[no-untyped-def]
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    for table in (ReportModel.__table__, ReportScheduleModel.__table__):
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
    def test_generate_and_list(self, client: TestClient) -> None:
        gen = client.post(
            "/reports/generate", json={"report_type": "platform_overview", "format": "markdown"}
        )
        assert gen.status_code == 201, gen.text
        assert gen.json()["status"] == "generated"
        listed = client.get("/reports")
        assert listed.status_code == 200
        assert listed.json()["total"] >= 1

    def test_unknown_type_400(self, client: TestClient) -> None:
        gen = client.post("/reports/generate", json={"report_type": "nope"})
        assert gen.status_code == 400

    def test_schedule_flow(self, client: TestClient) -> None:
        created = client.post(
            "/reports/schedules", json={"report_type": "platform_overview", "interval": "daily"}
        )
        assert created.status_code == 201, created.text
        schedules = client.get("/reports/schedules/list")
        assert schedules.status_code == 200
        assert len(schedules.json()) >= 1
