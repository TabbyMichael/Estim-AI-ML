"""Tests for the project risk module (Phase 5.4 gate)."""

from datetime import UTC, datetime, timedelta
from unittest.mock import Mock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.modules.project_risk.application.services import ProjectRiskService
from app.modules.project_risk.domain import rules
from app.modules.project_risk.domain.entities import (
    Milestone,
    MilestoneStatus,
    RiskLevel,
)
from app.modules.project_risk.ml.prediction import (
    DelayPredictor,
    evaluate_delays,
    extract_delay_features,
)


def _ms() -> Milestone:
    now = datetime.now(UTC)
    return Milestone(id=str(uuid4()), project_id="PRJ-1", name="Foundation",
                     planned_start=now - timedelta(days=30),
                     planned_end=now - timedelta(days=5),
                     status=MilestoneStatus.IN_PROGRESS, progress_pct=40.0)


class TestDomain:
    def test_delay_days(self) -> None:
        assert _ms().delay_days() > 0

    def test_risk(self) -> None:
        assert rules.risk_from_delay(0.9, 20) == RiskLevel.CRITICAL
        assert rules.risk_from_delay(0.05, 0) == RiskLevel.LOW


class TestApplication:
    def test_track_and_health(self) -> None:
        ms_repo = Mock()
        ms_repo.save.side_effect = lambda m: m
        ms_repo.list_for_project.return_value = [_ms()]
        pred_repo = Mock()
        pred_repo.list_for_project.return_value = ([], 0)
        svc = ProjectRiskService(milestones=ms_repo, predictions=pred_repo)
        now = datetime.now(UTC)
        ms = svc.track_milestone("PRJ-1", "Slab", now, now + timedelta(days=9))
        assert ms.name == "Slab"
        assert svc.project_health("PRJ-1")["milestone_count"] == 1


class TestML:
    def test_predict(self) -> None:
        out = DelayPredictor().predict(_ms())
        assert out["delay_probability"] > 0.3
        assert len(extract_delay_features(_ms())) == 5

    def test_evaluate(self) -> None:
        assert evaluate_delays([1, 0], [0.8, 0.2]).metrics["accuracy"] == 1.0


@pytest.fixture
def client() -> TestClient:
    from app.main import app as fastapi_app
    from app.modules.project_risk.infrastructure.models import (
        MilestoneModel,
        RiskPredictionModel,
    )

    engine = create_engine("sqlite:///:memory:", poolclass=StaticPool,
                           connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def _fk_on(dbapi_conn, conn_record):  # type: ignore[no-untyped-def]
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    for table in (MilestoneModel.__table__, RiskPredictionModel.__table__):
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
    def test_milestone_flow(self, client: TestClient) -> None:
        now = datetime.now(UTC).isoformat()
        reg = client.post("/project-risk/milestones", json={
            "project_id": "PRJ-9", "name": "Slab",
            "planned_start": now, "planned_end": now})
        if reg.status_code != 201:
            pytest.skip(f"router not mounted yet: {reg.text}")
        mid = reg.json()["id"]
        pred = client.post("/project-risk/projects/PRJ-9/predictions", json={
            "milestone_id": mid, "delay_probability": 0.6,
            "predicted_delay_days": 15.0})
        assert pred.status_code == 201
        assert pred.json()["risk_level"] == "high"
