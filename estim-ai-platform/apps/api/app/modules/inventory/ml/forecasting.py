"""Demand forecasting ML: features, inference, evaluation."""

from decimal import Decimal
from typing import Any

from app.shared.ml_base import EvaluationResult

FEATURE_NAMES = [
    "recent_mean",
    "recent_max",
    "recent_min",
    "trend_slope",
    "history_len",
    "horizon_days",
]

MODEL_NAME = "demand_forecaster"
MODEL_VERSION = "v1"


def extract_demand_features(history: list[Decimal], horizon_days: int = 30) -> list[float]:
    vals = [float(v) for v in history]
    if not vals:
        return [0.0, 0.0, 0.0, 0.0, 0.0, float(horizon_days)]
    n = len(vals)
    slope = (vals[-1] - vals[0]) / n if n > 1 else 0.0
    return [sum(vals) / n, max(vals), min(vals), slope, float(n), float(horizon_days)]


class DemandForecaster:
    model_name: str = MODEL_NAME
    model_version: str = MODEL_VERSION

    def __init__(self, model_version: str = MODEL_VERSION) -> None:
        self.model_version = model_version
        self._booster: Any = None

    def attach_booster(self, booster: object) -> None:
        self._booster = booster

    def predict(self, history: list[Decimal], horizon_days: int = 30) -> dict[str, float]:
        features = extract_demand_features(history, horizon_days)
        if self._booster is not None:
            try:
                predicted = float(self._booster.predict([features])[0])
            except Exception:  # noqa: BLE001
                predicted = self._heuristic(features)
        else:
            predicted = self._heuristic(features)
        predicted = max(0.0, predicted)
        band = predicted * 0.15 + 1.0
        return {
            "predicted_quantity": predicted,
            "confidence_low": max(0.0, predicted - band),
            "confidence_high": predicted + band,
        }

    def _heuristic(self, features: list[float]) -> float:
        mean, _mx, _mn, slope, _n, horizon = features
        return max(0.0, (mean + slope * horizon / 2) * horizon / 30)

    def score(self, item: tuple[list[Decimal], int]) -> float:
        history, horizon = item
        return self.predict(history, horizon)["predicted_quantity"]

    def health(self) -> dict:
        return {
            "model_name": self.model_name,
            "model_version": self.model_version,
            "backend": "lightgbm" if self._booster else "heuristic",
            "ready": True,
        }


def evaluate_demand(
    actual: list[float],
    predicted: list[float],
    model_version: str = MODEL_VERSION,
) -> EvaluationResult:
    errors = [abs(a - p) / a for a, p in zip(actual, predicted, strict=False) if a]
    mape = sum(errors) / len(errors) if errors else 0.0
    mae_list = [abs(a - p) for a, p in zip(actual, predicted, strict=False)]
    mae = sum(mae_list) / len(mae_list) if mae_list else 0.0
    return EvaluationResult(
        model_name=MODEL_NAME,
        model_version=model_version,
        metrics={"mape": mape, "mae": mae, "accuracy": max(0.0, 1.0 - mape)},
    )
