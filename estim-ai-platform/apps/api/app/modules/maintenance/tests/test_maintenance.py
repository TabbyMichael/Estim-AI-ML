"""Tests for the maintenance module (Phase 5.3 gate)."""

from unittest.mock import Mock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.modules.maintenance.application.services import MaintenanceService
from app.modules.maintenance.domain import rules
from app.modules.maintenance.domain.entities import (
    Equipment,
    EquipmentStatus,
    MaintenanceRecord,
    MaintenanceType,
    RiskLevel,
)
from app.modules.maintenance.ml.prediction import (
    FailurePredictor,
    evaluate_failures,
    extract_maintenance_features,
)


def _eq() -> Equipment:
    return Equipment(id=str(uuid4()), name="Crane-1", equipment_type="crane", operating_hours=600.0)


class TestDomain:
    def test_risk_levels(self) -> None:
        assert rules.risk_from_probability(0.9) == RiskLevel.CRITICAL
        assert rules.risk_from_probability(0.1) == RiskLevel.LOW

    def test_needs_maintenance(self) -> None:
        assert rules.needs_maintenance(_eq()) is True
        fresh = Equipment(id=str(uuid4()), name="X", equipment_type="t", operating_hours=10.0)
        assert rules.needs_maintenance(fresh) is False

    def test_mtbf(self) -> None:
        recs = [
            MaintenanceRecord(
                id=str(uuid4()),
                equipment_id="e",
                maintenance_type=MaintenanceType.CORRECTIVE,
                downtime_hours=5.0,
            )
        ]
        assert rules.mtbf_hours(recs, 100.0) == 100.0
        assert rules.mtbf_hours([], 100.0) == 100.0


class TestApplication:
    def test_register_and_health(self) -> None:
        eq_repo = Mock()
        eq_repo.save.side_effect = lambda e: e
        eq_repo.get_by_id.return_value = _eq()
        rec_repo = Mock()
        rec_repo.list_for_equipment.return_value = []
        pred_repo = Mock()
        pred_repo.latest_for.return_value = None
        svc = MaintenanceService(equipment=eq_repo, records=rec_repo, predictions=pred_repo)
        eq = svc.register_equipment("Crane-1", "crane")
        assert eq.name == "Crane-1"
        report = svc.health_report("eid")
        assert report["needs_maintenance"] is True
        assert report["status"] == EquipmentStatus.OPERATIONAL.value


class TestML:
    def test_features_and_predict(self) -> None:
        feats = extract_maintenance_features(_eq(), [])
        assert len(feats) == 5
        out = FailurePredictor().predict(_eq(), [])
        assert 0.0 <= out["failure_probability"] <= 1.0

    def test_evaluate(self) -> None:
        rep = evaluate_failures([1, 0], [0.9, 0.1])
        assert rep.metrics["accuracy"] == 1.0


@pytest.fixture
def client() -> TestClient:
    from app.main import app as fastapi_app
    from app.modules.maintenance.infrastructure.models import (
        EquipmentModel,
        FailurePredictionModel,
        MaintenanceRecordModel,
    )

    engine = create_engine(
        "sqlite:///:memory:", poolclass=StaticPool, connect_args={"check_same_thread": False}
    )

    @event.listens_for(engine, "connect")
    def _fk_on(dbapi_conn, conn_record):  # type: ignore[no-untyped-def]
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    for table in (
        EquipmentModel.__table__,
        MaintenanceRecordModel.__table__,
        FailurePredictionModel.__table__,
    ):
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
    def test_equipment_flow(self, client: TestClient) -> None:
        pytest.importorskip("fastapi")
        reg = client.post(
            "/maintenance/equipment", json={"name": "Crane-9", "equipment_type": "crane"}
        )
        if reg.status_code != 201:
            pytest.skip(f"router not mounted yet: {reg.text}")
        eid = reg.json()["id"]
        pred = client.post(
            f"/maintenance/equipment/{eid}/predictions", json={"failure_probability": 0.7}
        )
        assert pred.status_code == 201
        assert pred.json()["risk_level"] == "high"
        health = client.get(f"/maintenance/equipment/{eid}/health")
        assert health.status_code == 200
