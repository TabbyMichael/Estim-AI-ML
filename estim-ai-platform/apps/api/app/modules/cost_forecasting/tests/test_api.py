"""API tests for cost forecasting routes."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.database import get_db


@pytest.fixture
def client() -> TestClient:
    from app.main import app as fastapi_app

    engine = create_engine(
        "sqlite:///:memory:",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(engine, "connect")
    def _fk_on(dbapi_conn, conn_record):  # type: ignore[no-untyped-def]
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    # Create ONLY our tables via Table objects (global metadata also
    # holds identity/procurement tables whose schema prefix SQLite rejects).
    from app.modules.cost_forecasting.infrastructure.models import (
        CostForecastModel,
        CostSnapshotModel,
        ForecastModelModel,
    )

    for table in (
        CostForecastModel.__table__,
        CostSnapshotModel.__table__,
        ForecastModelModel.__table__,
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


def _payload(pid: str = "PROJ-API-1") -> dict:
    return {
        "project_id": pid,
        "forecast_type": "project_total",
        "predicted_amount": "100000.00",
        "confidence_interval_low": "90000.00",
        "confidence_interval_high": "110000.00",
        "model_version": "v1",
        "created_by": "tester",
    }


class TestForecastApi:
    def test_full_lifecycle(self, client: TestClient) -> None:
        created = client.post("/cost-forecasting/forecasts", json=_payload())
        assert created.status_code == 201, created.text
        fid = created.json()["id"]
        assert created.json()["status"] == "draft"

        dup = client.post("/cost-forecasting/forecasts", json=_payload())
        assert dup.status_code == 409

        gen = client.post(f"/cost-forecasting/forecasts/{fid}/generate")
        assert gen.status_code == 200, gen.text
        assert gen.json()["status"] == "generated"

        approved = client.post(
            f"/cost-forecasting/forecasts/{fid}/approve",
            params={"approved_by": "mgr-1"},
        )
        assert approved.status_code == 200, approved.text
        assert approved.json()["status"] == "approved"

        actual = client.post(
            f"/cost-forecasting/forecasts/{fid}/actual",
            params={"actual_amount": "105000.00"},
        )
        assert actual.status_code == 200, actual.text
        assert float(actual.json()["variance"]) == 5000.0

        listed = client.get("/cost-forecasting/forecasts")
        assert listed.status_code == 200
        assert listed.json()["total"] >= 1

    def test_get_missing(self, client: TestClient) -> None:
        resp = client.get("/cost-forecasting/forecasts/00000000-0000-0000-0000-000000000000")
        assert resp.status_code == 404

    def test_reject_flow(self, client: TestClient) -> None:
        created = client.post("/cost-forecasting/forecasts", json=_payload("PROJ-REJ"))
        fid = created.json()["id"]
        client.post(f"/cost-forecasting/forecasts/{fid}/generate")
        rej = client.post(
            f"/cost-forecasting/forecasts/{fid}/reject",
            params={"rejected_by": "mgr-2"},
        )
        assert rej.status_code == 200
        assert rej.json()["status"] == "rejected"

    def test_snapshots_and_models(self, client: TestClient) -> None:
        snap = client.post(
            "/cost-forecasting/snapshots",
            json={"project_id": "P1", "category": "materials", "amount": "50.00"},
        )
        assert snap.status_code == 201, snap.text
        listed = client.get("/cost-forecasting/snapshots")
        assert listed.status_code == 200
        assert listed.json()["total"] >= 1

        model = client.post(
            "/cost-forecasting/models",
            json={
                "name": "lgbm",
                "version": "v1",
                "model_type": "regressor",
                "training_period_start": "2024-01-01T00:00:00Z",
                "training_period_end": "2024-06-01T00:00:00Z",
            },
        )
        assert model.status_code == 201, model.text
        models = client.get("/cost-forecasting/models")
        assert models.status_code == 200
        assert models.json()["total"] >= 1
