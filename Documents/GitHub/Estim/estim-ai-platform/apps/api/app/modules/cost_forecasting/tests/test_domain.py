"""Domain tests for cost forecasting (Phase 5.1 gate)."""

from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest

from app.modules.cost_forecasting.domain import rules
from app.modules.cost_forecasting.domain.entities import (
    CostForecast,
    CostSnapshot,
    ForecastModel,
    ForecastStatus,
    ForecastType,
    InvalidStateError,
)


def _forecast(**kw) -> CostForecast:
    base = dict(
        id=str(uuid4()),
        project_id="PROJ-001",
        forecast_type=ForecastType.PROJECT_TOTAL,
        status=ForecastStatus.GENERATED,
        predicted_amount=Decimal("100000.00"),
        confidence_interval_low=Decimal("90000.00"),
        confidence_interval_high=Decimal("110000.00"),
        model_version="v1",
        created_at=datetime.now(UTC),
        created_by="user-1",
    )
    base.update(kw)
    return CostForecast(**base)


class TestEntities:
    def test_approve_flow(self) -> None:
        f = _forecast(status=ForecastStatus.GENERATED)
        f.approve("mgr-1", notes="ok")
        assert f.status == ForecastStatus.APPROVED
        assert f.approved_by == "mgr-1"

    def test_approve_wrong_state(self) -> None:
        f = _forecast(status=ForecastStatus.DRAFT)
        with pytest.raises(InvalidStateError):
            f.approve("mgr-1")

    def test_reject_flow(self) -> None:
        f = _forecast(status=ForecastStatus.GENERATED)
        f.reject("mgr-1")
        assert f.status == ForecastStatus.REJECTED

    def test_record_actual(self) -> None:
        f = _forecast()
        f.record_actual(Decimal("105000.00"))
        assert f.variance == Decimal("5000.00")
        assert f.accuracy_score is not None and f.accuracy_score > 0.9

    def test_negative_predicted_rejected(self) -> None:
        with pytest.raises(ValueError):
            _forecast(predicted_amount=Decimal("-1"))

    def test_bad_interval_rejected(self) -> None:
        with pytest.raises(ValueError):
            _forecast(
                confidence_interval_low=Decimal("200"),
                confidence_interval_high=Decimal("100"),
            )

    def test_snapshot_validation(self) -> None:
        with pytest.raises(ValueError):
            CostSnapshot(
                id=str(uuid4()), project_id="P", category="m",
                amount=Decimal("-5"), recorded_at=datetime.now(UTC),
            )


class TestRules:
    def test_lifecycle_guards(self) -> None:
        assert rules.can_generate_forecast(
            _forecast(status=ForecastStatus.DRAFT)
        ) is True
        assert rules.can_approve_forecast(_forecast()) is True
        assert rules.can_reject_forecast(_forecast()) is True

    def test_stale(self) -> None:
        old = _forecast(created_at=datetime.now(UTC) - timedelta(hours=200))
        assert rules.is_forecast_stale(old) is True
        fresh = _forecast(created_at=datetime.now(UTC))
        assert rules.is_forecast_stale(fresh) is False

    def test_budget(self) -> None:
        assert rules.is_budget_at_risk(
            Decimal("100"), Decimal("60"), Decimal("50")
        ) is True
        assert rules.is_budget_at_risk(
            Decimal("200"), Decimal("60"), Decimal("50")
        ) is False
        assert rules.get_budget_utilization(
            Decimal("90"), Decimal("100")
        ) == pytest.approx(0.9)
        assert rules.is_budget_critical(0.95) is True

    def test_accuracy(self) -> None:
        assert rules.calculate_accuracy(
            Decimal("100"), Decimal("100")
        ) == pytest.approx(1.0)
        assert rules.calculate_variance(
            Decimal("100"), Decimal("120")
        ) == Decimal("20")

    def test_priority(self) -> None:
        assert rules.get_forecast_priority(
            _forecast(predicted_amount=Decimal("2000000"))
        ) == "high"
        assert rules.get_forecast_priority(
            _forecast(predicted_amount=Decimal("10"))
        ) == "low"

    def test_model_rules(self) -> None:
        now = datetime.now(UTC)
        m = ForecastModel(
            id=str(uuid4()), name="lgbm", version="v1",
            model_type="regressor",
            training_period_start=now - timedelta(days=30),
            training_period_end=now,
        )
        assert rules.is_model_active(m) is True
        assert rules.is_training_period_valid(
            m, now - timedelta(days=10), now - timedelta(days=1)
        ) is True
