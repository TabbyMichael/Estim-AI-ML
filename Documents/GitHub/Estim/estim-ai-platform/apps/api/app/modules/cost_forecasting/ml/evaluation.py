"""Evaluation metrics for cost forecasting (Phase 5.1 ML)."""

from app.shared.ml_base import EvaluationResult


def mape(actual: list[float], predicted: list[float]) -> float:
    """Mean absolute percentage error (fraction, not percent)."""
    errors = [abs(a - p) / a for a, p in zip(actual, predicted, strict=False) if a != 0]
    return sum(errors) / len(errors) if errors else 0.0


def mae(actual: list[float], predicted: list[float]) -> float:
    """Mean absolute error."""
    errors = [abs(a - p) for a, p in zip(actual, predicted, strict=False)]
    return sum(errors) / len(errors) if errors else 0.0


def rmse(actual: list[float], predicted: list[float]) -> float:
    """Root mean squared error."""
    errors = [(a - p) ** 2 for a, p in zip(actual, predicted, strict=False)]
    return (sum(errors) / len(errors)) ** 0.5 if errors else 0.0


def evaluate_forecasts(
    actual: list[float],
    predicted: list[float],
    model_name: str = "cost_forecaster",
    model_version: str = "v1",
    dataset_ref: str = "",
) -> EvaluationResult:
    """Score a batch of predictions and wrap in the standard report."""
    accuracy = 1.0 - mape(actual, predicted)
    return EvaluationResult(
        model_name=model_name,
        model_version=model_version,
        metrics={
            "mape": mape(actual, predicted),
            "mae": mae(actual, predicted),
            "rmse": rmse(actual, predicted),
            "accuracy": max(0.0, accuracy),
        },
        dataset_ref=dataset_ref,
    )
