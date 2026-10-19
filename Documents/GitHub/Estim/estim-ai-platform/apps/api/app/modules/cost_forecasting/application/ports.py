"""
Interface definitions (ports) for the cost forecasting module.

This module defines Protocol interfaces for external dependencies.
These interfaces allow the cost forecasting module to depend on abstractions
rather than concrete implementations, enabling testability and modularity.
"""

from __future__ import annotations

from typing import Protocol

from app.modules.cost_forecasting.domain.entities import (
    CostForecast,
    CostSnapshot,
    ForecastModel,
)


class CostForecastRepository(Protocol):
    """Interface for cost forecast persistence."""

    def get_by_id(self, forecast_id: str) -> CostForecast:
        """Retrieve a cost forecast by ID."""
        ...

    def save(self, forecast: CostForecast) -> CostForecast:
        """Save a cost forecast (create or update)."""
        ...

    def delete(self, forecast_id: str) -> None:
        """Delete a cost forecast by ID."""
        ...

    def list_forecasts(
        self, skip: int = 0, limit: int = 100, filters: dict | None = None
    ) -> tuple[list[CostForecast], int]:
        """List cost forecasts with pagination and filters."""
        ...

    def exists_for_project_type(
        self, project_id: str, forecast_type: str
    ) -> bool:
        """Check if a forecast exists for the project and type."""
        ...


class CostSnapshotRepository(Protocol):
    """Interface for cost snapshot persistence."""

    def get_by_id(self, snapshot_id: str) -> CostSnapshot:
        """Retrieve a cost snapshot by ID."""
        ...

    def save(self, snapshot: CostSnapshot) -> CostSnapshot:
        """Save a cost snapshot (create or update)."""
        ...

    def list_snapshots(
        self, skip: int = 0, limit: int = 100, filters: dict | None = None
    ) -> tuple[list[CostSnapshot], int]:
        """List cost snapshots with pagination and filters."""
        ...


class ForecastModelRepository(Protocol):
    """Interface for forecast model persistence."""

    def get_by_id(self, model_id: str) -> ForecastModel:
        """Retrieve a forecast model by ID."""
        ...

    def save(self, model: ForecastModel) -> ForecastModel:
        """Save a forecast model (create or update)."""
        ...

    def get_active(self) -> ForecastModel | None:
        """Retrieve the active forecast model."""
        ...

    def list_models(self, skip: int = 0, limit: int = 100) -> tuple[list[ForecastModel], int]:
        """List forecast models with pagination."""
        ...
