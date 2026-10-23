"""Inference adapters for cost forecasting (Phase 5.1 ML).

LightGBMForecaster is the registered ModelAdapter. LightGBM is imported
lazily so the API boots without native libs; when unavailable (or no
trained booster is attached) it falls back to a transparent heuristic
(interval midpoint blended with snapshot trend) so the service layer and
tests never break. Attach a trained booster via `attach_booster()`.
"""

from typing import Any

from app.modules.cost_forecasting.domain.entities import CostForecast, CostSnapshot
from app.modules.cost_forecasting.ml.features import extract_forecast_features

MODEL_NAME = "cost_forecaster"
MODEL_VERSION = "v1"


class LightGBMForecaster:
    """Cost forecast inference adapter (ModelAdapter protocol)."""

    model_name: str = MODEL_NAME
    model_version: str = MODEL_VERSION

    def __init__(self, model_version: str = MODEL_VERSION) -> None:
        self.model_version = model_version
        self._booster: Any = None

    def attach_booster(self, booster: Any) -> None:
        """Attach a trained LightGBM Booster (duck-typed `.predict`)."""
        self._booster = booster

    def predict(
        self, forecast: CostForecast, snapshots: list[CostSnapshot] | None = None
    ) -> dict[str, float]:
        """Predict total cost + interval for one forecast context."""
        features = extract_forecast_features(forecast, snapshots)
        if self._booster is not None:
            try:
                raw = self._booster.predict([features])
                predicted = float(raw[0])
            except Exception:  # noqa: BLE001 - fall back to heuristic
                predicted = self._heuristic(features)
        else:
            predicted = self._heuristic(features)
        width = features[1] or predicted * 0.1
        return {
            "predicted_amount": max(0.0, predicted),
            "confidence_low": max(0.0, predicted - width / 2),
            "confidence_high": predicted + width / 2,
        }

    def _heuristic(self, features: list[float]) -> float:
        predicted, _width, midpoint, count, total, mean, _max = features
        if count == 0:
            return midpoint or predicted
        trend = total / count
        return float(0.6 * midpoint + 0.4 * (trend * max(count, 1.0) ** 0.5))

    def score(self, item: Any) -> float:
        """Return predicted amount for a (forecast, snapshots) pair."""
        forecast, snapshots = item
        return self.predict(forecast, snapshots)["predicted_amount"]

    def health(self) -> dict[str, Any]:
        return {
            "model_name": self.model_name,
            "model_version": self.model_version,
            "backend": "lightgbm" if self._booster is not None else "heuristic",
            "ready": True,
        }
