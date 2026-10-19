"""Pydantic schemas for the inventory API."""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

from app.modules.inventory.domain.entities import DemandForecast, StockSnapshot


class StockSnapshotCreate(BaseModel):
    material_id: str = Field(..., min_length=1)
    site_id: str = Field(..., min_length=1)
    quantity_on_hand: Decimal = Field(..., ge=0)
    unit: str = Field("units")
    recorded_at: Optional[datetime] = None
    reorder_point: Decimal = Field(Decimal("0"), ge=0)
    metadata: dict = Field(default_factory=dict)


class StockSnapshotResponse(BaseModel):
    id: str
    material_id: str
    site_id: str
    quantity_on_hand: Decimal
    unit: str
    recorded_at: datetime
    reorder_point: Decimal
    metadata: dict

    @classmethod
    def from_entity(cls, s: StockSnapshot) -> "StockSnapshotResponse":
        return cls(id=s.id, material_id=s.material_id, site_id=s.site_id,
                   quantity_on_hand=s.quantity_on_hand, unit=s.unit,
                   recorded_at=s.recorded_at, reorder_point=s.reorder_point,
                   metadata=s.metadata)


class StockSnapshotListResponse(BaseModel):
    snapshots: list[StockSnapshotResponse]
    total: int
    skip: int
    limit: int


class DemandForecastCreate(BaseModel):
    material_id: str = Field(..., min_length=1)
    site_id: str = Field(..., min_length=1)
    forecast_type: str = Field(..., min_length=1)
    predicted_quantity: Decimal = Field(..., ge=0)
    confidence_low: Decimal = Field(..., ge=0)
    confidence_high: Decimal = Field(..., ge=0)
    horizon_days: int = Field(30, gt=0)
    model_version: str = Field("v1")
    created_by: str = Field(..., min_length=1)


class DemandForecastResponse(BaseModel):
    id: str
    material_id: str
    site_id: str
    forecast_type: str
    status: str
    predicted_quantity: Decimal
    confidence_low: Decimal
    confidence_high: Decimal
    horizon_days: int
    model_version: str
    created_at: datetime
    created_by: str
    approved_by: Optional[str] = None
    notes: Optional[str] = None

    @classmethod
    def from_entity(cls, f: DemandForecast) -> "DemandForecastResponse":
        return cls(id=f.id, material_id=f.material_id, site_id=f.site_id,
                   forecast_type=f.forecast_type, status=f.status.value,
                   predicted_quantity=f.predicted_quantity,
                   confidence_low=f.confidence_low,
                   confidence_high=f.confidence_high,
                   horizon_days=f.horizon_days, model_version=f.model_version,
                   created_at=f.created_at, created_by=f.created_by,
                   approved_by=f.approved_by, notes=f.notes)


class DemandForecastListResponse(BaseModel):
    forecasts: list[DemandForecastResponse]
    total: int
    skip: int
    limit: int


class DemandForecastFilters(BaseModel):
    material_id: Optional[str] = None
    site_id: Optional[str] = None
    status: Optional[str] = None
