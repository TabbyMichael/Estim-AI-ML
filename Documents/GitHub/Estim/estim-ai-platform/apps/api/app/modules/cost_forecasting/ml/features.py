"""Feature extraction for cost forecasting (Phase 5.1 ML).

Transforms domain entities (CostForecast, CostSnapshot lists) into
numeric vectors for the LightGBM forecaster. Pure functions + a small
transformer class; no ML-framework import at module load.
"""

from decimal import Decimal

from app.modules.cost_forecasting.domain.entities import CostForecast, CostSnapshot

FEATURE_NAMES = [
    "predicted_amount",
    "interval_width",
    "interval_midpoint",
    "snapshot_count",
    "snapshot_total",
    "snapshot_mean",
    "snapshot_max",
]


def _f(value: Decimal | float | int) -> float:
    return float(value)


def extract_forecast_features(
    forecast: CostForecast, snapshots: list[CostSnapshot] | None = None,
) -> list[float]:
    """Build the model input vector for one forecast + its history."""
    snapshots = snapshots or []
    amounts = [_f(s.amount) for s in snapshots]
    low = _f(forecast.confidence_interval_low)
    high = _f(forecast.confidence_interval_high)
    total = sum(amounts)
    return [
        _f(forecast.predicted_amount),
        high - low,
        (high + low) / 2.0,
        float(len(amounts)),
        total,
        (total / len(amounts)) if amounts else 0.0,
        max(amounts) if amounts else 0.0,
    ]


class CostFeatureTransformer:
    """Stateless transformer satisfying the shared FeatureTransformer protocol."""

    feature_names: list[str] = FEATURE_NAMES

    def transform(
        self, items: list[tuple[CostForecast, list[CostSnapshot]]]
    ) -> list[list[float]]:
        return [extract_forecast_features(f, snaps) for f, snaps in items]
