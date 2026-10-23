"""Domain entities for the inventory module.

- StockSnapshot: point-in-time stock level for a material/site.
- DemandForecast: predicted material demand for a future window.
- ReorderRecommendation: suggested purchase to avoid stockout.
"""

from dataclasses import dataclass, field
from datetime import UTC, datetime
from decimal import Decimal
from enum import Enum


class DemandTrend(str, Enum):
    STABLE = "stable"
    RISING = "rising"
    FALLING = "falling"
    SEASONAL = "seasonal"


class ForecastStatus(str, Enum):
    DRAFT = "draft"
    GENERATED = "generated"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUPERSEDED = "superseded"


@dataclass
class StockSnapshot:
    id: str
    material_id: str
    site_id: str
    quantity_on_hand: Decimal
    unit: str = "units"
    recorded_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    reorder_point: Decimal = Decimal("0")
    metadata: dict = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.id:
            raise ValueError("Snapshot ID is required")
        if not self.material_id:
            raise ValueError("Material ID is required")
        if self.quantity_on_hand < 0:
            raise ValueError("Quantity cannot be negative")

    def is_below_reorder(self) -> bool:
        return self.quantity_on_hand <= self.reorder_point


@dataclass
class DemandForecast:
    id: str
    material_id: str
    site_id: str
    forecast_type: str
    status: ForecastStatus
    predicted_quantity: Decimal
    confidence_low: Decimal
    confidence_high: Decimal
    horizon_days: int = 30
    model_version: str = "v1"
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    created_by: str = "system"
    approved_by: str | None = None
    notes: str | None = None

    def __post_init__(self) -> None:
        if not self.id:
            raise ValueError("Forecast ID is required")
        if self.predicted_quantity < 0:
            raise ValueError("Predicted quantity cannot be negative")
        if self.confidence_high < self.confidence_low:
            raise ValueError("Confidence high must be >= low")
        if self.horizon_days <= 0:
            raise ValueError("Horizon must be positive")

    def approve(self, user_id: str) -> None:
        if self.status != ForecastStatus.GENERATED:
            raise InvalidStateError(f"Cannot approve in {self.status.value}")
        self.status = ForecastStatus.APPROVED
        self.approved_by = user_id

    def reject(self) -> None:
        if self.status != ForecastStatus.GENERATED:
            raise InvalidStateError(f"Cannot reject in {self.status.value}")
        self.status = ForecastStatus.REJECTED


@dataclass
class ReorderRecommendation:
    id: str
    material_id: str
    site_id: str
    recommended_quantity: Decimal
    reason: str = ""
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    def __post_init__(self) -> None:
        if self.recommended_quantity < 0:
            raise ValueError("Recommended quantity cannot be negative")


class InvalidStateError(Exception):
    pass


class NotFoundError(Exception):
    pass


class DuplicateForecastError(Exception):
    pass
