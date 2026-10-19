"""Infrastructure tests for cost forecasting repositories (Phase 5.2 gate).

SQLite-backed: verifies entity<->model mapping and repository
round-trips. Schema-qualified table names are stripped for SQLite
compat since SQLite has no schemas.
"""

import uuid
from collections.abc import Iterator
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session

from app.modules.cost_forecasting.domain.entities import (
    CostForecast,
    CostSnapshot,
    ForecastModel,
    ForecastStatus,
    ForecastType,
    NotFoundError,
)
from app.modules.cost_forecasting.infrastructure import mappers
from app.modules.cost_forecasting.infrastructure.repository import (
    SqlAlchemyCostForecastRepository,
    SqlAlchemyCostSnapshotRepository,
    SqlAlchemyForecastModelRepository,
)


@pytest.fixture
def session() -> Iterator[Session]:
    # Import here so metadata registration is guaranteed regardless of
    # module import order; create ONLY our tables (global metadata also
    # holds other modules' tables whose schema prefix SQLite rejects).
    from app.modules.cost_forecasting.infrastructure import models as cf_models

    engine = create_engine("sqlite:///:memory:")

    @event.listens_for(engine, "connect")
    def _fk_on(dbapi_conn, conn_record):  # type: ignore[no-untyped-def]
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    # SQLite has no schemas: drop the qualifier for our tables only.
    for table in (
        cf_models.CostForecastModel.__table__,
        cf_models.CostSnapshotModel.__table__,
        cf_models.ForecastModelModel.__table__,
    ):
        table.schema = None
        table.create(bind=engine, checkfirst=True)
    with Session(engine) as sess:
        yield sess


def _forecast(**kwargs) -> CostForecast:
    now = datetime.now(UTC)
    base = dict(
        id=str(uuid.uuid4()),
        project_id="PROJ-001",
        forecast_type=ForecastType.PROJECT_TOTAL,
        status=ForecastStatus.DRAFT,
        predicted_amount=Decimal("100000.00"),
        confidence_interval_low=Decimal("90000.00"),
        confidence_interval_high=Decimal("110000.00"),
        model_version="v1",
        created_at=now,
        created_by="user-1",
    )
    base.update(kwargs)
    return CostForecast(**base)


def _snapshot(**kwargs) -> CostSnapshot:
    now = datetime.now(UTC)
    base = dict(
        id=str(uuid.uuid4()),
        project_id="PROJ-001",
        category="materials",
        amount=Decimal("50000.00"),
        recorded_at=now,
        currency="USD",
        metadata={"source": "odoo"},
    )
    base.update(kwargs)
    return CostSnapshot(**base)


def _model(**kwargs) -> ForecastModel:
    now = datetime.now(UTC)
    base = dict(
        id=str(uuid.uuid4()),
        name="LightGBM",
        version="v1",
        model_type="regressor",
        training_period_start=now,
        training_period_end=now,
        is_active=True,
        created_at=now,
        metrics={"mape": 0.05},
    )
    base.update(kwargs)
    return ForecastModel(**base)


class TestMappers:
    def test_forecast_roundtrip(self):
        forecast = _forecast()
        model = mappers.forecast_to_model(forecast)
        assert model.project_id == "PROJ-001"
        assert model.forecast_type == "project_total"
        assert float(model.predicted_amount) == 100000.00
        back = mappers.model_to_forecast(model)
        assert back.id == forecast.id
        assert back.predicted_amount == forecast.predicted_amount
        assert back.status == forecast.status

    def test_snapshot_roundtrip(self):
        snapshot = _snapshot()
        model = mappers.snapshot_to_model(snapshot)
        assert model.category == "materials"
        back = mappers.model_to_snapshot(model)
        assert back.id == snapshot.id
        assert back.amount == snapshot.amount

    def test_model_roundtrip(self):
        model_entity = _model()
        model = mappers.forecast_model_to_model(model_entity)
        assert model.name == "LightGBM"
        back = mappers.model_to_forecast_model(model)
        assert back.id == model_entity.id
        assert back.is_active == model_entity.is_active


class TestCostForecastRepository:
    def test_save_and_get_by_id(self, session: Session):
        repo = SqlAlchemyCostForecastRepository(session)
        forecast = _forecast()
        saved = repo.save(forecast)
        assert saved.id == forecast.id
        fetched = repo.get_by_id(saved.id)
        assert fetched.project_id == "PROJ-001"
        assert fetched.predicted_amount == Decimal("100000.00")

    def test_exists_for_project_type(self, session: Session):
        repo = SqlAlchemyCostForecastRepository(session)
        assert repo.exists_for_project_type("PROJ-001", "project_total") is False
        repo.save(_forecast())
        assert repo.exists_for_project_type("PROJ-001", "project_total") is True

    def test_get_missing_raises(self, session: Session):
        repo = SqlAlchemyCostForecastRepository(session)
        with pytest.raises(NotFoundError):
            repo.get_by_id("00000000-0000-0000-0000-000000000000")

    def test_delete(self, session: Session):
        repo = SqlAlchemyCostForecastRepository(session)
        forecast = repo.save(_forecast())
        repo.delete(forecast.id)
        with pytest.raises(NotFoundError):
            repo.get_by_id(forecast.id)

    def test_list_forecasts_pagination(self, session: Session):
        repo = SqlAlchemyCostForecastRepository(session)
        for i in range(5):
            repo.save(_forecast(project_id=f"PROJ-{i:03d}"))
        page, total = repo.list_forecasts(skip=0, limit=2)
        assert total == 5
        assert len(page) == 2

    def test_list_forecasts_filter_project(self, session: Session):
        repo = SqlAlchemyCostForecastRepository(session)
        repo.save(_forecast(project_id="PROJ-A"))
        repo.save(_forecast(project_id="PROJ-B"))
        page, total = repo.list_forecasts(filters={"project_id": "PROJ-A"})
        assert total == 1
        assert page[0].project_id == "PROJ-A"


class TestCostSnapshotRepository:
    def test_save_and_get_by_id(self, session: Session):
        repo = SqlAlchemyCostSnapshotRepository(session)
        snapshot = _snapshot()
        saved = repo.save(snapshot)
        assert saved.id == snapshot.id
        fetched = repo.get_by_id(saved.id)
        assert fetched.category == "materials"
        assert fetched.amount == Decimal("50000.00")

    def test_get_missing_raises(self, session: Session):
        repo = SqlAlchemyCostSnapshotRepository(session)
        with pytest.raises(NotFoundError):
            repo.get_by_id("00000000-0000-0000-0000-000000000000")

    def test_list_snapshots_filter_category(self, session: Session):
        repo = SqlAlchemyCostSnapshotRepository(session)
        repo.save(_snapshot(category="materials"))
        repo.save(_snapshot(category="labor"))
        page, total = repo.list_snapshots(filters={"category": "materials"})
        assert total == 1
        assert page[0].category == "materials"


class TestForecastModelRepository:
    def test_save_and_get_by_id(self, session: Session):
        repo = SqlAlchemyForecastModelRepository(session)
        model_entity = _model()
        saved = repo.save(model_entity)
        assert saved.id == model_entity.id
        fetched = repo.get_by_id(saved.id)
        assert fetched.name == "LightGBM"

    def test_get_missing_raises(self, session: Session):
        repo = SqlAlchemyForecastModelRepository(session)
        with pytest.raises(NotFoundError):
            repo.get_by_id("00000000-0000-0000-0000-000000000000")

    def test_get_active(self, session: Session):
        repo = SqlAlchemyForecastModelRepository(session)
        repo.save(_model(version="v1", is_active=True))
        repo.save(_model(version="v2", is_active=False))
        active = repo.get_active()
        assert active is not None
        assert active.version == "v1"

    def test_list_models(self, session: Session):
        repo = SqlAlchemyForecastModelRepository(session)
        for i in range(3):
            repo.save(_model(version=f"v{i}"))
        page, total = repo.list_models(skip=0, limit=10)
        assert total == 3
