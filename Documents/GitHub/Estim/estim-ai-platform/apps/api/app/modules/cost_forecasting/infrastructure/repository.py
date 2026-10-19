"""SQLAlchemy repository implementations for the cost forecasting module."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.cost_forecasting.domain.entities import (
    CostForecast,
    CostSnapshot,
    ForecastModel,
    NotFoundError,
)
from app.modules.cost_forecasting.infrastructure import mappers
from app.modules.cost_forecasting.infrastructure.models import (
    CostForecastModel,
    CostSnapshotModel,
    ForecastModelModel,
)


class SqlAlchemyCostForecastRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_id(self, forecast_id: str) -> CostForecast:
        model = self.session.get(CostForecastModel, uuid.UUID(forecast_id))
        if model is None:
            raise NotFoundError(f"Cost forecast {forecast_id} not found.")
        return mappers.model_to_forecast(model)

    def exists_for_project_type(
        self, project_id: str, forecast_type: str
    ) -> bool:
        stmt = select(CostForecastModel.id).where(
            CostForecastModel.project_id == project_id,
            CostForecastModel.forecast_type == forecast_type,
        )
        return self.session.execute(stmt).scalar_one_or_none() is not None

    def save(self, forecast: CostForecast) -> CostForecast:
        model = mappers.forecast_to_model(forecast)
        merged = self.session.merge(model)
        self.session.flush()
        return mappers.model_to_forecast(merged)

    def delete(self, forecast_id: str) -> None:
        model = self.session.get(CostForecastModel, uuid.UUID(forecast_id))
        if model is None:
            raise NotFoundError(f"Cost forecast {forecast_id} not found.")
        self.session.delete(model)
        self.session.flush()

    def list_forecasts(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: dict | None = None,
    ) -> tuple[list[CostForecast], int]:
        stmt = select(CostForecastModel)
        count_stmt = select(func.count(CostForecastModel.id))
        if filters:
            if filters.get("project_id"):
                cond = CostForecastModel.project_id == filters["project_id"]
                stmt = stmt.where(cond)
                count_stmt = count_stmt.where(cond)
            if filters.get("forecast_type"):
                cond = CostForecastModel.forecast_type == filters["forecast_type"]
                stmt = stmt.where(cond)
                count_stmt = count_stmt.where(cond)
            if filters.get("status"):
                cond = CostForecastModel.status == filters["status"]
                stmt = stmt.where(cond)
                count_stmt = count_stmt.where(cond)
        total = self.session.execute(count_stmt).scalar_one()
        stmt = stmt.offset(skip).limit(limit)
        models = self.session.execute(stmt).scalars().all()
        return [mappers.model_to_forecast(m) for m in models], total


class SqlAlchemyCostSnapshotRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_id(self, snapshot_id: str) -> CostSnapshot:
        model = self.session.get(CostSnapshotModel, uuid.UUID(snapshot_id))
        if model is None:
            raise NotFoundError(f"Cost snapshot {snapshot_id} not found.")
        return mappers.model_to_snapshot(model)

    def save(self, snapshot: CostSnapshot) -> CostSnapshot:
        model = mappers.snapshot_to_model(snapshot)
        merged = self.session.merge(model)
        self.session.flush()
        return mappers.model_to_snapshot(merged)

    def list_snapshots(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: dict | None = None,
    ) -> tuple[list[CostSnapshot], int]:
        stmt = select(CostSnapshotModel)
        count_stmt = select(func.count(CostSnapshotModel.id))
        if filters:
            if filters.get("project_id"):
                cond = CostSnapshotModel.project_id == filters["project_id"]
                stmt = stmt.where(cond)
                count_stmt = count_stmt.where(cond)
            if filters.get("category"):
                cond = CostSnapshotModel.category == filters["category"]
                stmt = stmt.where(cond)
                count_stmt = count_stmt.where(cond)
        total = self.session.execute(count_stmt).scalar_one()
        stmt = stmt.offset(skip).limit(limit)
        models = self.session.execute(stmt).scalars().all()
        return [mappers.model_to_snapshot(m) for m in models], total


class SqlAlchemyForecastModelRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_id(self, model_id: str) -> ForecastModel:
        model = self.session.get(ForecastModelModel, uuid.UUID(model_id))
        if model is None:
            raise NotFoundError(f"Forecast model {model_id} not found.")
        return mappers.model_to_forecast_model(model)

    def save(self, model: ForecastModel) -> ForecastModel:
        db_model = mappers.forecast_model_to_model(model)
        merged = self.session.merge(db_model)
        self.session.flush()
        return mappers.model_to_forecast_model(merged)

    def get_active(self) -> ForecastModel | None:
        stmt = select(ForecastModelModel).where(
            ForecastModelModel.is_active == True  # noqa: E712
        )
        result = self.session.execute(stmt).scalar_one_or_none()
        if result is None:
            return None
        return mappers.model_to_forecast_model(result)

    def list_models(
        self, skip: int = 0, limit: int = 100
    ) -> tuple[list[ForecastModel], int]:
        stmt = select(ForecastModelModel)
        count_stmt = select(func.count(ForecastModelModel.id))
        total = self.session.execute(count_stmt).scalar_one()
        stmt = stmt.offset(skip).limit(limit)
        models = self.session.execute(stmt).scalars().all()
        return [mappers.model_to_forecast_model(m) for m in models], total
