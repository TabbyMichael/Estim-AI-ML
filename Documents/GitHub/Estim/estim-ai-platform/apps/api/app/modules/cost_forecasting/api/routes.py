"""Cost forecasting API routes: /cost-forecasting/*."""

from decimal import Decimal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import BadRequestError, ConflictError, EstimException
from app.core.exceptions import NotFoundError as CoreNotFound
from app.modules.cost_forecasting.api.schemas import (
    CostForecastCreate,
    CostForecastFilters,
    CostForecastListResponse,
    CostForecastResponse,
    CostForecastUpdate,
    CostSnapshotCreate,
    CostSnapshotListResponse,
    CostSnapshotResponse,
    ForecastModelCreate,
    ForecastModelListResponse,
    ForecastModelResponse,
    ForecastStatusEnum,
    ForecastTypeEnum,
)
from app.modules.cost_forecasting.application.services import (
    CostForecastingService,
    CostSnapshotService,
    ForecastModelService,
)
from app.modules.cost_forecasting.domain import entities as domain_errors
from app.modules.cost_forecasting.infrastructure.repository import (
    SqlAlchemyCostForecastRepository,
    SqlAlchemyCostSnapshotRepository,
    SqlAlchemyForecastModelRepository,
)

router = APIRouter(prefix="/cost-forecasting", tags=["cost-forecasting"])


def _forecast_service(db: Session = Depends(get_db)) -> CostForecastingService:
    return CostForecastingService(forecasts=SqlAlchemyCostForecastRepository(db))


def _snapshot_service(db: Session = Depends(get_db)) -> CostSnapshotService:
    return CostSnapshotService(snapshots=SqlAlchemyCostSnapshotRepository(db))


def _model_service(db: Session = Depends(get_db)) -> ForecastModelService:
    return ForecastModelService(models=SqlAlchemyForecastModelRepository(db))


def _translate(exc: Exception) -> Exception:
    if isinstance(exc, domain_errors.DuplicateForecastError):
        return ConflictError(str(exc))
    if isinstance(exc, domain_errors.NotFoundError):
        return CoreNotFound(str(exc))
    if isinstance(exc, domain_errors.InvalidStateError):
        return BadRequestError(str(exc))
    if isinstance(exc, EstimException):
        return exc
    return exc


@router.post(
    "/forecasts",
    response_model=CostForecastResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_forecast(
    body: CostForecastCreate,
    svc: CostForecastingService = Depends(_forecast_service),
    db: Session = Depends(get_db),
) -> CostForecastResponse:
    try:
        forecast = svc.create_forecast(body)
    except Exception as exc:  # noqa: BLE001
        raise _translate(exc) from exc
    db.commit()
    return CostForecastResponse.from_entity(forecast)


@router.get("/forecasts", response_model=CostForecastListResponse)
def list_forecasts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    project_id: str | None = Query(None),
    forecast_type: ForecastTypeEnum | None = Query(None),
    status_filter: ForecastStatusEnum | None = Query(None, alias="status"),
    svc: CostForecastingService = Depends(_forecast_service),
) -> CostForecastListResponse:
    filters = CostForecastFilters(
        project_id=project_id,
        forecast_type=forecast_type,
        status=status_filter,
    )
    forecasts, total = svc.list_forecasts(skip=skip, limit=limit, filters=filters)
    return CostForecastListResponse(
        forecasts=[CostForecastResponse.from_entity(f) for f in forecasts],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/forecasts/{forecast_id}", response_model=CostForecastResponse)
def get_forecast(
    forecast_id: str,
    svc: CostForecastingService = Depends(_forecast_service),
) -> CostForecastResponse:
    try:
        return CostForecastResponse.from_entity(svc.get_forecast(forecast_id))
    except Exception as exc:  # noqa: BLE001
        raise _translate(exc) from exc


@router.put("/forecasts/{forecast_id}", response_model=CostForecastResponse)
def update_forecast(
    forecast_id: str,
    body: CostForecastUpdate,
    svc: CostForecastingService = Depends(_forecast_service),
    db: Session = Depends(get_db),
) -> CostForecastResponse:
    try:
        forecast = svc.update_forecast(forecast_id, body)
    except Exception as exc:  # noqa: BLE001
        raise _translate(exc) from exc
    db.commit()
    return CostForecastResponse.from_entity(forecast)


@router.post("/forecasts/{forecast_id}/generate", response_model=CostForecastResponse)
def generate_forecast(
    forecast_id: str,
    svc: CostForecastingService = Depends(_forecast_service),
    db: Session = Depends(get_db),
) -> CostForecastResponse:
    try:
        forecast = svc.generate_forecast(forecast_id)
    except Exception as exc:  # noqa: BLE001
        raise _translate(exc) from exc
    db.commit()
    return CostForecastResponse.from_entity(forecast)


@router.post("/forecasts/{forecast_id}/approve", response_model=CostForecastResponse)
def approve_forecast(
    forecast_id: str,
    approved_by: str = Query(..., min_length=1),
    notes: str | None = Query(None),
    svc: CostForecastingService = Depends(_forecast_service),
    db: Session = Depends(get_db),
) -> CostForecastResponse:
    try:
        forecast = svc.approve_forecast(forecast_id, approved_by, notes=notes)
    except Exception as exc:  # noqa: BLE001
        raise _translate(exc) from exc
    db.commit()
    return CostForecastResponse.from_entity(forecast)


@router.post("/forecasts/{forecast_id}/reject", response_model=CostForecastResponse)
def reject_forecast(
    forecast_id: str,
    rejected_by: str = Query(..., min_length=1),
    notes: str | None = Query(None),
    svc: CostForecastingService = Depends(_forecast_service),
    db: Session = Depends(get_db),
) -> CostForecastResponse:
    try:
        forecast = svc.reject_forecast(forecast_id, rejected_by, notes=notes)
    except Exception as exc:  # noqa: BLE001
        raise _translate(exc) from exc
    db.commit()
    return CostForecastResponse.from_entity(forecast)


@router.post("/forecasts/{forecast_id}/supersede", response_model=CostForecastResponse)
def supersede_forecast(
    forecast_id: str,
    svc: CostForecastingService = Depends(_forecast_service),
    db: Session = Depends(get_db),
) -> CostForecastResponse:
    try:
        forecast = svc.supersede_forecast(forecast_id)
    except Exception as exc:  # noqa: BLE001
        raise _translate(exc) from exc
    db.commit()
    return CostForecastResponse.from_entity(forecast)


@router.post("/forecasts/{forecast_id}/actual", response_model=CostForecastResponse)
def record_actual(
    forecast_id: str,
    actual_amount: Decimal = Query(..., ge=0),
    svc: CostForecastingService = Depends(_forecast_service),
    db: Session = Depends(get_db),
) -> CostForecastResponse:
    try:
        forecast = svc.record_actual(forecast_id, actual_amount)
    except Exception as exc:  # noqa: BLE001
        raise _translate(exc) from exc
    db.commit()
    return CostForecastResponse.from_entity(forecast)


@router.post(
    "/snapshots",
    response_model=CostSnapshotResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_snapshot(
    body: CostSnapshotCreate,
    svc: CostSnapshotService = Depends(_snapshot_service),
    db: Session = Depends(get_db),
) -> CostSnapshotResponse:
    snapshot = svc.create_snapshot(body)
    db.commit()
    return CostSnapshotResponse.from_entity(snapshot)


@router.get("/snapshots", response_model=CostSnapshotListResponse)
def list_snapshots(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    project_id: str | None = Query(None),
    category: str | None = Query(None),
    svc: CostSnapshotService = Depends(_snapshot_service),
) -> CostSnapshotListResponse:
    filters: dict = {}
    if project_id:
        filters["project_id"] = project_id
    if category:
        filters["category"] = category
    snapshots, total = svc.list_snapshots(skip=skip, limit=limit, filters=filters)
    return CostSnapshotListResponse(
        snapshots=[CostSnapshotResponse.from_entity(s) for s in snapshots],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/snapshots/{snapshot_id}", response_model=CostSnapshotResponse)
def get_snapshot(
    snapshot_id: str,
    svc: CostSnapshotService = Depends(_snapshot_service),
) -> CostSnapshotResponse:
    try:
        return CostSnapshotResponse.from_entity(svc.get_snapshot(snapshot_id))
    except Exception as exc:  # noqa: BLE001
        raise _translate(exc) from exc


@router.post(
    "/models",
    response_model=ForecastModelResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_model(
    body: ForecastModelCreate,
    svc: ForecastModelService = Depends(_model_service),
    db: Session = Depends(get_db),
) -> ForecastModelResponse:
    model = svc.create_model(body)
    db.commit()
    return ForecastModelResponse.from_entity(model)


@router.get("/models", response_model=ForecastModelListResponse)
def list_models(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    svc: ForecastModelService = Depends(_model_service),
) -> ForecastModelListResponse:
    models, total = svc.list_models(skip=skip, limit=limit)
    return ForecastModelListResponse(
        models=[ForecastModelResponse.from_entity(m) for m in models],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/models/active", response_model=ForecastModelResponse)
def get_active_model(
    svc: ForecastModelService = Depends(_model_service),
) -> ForecastModelResponse:
    active = svc.get_active_model()
    if active is None:
        raise CoreNotFound("No active forecast model.")
    return ForecastModelResponse.from_entity(active)


@router.get("/models/{model_id}", response_model=ForecastModelResponse)
def get_model(
    model_id: str,
    svc: ForecastModelService = Depends(_model_service),
) -> ForecastModelResponse:
    try:
        return ForecastModelResponse.from_entity(svc.get_model(model_id))
    except Exception as exc:  # noqa: BLE001
        raise _translate(exc) from exc


@router.post("/models/{model_id}/activate", response_model=ForecastModelResponse)
def activate_model(
    model_id: str,
    svc: ForecastModelService = Depends(_model_service),
    db: Session = Depends(get_db),
) -> ForecastModelResponse:
    try:
        model = svc.activate_model(model_id)
    except Exception as exc:  # noqa: BLE001
        raise _translate(exc) from exc
    db.commit()
    return ForecastModelResponse.from_entity(model)
