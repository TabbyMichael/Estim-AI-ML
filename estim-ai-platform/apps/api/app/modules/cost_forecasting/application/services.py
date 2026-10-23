"""
Application services for the cost forecasting module.

CostForecastingService: CRUD + lifecycle (generate/approve/reject/supersede/record actual).
SnapshotService: manage historical cost snapshots.
ModelService: manage ML forecast model versions.

Services orchestrate domain entities + repositories and translate
external (API/schema) input into domain operations. They raise domain
errors (DuplicateForecastError, NotFoundError, InvalidStateError, ...)
which the API layer maps to HTTP responses.
"""

import uuid
from datetime import UTC, datetime
from decimal import Decimal

from app.modules.cost_forecasting.api.schemas import (
    CostForecastCreate,
    CostForecastFilters,
    CostForecastUpdate,
    CostSnapshotCreate,
    ForecastModelCreate,
)
from app.modules.cost_forecasting.application.ports import (
    CostForecastRepository,
    CostSnapshotRepository,
    ForecastModelRepository,
)
from app.modules.cost_forecasting.domain import rules
from app.modules.cost_forecasting.domain.entities import (
    CostForecast,
    CostSnapshot,
    DuplicateForecastError,
    ForecastModel,
    ForecastStatus,
    ForecastType,
    InvalidStateError,
)


class CostForecastingService:
    def __init__(
        self,
        forecasts: CostForecastRepository,
        snapshots: CostSnapshotRepository | None = None,
        models: ForecastModelRepository | None = None,
    ) -> None:
        self.forecasts = forecasts
        self.snapshots = snapshots
        self.models = models

    def create_forecast(self, request: CostForecastCreate) -> CostForecast:
        if self.forecasts.exists_for_project_type(request.project_id, request.forecast_type.value):
            raise DuplicateForecastError(
                f"Forecast already exists for project {request.project_id} "
                f"type {request.forecast_type.value}"
            )
        now = datetime.now(UTC)
        forecast = CostForecast(
            id=str(uuid.uuid4()),
            project_id=request.project_id,
            forecast_type=ForecastType(request.forecast_type.value),
            status=ForecastStatus.DRAFT,
            predicted_amount=request.predicted_amount,
            confidence_interval_low=request.confidence_interval_low,
            confidence_interval_high=request.confidence_interval_high,
            model_version=request.model_version,
            created_at=now,
            created_by=request.created_by,
        )
        return self.forecasts.save(forecast)

    def get_forecast(self, forecast_id: str) -> CostForecast:
        return self.forecasts.get_by_id(forecast_id)

    def list_forecasts(
        self, skip: int, limit: int, filters: CostForecastFilters
    ) -> tuple[list[CostForecast], int]:
        return self.forecasts.list_forecasts(
            skip=skip,
            limit=limit,
            filters=filters.model_dump(exclude_none=True),
        )

    def update_forecast(self, forecast_id: str, request: CostForecastUpdate) -> CostForecast:
        forecast = self.forecasts.get_by_id(forecast_id)
        if request.predicted_amount is not None:
            forecast.predicted_amount = request.predicted_amount
        if request.confidence_interval_low is not None:
            forecast.confidence_interval_low = request.confidence_interval_low
        if request.confidence_interval_high is not None:
            forecast.confidence_interval_high = request.confidence_interval_high
        if request.model_version is not None:
            forecast.model_version = request.model_version
        if request.notes is not None:
            forecast.notes = request.notes
        return self.forecasts.save(forecast)

    def generate_forecast(self, forecast_id: str) -> CostForecast:
        forecast = self.forecasts.get_by_id(forecast_id)
        if not rules.can_generate_forecast(forecast):
            raise InvalidStateError(
                f"Forecast cannot be generated in {forecast.status.value} state"
            )
        forecast.status = ForecastStatus.GENERATED
        return self.forecasts.save(forecast)

    def approve_forecast(
        self, forecast_id: str, user_id: str, notes: str | None = None
    ) -> CostForecast:
        forecast = self.forecasts.get_by_id(forecast_id)
        if not rules.can_approve_forecast(forecast):
            raise InvalidStateError(f"Forecast cannot be approved in {forecast.status.value} state")
        forecast.approve(user_id, notes=notes)
        return self.forecasts.save(forecast)

    def reject_forecast(
        self, forecast_id: str, user_id: str, notes: str | None = None
    ) -> CostForecast:
        forecast = self.forecasts.get_by_id(forecast_id)
        if not rules.can_reject_forecast(forecast):
            raise InvalidStateError(f"Forecast cannot be rejected in {forecast.status.value} state")
        forecast.reject(user_id, notes=notes)
        return self.forecasts.save(forecast)

    def supersede_forecast(self, forecast_id: str) -> CostForecast:
        forecast = self.forecasts.get_by_id(forecast_id)
        forecast.mark_superseded()
        return self.forecasts.save(forecast)

    def record_actual(self, forecast_id: str, actual_amount: Decimal) -> CostForecast:
        forecast = self.forecasts.get_by_id(forecast_id)
        forecast.record_actual(actual_amount)
        return self.forecasts.save(forecast)


class CostSnapshotService:
    def __init__(self, snapshots: CostSnapshotRepository) -> None:
        self.snapshots = snapshots

    def create_snapshot(self, request: CostSnapshotCreate) -> CostSnapshot:
        now = datetime.now(UTC)
        snapshot = CostSnapshot(
            id=str(uuid.uuid4()),
            project_id=request.project_id,
            category=request.category,
            amount=request.amount,
            recorded_at=request.recorded_at or now,
            currency=request.currency,
            metadata=request.metadata,
        )
        return self.snapshots.save(snapshot)

    def get_snapshot(self, snapshot_id: str) -> CostSnapshot:
        return self.snapshots.get_by_id(snapshot_id)

    def list_snapshots(
        self, skip: int, limit: int, filters: dict | None = None
    ) -> tuple[list[CostSnapshot], int]:
        return self.snapshots.list_snapshots(skip=skip, limit=limit, filters=filters or {})


class ForecastModelService:
    def __init__(self, models: ForecastModelRepository) -> None:
        self.models = models

    def create_model(self, request: ForecastModelCreate) -> ForecastModel:
        now = datetime.now(UTC)
        model = ForecastModel(
            id=str(uuid.uuid4()),
            name=request.name,
            version=request.version,
            model_type=request.model_type,
            training_period_start=request.training_period_start,
            training_period_end=request.training_period_end,
            is_active=request.is_active,
            created_at=now,
            metrics=request.metrics,
        )
        return self.models.save(model)

    def get_model(self, model_id: str) -> ForecastModel:
        return self.models.get_by_id(model_id)

    def get_active_model(self) -> ForecastModel | None:
        return self.models.get_active()

    def list_models(self, skip: int = 0, limit: int = 100) -> tuple[list[ForecastModel], int]:
        return self.models.list_models(skip=skip, limit=limit)

    def activate_model(self, model_id: str) -> ForecastModel:
        model = self.models.get_by_id(model_id)
        # Deactivate all others
        all_models, _ = self.models.list_models(skip=0, limit=1000)
        for m in all_models:
            if m.id != model_id and m.is_active:
                m.deactivate()
                self.models.save(m)
        model.is_active = True
        return self.models.save(model)
