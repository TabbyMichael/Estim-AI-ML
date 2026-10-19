"""Entity <-> model mappers for the cost forecasting module."""

import uuid
from datetime import UTC, datetime
from decimal import Decimal

from app.modules.cost_forecasting.domain.entities import (
    CostForecast,
    CostSnapshot,
    ForecastModel,
    ForecastStatus,
    ForecastType,
)
from app.modules.cost_forecasting.infrastructure.models import (
    CostForecastModel,
    CostSnapshotModel,
    ForecastModelModel,
)


def forecast_to_model(forecast: CostForecast) -> CostForecastModel:
    return CostForecastModel(
        id=uuid.UUID(forecast.id),
        project_id=forecast.project_id,
        forecast_type=forecast.forecast_type.value,
        status=forecast.status.value,
        predicted_amount=float(forecast.predicted_amount),
        confidence_interval_low=float(forecast.confidence_interval_low),
        confidence_interval_high=float(forecast.confidence_interval_high),
        model_version=forecast.model_version,
        created_at=forecast.created_at,
        created_by=forecast.created_by,
        actual_amount=(
            float(forecast.actual_amount)
            if forecast.actual_amount is not None
            else None
        ),
        variance=float(forecast.variance) if forecast.variance is not None else None,
        accuracy_score=forecast.accuracy_score,
        approved_by=forecast.approved_by,
        approved_at=forecast.approved_at,
        notes=forecast.notes,
    )


def model_to_forecast(model: CostForecastModel) -> CostForecast:
    created_at = _ensure_tz(model.created_at)
    assert created_at is not None, "cost_forecasts.created_at must not be null"
    approved_at = _ensure_tz(model.approved_at) if model.approved_at else None
    return CostForecast(
        id=str(model.id),
        project_id=model.project_id,
        forecast_type=ForecastType(model.forecast_type),
        status=ForecastStatus(model.status),
        predicted_amount=Decimal(str(model.predicted_amount)),
        confidence_interval_low=Decimal(str(model.confidence_interval_low)),
        confidence_interval_high=Decimal(str(model.confidence_interval_high)),
        model_version=model.model_version,
        created_at=created_at,
        created_by=model.created_by,
        actual_amount=(
            Decimal(str(model.actual_amount))
            if model.actual_amount is not None
            else None
        ),
        variance=Decimal(str(model.variance)) if model.variance is not None else None,
        accuracy_score=model.accuracy_score,
        approved_by=model.approved_by,
        approved_at=approved_at,
        notes=model.notes,
    )


def snapshot_to_model(snapshot: CostSnapshot) -> CostSnapshotModel:
    import json

    return CostSnapshotModel(
        id=uuid.UUID(snapshot.id),
        project_id=snapshot.project_id,
        category=snapshot.category,
        amount=float(snapshot.amount),
        recorded_at=snapshot.recorded_at,
        currency=snapshot.currency,
        snapshot_metadata=json.dumps(snapshot.metadata),
    )


def model_to_snapshot(model: CostSnapshotModel) -> CostSnapshot:
    import json

    recorded_at = _ensure_tz(model.recorded_at)
    assert recorded_at is not None, "cost_snapshots.recorded_at must not be null"
    raw_meta = model.snapshot_metadata
    metadata: dict = json.loads(raw_meta) if isinstance(raw_meta, str) else {}
    return CostSnapshot(
        id=str(model.id),
        project_id=model.project_id,
        category=model.category,
        amount=Decimal(str(model.amount)),
        recorded_at=recorded_at,
        currency=model.currency,
        metadata=metadata,
    )


def forecast_model_to_model(model: ForecastModel) -> ForecastModelModel:
    import json

    return ForecastModelModel(
        id=uuid.UUID(model.id),
        name=model.name,
        version=model.version,
        model_type=model.model_type,
        training_period_start=model.training_period_start,
        training_period_end=model.training_period_end,
        is_active=model.is_active,
        created_at=model.created_at,
        metrics=json.dumps(model.metrics),
    )


def model_to_forecast_model(model: ForecastModelModel) -> ForecastModel:
    import json

    start = _ensure_tz(model.training_period_start)
    end = _ensure_tz(model.training_period_end)
    created = _ensure_tz(model.created_at)
    assert start is not None and end is not None and created is not None, (
        "forecast_models timestamps must not be null"
    )
    raw_metrics = model.metrics
    metrics: dict = json.loads(raw_metrics) if isinstance(raw_metrics, str) else {}
    return ForecastModel(
        id=str(model.id),
        name=model.name,
        version=model.version,
        model_type=model.model_type,
        training_period_start=start,
        training_period_end=end,
        is_active=model.is_active,
        created_at=created,
        metrics=metrics,
    )


def _ensure_tz(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value
