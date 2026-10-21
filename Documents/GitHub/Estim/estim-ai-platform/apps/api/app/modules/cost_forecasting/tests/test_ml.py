"""ML tests for cost forecasting (Phase 5.1 ML gate)."""

from datetime import UTC, datetime
from decimal import Decimal
from uuid import uuid4

from app.modules.cost_forecasting.domain.entities import (
    CostForecast,
    CostSnapshot,
    ForecastStatus,
    ForecastType,
)
from app.modules.cost_forecasting.ml import evaluation as eval_mod
from app.modules.cost_forecasting.ml import features as feat
from app.modules.cost_forecasting.ml.inference import LightGBMForecaster


def _forecast() -> CostForecast:
    return CostForecast(
        id=str(uuid4()),
        project_id="P",
        forecast_type=ForecastType.PROJECT_TOTAL,
        status=ForecastStatus.DRAFT,
        predicted_amount=Decimal("100"),
        confidence_interval_low=Decimal("90"),
        confidence_interval_high=Decimal("110"),
        model_version="v1",
        created_at=datetime.now(UTC),
        created_by="u",
    )


def _snaps() -> list[CostSnapshot]:
    now = datetime.now(UTC)
    return [
        CostSnapshot(
            id=str(uuid4()), project_id="P", category="m", amount=Decimal("40"), recorded_at=now
        ),
        CostSnapshot(
            id=str(uuid4()), project_id="P", category="l", amount=Decimal("60"), recorded_at=now
        ),
    ]


class TestFeatures:
    def test_vector_shape(self) -> None:
        vec = feat.extract_forecast_features(_forecast(), _snaps())
        assert len(vec) == len(feat.FEATURE_NAMES) == 7
        assert vec[3] == 2.0 and vec[4] == 100.0

    def test_empty_history(self) -> None:
        vec = feat.extract_forecast_features(_forecast(), [])
        assert vec[3] == 0.0 and vec[5] == 0.0


class TestInference:
    def test_heuristic_predict(self) -> None:
        out = LightGBMForecaster().predict(_forecast(), _snaps())
        assert out["predicted_amount"] > 0
        assert out["confidence_low"] <= out["predicted_amount"]
        assert out["confidence_high"] >= out["predicted_amount"]

    def test_health(self) -> None:
        assert LightGBMForecaster().health()["ready"] is True


class TestEvaluation:
    def test_metrics(self) -> None:
        rep = eval_mod.evaluate_forecasts([100.0, 200.0], [110.0, 190.0])
        assert rep.metrics["mape"] > 0
        assert rep.metrics["accuracy"] > 0.9
