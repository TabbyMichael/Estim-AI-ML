"""Application tests for cost forecasting services."""

from decimal import Decimal
from unittest.mock import Mock

import pytest

from app.modules.cost_forecasting.api.schemas import (
    CostForecastCreate,
    CostForecastFilters,
    CostSnapshotCreate,
    ForecastModelCreate,
    ForecastTypeEnum,
)
from app.modules.cost_forecasting.application.services import (
    CostForecastingService,
    CostSnapshotService,
    ForecastModelService,
)
from app.modules.cost_forecasting.domain.entities import (
    DuplicateForecastError,
    ForecastStatus,
    ForecastType,
    InvalidStateError,
    NotFoundError,
)


def _make_forecast(**kw):  # type: ignore[no-untyped-def]
    from datetime import UTC, datetime
    from uuid import uuid4

    from app.modules.cost_forecasting.domain.entities import CostForecast

    base = dict(
        id=str(uuid4()), project_id="PROJ-001",
        forecast_type=ForecastType.PROJECT_TOTAL,
        status=ForecastStatus.DRAFT,
        predicted_amount=Decimal("100000.00"),
        confidence_interval_low=Decimal("90000.00"),
        confidence_interval_high=Decimal("110000.00"),
        model_version="v1", created_at=datetime.now(UTC),
        created_by="user-1",
    )
    base.update(kw)
    return CostForecast(**base)


def _create_payload() -> CostForecastCreate:
    return CostForecastCreate(
        project_id="PROJ-001", forecast_type=ForecastTypeEnum.PROJECT_TOTAL,
        predicted_amount=Decimal("100000.00"),
        confidence_interval_low=Decimal("90000.00"),
        confidence_interval_high=Decimal("110000.00"),
        model_version="v1", created_by="user-1",
    )


class TestCostForecastingService:
    def _svc(self, repo: Mock | None = None):  # type: ignore[no-untyped-def]
        repo = repo or Mock()
        repo.save.side_effect = lambda f: f
        return CostForecastingService(forecasts=repo), repo

    def test_create_ok(self) -> None:
        svc, repo = self._svc()
        repo.exists_for_project_type.return_value = False
        f = svc.create_forecast(_create_payload())
        assert f.status == ForecastStatus.DRAFT
        repo.save.assert_called_once()

    def test_create_duplicate(self) -> None:
        svc, repo = self._svc()
        repo.exists_for_project_type.return_value = True
        with pytest.raises(DuplicateForecastError):
            svc.create_forecast(_create_payload())

    def test_generate_ok(self) -> None:
        svc, repo = self._svc()
        repo.get_by_id.return_value = _make_forecast(status=ForecastStatus.DRAFT)
        f = svc.generate_forecast("fid")
        assert f.status == ForecastStatus.GENERATED

    def test_generate_bad_state(self) -> None:
        svc, repo = self._svc()
        repo.get_by_id.return_value = _make_forecast(
            status=ForecastStatus.APPROVED
        )
        with pytest.raises(InvalidStateError):
            svc.generate_forecast("fid")

    def test_approve_reject(self) -> None:
        svc, repo = self._svc()
        repo.get_by_id.return_value = _make_forecast(
            status=ForecastStatus.GENERATED
        )
        assert svc.approve_forecast("f", "mgr").status == ForecastStatus.APPROVED
        repo.get_by_id.return_value = _make_forecast(
            status=ForecastStatus.GENERATED
        )
        assert svc.reject_forecast("f", "mgr").status == ForecastStatus.REJECTED

    def test_get_missing(self) -> None:
        svc, repo = self._svc()
        repo.get_by_id.side_effect = NotFoundError("x")
        with pytest.raises(NotFoundError):
            svc.get_forecast("missing")

    def test_list(self) -> None:
        svc, repo = self._svc()
        repo.list_forecasts.return_value = ([], 0)
        items, total = svc.list_forecasts(
            0, 10, CostForecastFilters(project_id="PROJ-001")
        )
        assert (items, total) == ([], 0)

    def test_record_actual(self) -> None:
        svc, repo = self._svc()
        repo.get_by_id.return_value = _make_forecast(
            status=ForecastStatus.GENERATED
        )
        f = svc.record_actual("f", Decimal("110000.00"))
        assert f.variance == Decimal("10000.00")


class TestSnapshotAndModelServices:
    def test_snapshot_crud(self) -> None:
        repo = Mock()
        repo.save.side_effect = lambda s: s
        svc = CostSnapshotService(snapshots=repo)
        snap = svc.create_snapshot(
            CostSnapshotCreate(project_id="P", category="m", amount=Decimal("5"))
        )
        assert snap.project_id == "P"
        repo.list_snapshots.return_value = ([snap], 1)
        items, total = svc.list_snapshots(0, 10, {"project_id": "P"})
        assert total == 1

    def test_model_crud(self) -> None:
        from datetime import UTC, datetime

        repo = Mock()
        repo.save.side_effect = lambda m: m
        svc = ForecastModelService(models=repo)
        now = datetime.now(UTC)
        model = svc.create_model(
            ForecastModelCreate(
                name="lgbm", version="v1", model_type="regressor",
                training_period_start=now, training_period_end=now,
            )
        )
        assert model.name == "lgbm"
        repo.get_active.return_value = model
        assert svc.get_active_model() is not None
