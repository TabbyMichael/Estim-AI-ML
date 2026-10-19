"""Domain events for the inventory module."""

from dataclasses import dataclass

from app.shared.events import DomainEvent


@dataclass(frozen=True, kw_only=True)
class StockSnapshotRecorded(DomainEvent):
    event_type: str = "inventory.snapshot.recorded"
    snapshot_id: str = ""
    material_id: str = ""
    site_id: str = ""


@dataclass(frozen=True, kw_only=True)
class DemandForecastGenerated(DomainEvent):
    event_type: str = "inventory.forecast.generated"
    forecast_id: str = ""
    material_id: str = ""


@dataclass(frozen=True, kw_only=True)
class StockoutRiskDetected(DomainEvent):
    event_type: str = "inventory.stockout.risk"
    material_id: str = ""
    site_id: str = ""
    days_of_cover: float = 0.0
