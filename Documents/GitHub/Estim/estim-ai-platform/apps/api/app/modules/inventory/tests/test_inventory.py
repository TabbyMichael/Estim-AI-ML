"""Tests for the inventory module (Phase 5.2 gate)."""

from datetime import UTC, datetime
from decimal import Decimal
from unittest.mock import Mock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.modules.inventory.application.services import InventoryService
from app.modules.inventory.domain import rules
from app.modules.inventory.domain.entities import (
    DemandForecast,
    ForecastStatus,
    StockSnapshot,
)
from app.modules.inventory.ml.forecasting import (
    DemandForecaster,
    evaluate_demand,
    extract_demand_features,
)


def _snap() -> StockSnapshot:
    return StockSnapshot(id=str(uuid4()), material_id="MAT-1", site_id="SITE-1",
                         quantity_on_hand=Decimal("100"),
                         reorder_point=Decimal("20"))


def _forecast() -> DemandForecast:
    return DemandForecast(id=str(uuid4()), material_id="MAT-1", site_id="SITE-1",
                          forecast_type="monthly", status=ForecastStatus.GENERATED,
                          predicted_quantity=Decimal("50"),
                          confidence_low=Decimal("40"),
                          confidence_high=Decimal("60"))


class TestDomain:
    def test_below_reorder(self) -> None:
        s = _snap()
        assert s.is_below_reorder() is False
        s.quantity_on_hand = Decimal("10")
        assert s.is_below_reorder() is True

    def test_rules(self) -> None:
        assert rules.days_of_cover(_snap(), Decimal("10")) == 10.0
        assert rules.is_stockout_risk(_snap(), Decimal("10"), 14) is True
        assert rules.is_stockout_risk(_snap(), Decimal("1"), 14) is False
        assert rules.reorder_quantity(_snap(), Decimal("10"), 30) == Decimal("200")
        hist = [Decimal("10"), Decimal("12"), Decimal("20"), Decimal("25")]
        from app.modules.inventory.domain.entities import DemandTrend
        assert rules.detect_trend(hist) == DemandTrend.RISING


class TestApplication:
    def test_record_and_check(self) -> None:
        stock = Mock()
        stock.save.side_effect = lambda s: s
        stock.latest_for.return_value = _snap()
        svc = InventoryService(stock=stock)
        out = svc.stockout_check("MAT-1", "SITE-1", Decimal("10"))
        assert out["at_risk"] is True
        assert out["days_of_cover"] == 10.0

    def test_create_forecast_no_repo(self) -> None:
        from app.modules.inventory.domain.entities import InvalidStateError
        svc = InventoryService(stock=Mock())
        with pytest.raises(InvalidStateError):
            svc.generate_forecast("x")


class TestML:
    def test_features(self) -> None:
        feats = extract_demand_features([Decimal("10"), Decimal("20")], 30)
        assert len(feats) == 6

    def test_predict(self) -> None:
        out = DemandForecaster().predict([Decimal("10"), Decimal("12")])
        assert out["predicted_quantity"] >= 0

    def test_evaluate(self) -> None:
        rep = evaluate_demand([100.0], [105.0])
        assert rep.metrics["accuracy"] > 0.9


@pytest.fixture
def client() -> TestClient:
    from app.main import app as fastapi_app
    from app.modules.inventory.infrastructure.models import (
        DemandForecastModel,
        StockSnapshotModel,
    )

    engine = create_engine("sqlite:///:memory:", poolclass=StaticPool,
                           connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def _fk_on(dbapi_conn, conn_record):  # type: ignore[no-untyped-def]
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    for table in (StockSnapshotModel.__table__, DemandForecastModel.__table__):
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
    def test_snapshot_and_forecast_flow(self, client: TestClient) -> None:
        snap = client.post("/inventory/snapshots", json={
            "material_id": "MAT-9", "site_id": "SITE-9",
            "quantity_on_hand": "100.00"})
        assert snap.status_code == 201, snap.text
        fc = client.post("/inventory/forecasts", json={
            "material_id": "MAT-9", "site_id": "SITE-9",
            "forecast_type": "monthly", "predicted_quantity": "50.00",
            "confidence_low": "40.00", "confidence_high": "60.00",
            "created_by": "tester"})
        assert fc.status_code == 201, fc.text
        fid = fc.json()["id"]
        gen = client.post(f"/inventory/forecasts/{fid}/generate")
        assert gen.status_code == 200
        check = client.get("/inventory/stockout-check", params={
            "material_id": "MAT-9", "site_id": "SITE-9",
            "daily_demand": "10.00"})
        assert check.status_code == 200
        assert check.json()["at_risk"] is True


class TestInfra:
    def test_roundtrip(self) -> None:
        from app.modules.inventory.infrastructure import mappers
        back = mappers.model_to_snapshot(
            mappers.snapshot_to_model(_snap()))
        assert back.material_id == "MAT-1"
        fback = mappers.model_to_forecast(
            mappers.forecast_to_model(_forecast()))
        assert fback.status == ForecastStatus.GENERATED
        _ = datetime.now(UTC)
