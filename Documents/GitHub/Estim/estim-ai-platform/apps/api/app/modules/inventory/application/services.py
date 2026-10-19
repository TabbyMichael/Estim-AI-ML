"""Application services for the inventory module."""

import uuid
from datetime import UTC, datetime
from decimal import Decimal

from app.modules.inventory.api.schemas import (
    DemandForecastCreate,
    DemandForecastFilters,
    StockSnapshotCreate,
)
from app.modules.inventory.application.ports import (
    DemandForecastRepository,
    StockRepository,
)
from app.modules.inventory.domain import rules
from app.modules.inventory.domain.entities import (
    DemandForecast,
    ForecastStatus,
    InvalidStateError,
    ReorderRecommendation,
    StockSnapshot,
)


class InventoryService:
    def __init__(
        self,
        stock: StockRepository,
        forecasts: DemandForecastRepository | None = None,
    ) -> None:
        self.stock = stock
        self.forecasts = forecasts

    def record_snapshot(self, request: StockSnapshotCreate) -> StockSnapshot:
        snap = StockSnapshot(
            id=str(uuid.uuid4()), material_id=request.material_id,
            site_id=request.site_id, quantity_on_hand=request.quantity_on_hand,
            unit=request.unit, recorded_at=request.recorded_at or datetime.now(UTC),
            reorder_point=request.reorder_point, metadata=request.metadata,
        )
        return self.stock.save(snap)

    def get_snapshot(self, snapshot_id: str) -> StockSnapshot:
        return self.stock.get_by_id(snapshot_id)

    def list_snapshots(
        self, skip: int, limit: int, filters: dict | None = None
    ) -> tuple[list[StockSnapshot], int]:
        return self.stock.list_snapshots(skip=skip, limit=limit,
                                         filters=filters or {})

    def create_forecast(self, request: DemandForecastCreate) -> DemandForecast:
        if self.forecasts is None:
            raise InvalidStateError("Forecast repository not configured")
        forecast = DemandForecast(
            id=str(uuid.uuid4()), material_id=request.material_id,
            site_id=request.site_id, forecast_type=request.forecast_type,
            status=ForecastStatus.DRAFT,
            predicted_quantity=request.predicted_quantity,
            confidence_low=request.confidence_low,
            confidence_high=request.confidence_high,
            horizon_days=request.horizon_days,
            model_version=request.model_version,
            created_at=datetime.now(UTC), created_by=request.created_by,
        )
        return self.forecasts.save(forecast)

    def list_forecasts(
        self, skip: int, limit: int, filters: DemandForecastFilters
    ) -> tuple[list[DemandForecast], int]:
        if self.forecasts is None:
            raise InvalidStateError("Forecast repository not configured")
        return self.forecasts.list_forecasts(
            skip=skip, limit=limit,
            filters=filters.model_dump(exclude_none=True),
        )

    def generate_forecast(self, forecast_id: str) -> DemandForecast:
        if self.forecasts is None:
            raise InvalidStateError("Forecast repository not configured")
        forecast = self.forecasts.get_by_id(forecast_id)
        if not rules.can_generate(forecast):
            raise InvalidStateError(f"Cannot generate in {forecast.status.value}")
        forecast.status = ForecastStatus.GENERATED
        return self.forecasts.save(forecast)

    def approve_forecast(self, forecast_id: str, user_id: str) -> DemandForecast:
        if self.forecasts is None:
            raise InvalidStateError("Forecast repository not configured")
        forecast = self.forecasts.get_by_id(forecast_id)
        forecast.approve(user_id)
        return self.forecasts.save(forecast)

    def stockout_check(
        self, material_id: str, site_id: str, daily_demand: Decimal,
        horizon_days: int = 14,
    ) -> dict:
        latest = self.stock.latest_for(material_id, site_id)
        if latest is None:
            return {"at_risk": True, "reason": "no snapshot"}
        cover = rules.days_of_cover(latest, daily_demand)
        at_risk = rules.is_stockout_risk(latest, daily_demand, horizon_days)
        qty = rules.reorder_quantity(latest, daily_demand, horizon_days)
        rec = ReorderRecommendation(
            id=str(uuid.uuid4()), material_id=material_id, site_id=site_id,
            recommended_quantity=qty,
            reason="below cover threshold" if at_risk else "healthy",
        )
        return {"at_risk": at_risk, "days_of_cover": cover,
                "reorder_quantity": str(qty), "recommendation_id": rec.id}
