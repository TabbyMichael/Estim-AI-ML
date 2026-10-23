"""Entity <-> model mappers for the inventory module."""

import json
import uuid
from datetime import UTC, datetime
from decimal import Decimal

from app.modules.inventory.domain.entities import (
    DemandForecast,
    ForecastStatus,
    StockSnapshot,
)
from app.modules.inventory.infrastructure.models import (
    DemandForecastModel,
    StockSnapshotModel,
)


def _tz(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def snapshot_to_model(s: StockSnapshot) -> StockSnapshotModel:
    return StockSnapshotModel(
        id=uuid.UUID(s.id),
        material_id=s.material_id,
        site_id=s.site_id,
        quantity_on_hand=float(s.quantity_on_hand),
        unit=s.unit,
        recorded_at=s.recorded_at,
        reorder_point=float(s.reorder_point),
        snapshot_metadata=json.dumps(s.metadata),
    )


def model_to_snapshot(m: StockSnapshotModel) -> StockSnapshot:
    recorded = _tz(m.recorded_at)
    assert recorded is not None
    raw = m.snapshot_metadata
    meta: dict = json.loads(raw) if isinstance(raw, str) else {}
    return StockSnapshot(
        id=str(m.id),
        material_id=m.material_id,
        site_id=m.site_id,
        quantity_on_hand=Decimal(str(m.quantity_on_hand)),
        unit=m.unit,
        recorded_at=recorded,
        reorder_point=Decimal(str(m.reorder_point)),
        metadata=meta,
    )


def forecast_to_model(f: DemandForecast) -> DemandForecastModel:
    return DemandForecastModel(
        id=uuid.UUID(f.id),
        material_id=f.material_id,
        site_id=f.site_id,
        forecast_type=f.forecast_type,
        status=f.status.value,
        predicted_quantity=float(f.predicted_quantity),
        confidence_low=float(f.confidence_low),
        confidence_high=float(f.confidence_high),
        horizon_days=f.horizon_days,
        model_version=f.model_version,
        created_at=f.created_at,
        created_by=f.created_by,
        approved_by=f.approved_by,
        notes=f.notes,
    )


def model_to_forecast(m: DemandForecastModel) -> DemandForecast:
    created = _tz(m.created_at)
    assert created is not None
    return DemandForecast(
        id=str(m.id),
        material_id=m.material_id,
        site_id=m.site_id,
        forecast_type=m.forecast_type,
        status=ForecastStatus(m.status),
        predicted_quantity=Decimal(str(m.predicted_quantity)),
        confidence_low=Decimal(str(m.confidence_low)),
        confidence_high=Decimal(str(m.confidence_high)),
        horizon_days=m.horizon_days,
        model_version=m.model_version,
        created_at=created,
        created_by=m.created_by,
        approved_by=m.approved_by,
        notes=m.notes,
    )
