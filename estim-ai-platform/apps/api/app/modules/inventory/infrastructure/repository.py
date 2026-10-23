"""SQLAlchemy repositories for the inventory module."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.inventory.domain.entities import (
    DemandForecast,
    NotFoundError,
    StockSnapshot,
)
from app.modules.inventory.infrastructure import mappers
from app.modules.inventory.infrastructure.models import (
    DemandForecastModel,
    StockSnapshotModel,
)


class SqlAlchemyStockRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_id(self, snapshot_id: str) -> StockSnapshot:
        model = self.session.get(StockSnapshotModel, uuid.UUID(snapshot_id))
        if model is None:
            raise NotFoundError(f"Snapshot {snapshot_id} not found.")
        return mappers.model_to_snapshot(model)

    def save(self, snapshot: StockSnapshot) -> StockSnapshot:
        merged = self.session.merge(mappers.snapshot_to_model(snapshot))
        self.session.flush()
        return mappers.model_to_snapshot(merged)

    def latest_for(self, material_id: str, site_id: str) -> StockSnapshot | None:
        stmt = (
            select(StockSnapshotModel)
            .where(
                StockSnapshotModel.material_id == material_id, StockSnapshotModel.site_id == site_id
            )
            .order_by(StockSnapshotModel.recorded_at.desc())
            .limit(1)
        )
        row = self.session.execute(stmt).scalar_one_or_none()
        return mappers.model_to_snapshot(row) if row else None

    def list_snapshots(
        self, skip: int = 0, limit: int = 100, filters: dict | None = None
    ) -> tuple[list[StockSnapshot], int]:
        stmt = select(StockSnapshotModel)
        count_stmt = select(func.count(StockSnapshotModel.id))
        for key in ("material_id", "site_id"):
            if filters and filters.get(key):
                col = getattr(StockSnapshotModel, key)
                stmt = stmt.where(col == filters[key])
                count_stmt = count_stmt.where(col == filters[key])
        total = self.session.execute(count_stmt).scalar_one()
        rows = self.session.execute(stmt.offset(skip).limit(limit)).scalars().all()
        return [mappers.model_to_snapshot(r) for r in rows], total


class SqlAlchemyDemandForecastRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_id(self, forecast_id: str) -> DemandForecast:
        model = self.session.get(DemandForecastModel, uuid.UUID(forecast_id))
        if model is None:
            raise NotFoundError(f"Forecast {forecast_id} not found.")
        return mappers.model_to_forecast(model)

    def save(self, forecast: DemandForecast) -> DemandForecast:
        merged = self.session.merge(mappers.forecast_to_model(forecast))
        self.session.flush()
        return mappers.model_to_forecast(merged)

    def list_forecasts(
        self, skip: int = 0, limit: int = 100, filters: dict | None = None
    ) -> tuple[list[DemandForecast], int]:
        stmt = select(DemandForecastModel)
        count_stmt = select(func.count(DemandForecastModel.id))
        for key in ("material_id", "site_id", "status"):
            if filters and filters.get(key):
                col = getattr(DemandForecastModel, key)
                stmt = stmt.where(col == filters[key])
                count_stmt = count_stmt.where(col == filters[key])
        total = self.session.execute(count_stmt).scalar_one()
        rows = self.session.execute(stmt.offset(skip).limit(limit)).scalars().all()
        return [mappers.model_to_forecast(r) for r in rows], total
