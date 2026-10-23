"""Ports (interfaces) for the inventory module."""

from __future__ import annotations

from typing import Protocol

from app.modules.inventory.domain.entities import DemandForecast, StockSnapshot


class StockRepository(Protocol):
    def get_by_id(self, snapshot_id: str) -> StockSnapshot: ...
    def save(self, snapshot: StockSnapshot) -> StockSnapshot: ...
    def latest_for(self, material_id: str, site_id: str) -> StockSnapshot | None: ...
    def list_snapshots(
        self, skip: int = 0, limit: int = 100, filters: dict | None = None
    ) -> tuple[list[StockSnapshot], int]: ...


class DemandForecastRepository(Protocol):
    def get_by_id(self, forecast_id: str) -> DemandForecast: ...
    def save(self, forecast: DemandForecast) -> DemandForecast: ...
    def list_forecasts(
        self, skip: int = 0, limit: int = 100, filters: dict | None = None
    ) -> tuple[list[DemandForecast], int]: ...
