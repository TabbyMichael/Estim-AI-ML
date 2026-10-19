"""Inventory API routes: /inventory/*."""

from decimal import Decimal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import BadRequestError
from app.core.exceptions import NotFoundError as CoreNotFound
from app.modules.inventory.api.schemas import (
    DemandForecastCreate,
    DemandForecastFilters,
    DemandForecastListResponse,
    DemandForecastResponse,
    StockSnapshotCreate,
    StockSnapshotListResponse,
    StockSnapshotResponse,
)
from app.modules.inventory.application.services import InventoryService
from app.modules.inventory.domain import entities as domain_errors
from app.modules.inventory.infrastructure.repository import (
    SqlAlchemyDemandForecastRepository,
    SqlAlchemyStockRepository,
)

router = APIRouter(prefix="/inventory", tags=["inventory"])


def _service(db: Session = Depends(get_db)) -> InventoryService:
    return InventoryService(
        stock=SqlAlchemyStockRepository(db),
        forecasts=SqlAlchemyDemandForecastRepository(db),
    )


def _translate(exc: Exception) -> Exception:
    if isinstance(exc, domain_errors.NotFoundError):
        return CoreNotFound(str(exc))
    if isinstance(exc, domain_errors.InvalidStateError):
        return BadRequestError(str(exc))
    return exc


@router.post("/snapshots", response_model=StockSnapshotResponse,
             status_code=status.HTTP_201_CREATED)
def create_snapshot(
    body: StockSnapshotCreate,
    svc: InventoryService = Depends(_service),
    db: Session = Depends(get_db),
) -> StockSnapshotResponse:
    snap = svc.record_snapshot(body)
    db.commit()
    return StockSnapshotResponse.from_entity(snap)


@router.get("/snapshots", response_model=StockSnapshotListResponse)
def list_snapshots(
    skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=1000),
    material_id: str | None = Query(None), site_id: str | None = Query(None),
    svc: InventoryService = Depends(_service),
) -> StockSnapshotListResponse:
    filters = {k: v for k, v in
               {"material_id": material_id, "site_id": site_id}.items() if v}
    snaps, total = svc.list_snapshots(skip, limit, filters)
    return StockSnapshotListResponse(
        snapshots=[StockSnapshotResponse.from_entity(s) for s in snaps],
        total=total, skip=skip, limit=limit)


@router.post("/forecasts", response_model=DemandForecastResponse,
             status_code=status.HTTP_201_CREATED)
def create_forecast(
    body: DemandForecastCreate,
    svc: InventoryService = Depends(_service),
    db: Session = Depends(get_db),
) -> DemandForecastResponse:
    try:
        forecast = svc.create_forecast(body)
    except Exception as exc:  # noqa: BLE001
        raise _translate(exc) from exc
    db.commit()
    return DemandForecastResponse.from_entity(forecast)


@router.get("/forecasts", response_model=DemandForecastListResponse)
def list_forecasts(
    skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=1000),
    material_id: str | None = Query(None), site_id: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    svc: InventoryService = Depends(_service),
) -> DemandForecastListResponse:
    filters = DemandForecastFilters(material_id=material_id, site_id=site_id,
                                    status=status_filter)
    forecasts, total = svc.list_forecasts(skip, limit, filters)
    return DemandForecastListResponse(
        forecasts=[DemandForecastResponse.from_entity(f) for f in forecasts],
        total=total, skip=skip, limit=limit)


@router.post("/forecasts/{forecast_id}/generate",
             response_model=DemandForecastResponse)
def generate_forecast(
    forecast_id: str, svc: InventoryService = Depends(_service),
    db: Session = Depends(get_db),
) -> DemandForecastResponse:
    try:
        forecast = svc.generate_forecast(forecast_id)
    except Exception as exc:  # noqa: BLE001
        raise _translate(exc) from exc
    db.commit()
    return DemandForecastResponse.from_entity(forecast)


@router.post("/forecasts/{forecast_id}/approve",
             response_model=DemandForecastResponse)
def approve_forecast(
    forecast_id: str, approved_by: str = Query(..., min_length=1),
    svc: InventoryService = Depends(_service),
    db: Session = Depends(get_db),
) -> DemandForecastResponse:
    try:
        forecast = svc.approve_forecast(forecast_id, approved_by)
    except Exception as exc:  # noqa: BLE001
        raise _translate(exc) from exc
    db.commit()
    return DemandForecastResponse.from_entity(forecast)


@router.get("/stockout-check")
def stockout_check(
    material_id: str = Query(...), site_id: str = Query(...),
    daily_demand: Decimal = Query(..., ge=0),
    horizon_days: int = Query(14, gt=0),
    svc: InventoryService = Depends(_service),
) -> dict:
    return svc.stockout_check(material_id, site_id, daily_demand, horizon_days)
