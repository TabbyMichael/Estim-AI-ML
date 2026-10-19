"""Maintenance API routes: /maintenance/*."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import NotFoundError as CoreNotFound
from app.modules.maintenance.api.schemas import (
    EquipmentCreate,
    EquipmentListResponse,
    EquipmentResponse,
    MaintenanceLogCreate,
    PredictionCreate,
    PredictionResponse,
)
from app.modules.maintenance.application.services import MaintenanceService
from app.modules.maintenance.domain import entities as domain_errors
from app.modules.maintenance.infrastructure.repository import (
    SqlAlchemyEquipmentRepository,
    SqlAlchemyFailurePredictionRepository,
    SqlAlchemyMaintenanceRecordRepository,
)

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


def _service(db: Session = Depends(get_db)) -> MaintenanceService:
    return MaintenanceService(
        equipment=SqlAlchemyEquipmentRepository(db),
        records=SqlAlchemyMaintenanceRecordRepository(db),
        predictions=SqlAlchemyFailurePredictionRepository(db),
    )


@router.post("/equipment", response_model=EquipmentResponse,
             status_code=status.HTTP_201_CREATED)
def register_equipment(
    body: EquipmentCreate, svc: MaintenanceService = Depends(_service),
    db: Session = Depends(get_db),
) -> EquipmentResponse:
    eq = svc.register_equipment(body.name, body.equipment_type, body.site_id)
    db.commit()
    return EquipmentResponse.from_entity(eq)


@router.get("/equipment", response_model=EquipmentListResponse)
def list_equipment(
    skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=1000),
    site_id: str | None = Query(None), status_filter: str | None = Query(
        None, alias="status"),
    svc: MaintenanceService = Depends(_service),
) -> EquipmentListResponse:
    filters = {k: v for k, v in
               {"site_id": site_id, "status": status_filter}.items() if v}
    items, total = svc.list_equipment(skip, limit, filters)
    return EquipmentListResponse(
        equipment=[EquipmentResponse.from_entity(e) for e in items],
        total=total, skip=skip, limit=limit)


@router.get("/equipment/{equipment_id}", response_model=EquipmentResponse)
def get_equipment(
    equipment_id: str, svc: MaintenanceService = Depends(_service),
) -> EquipmentResponse:
    try:
        return EquipmentResponse.from_entity(
            svc.equipment.get_by_id(equipment_id))
    except domain_errors.NotFoundError as exc:
        raise CoreNotFound(str(exc)) from exc


@router.post("/equipment/{equipment_id}/logs", status_code=status.HTTP_201_CREATED)
def log_maintenance(
    equipment_id: str, body: MaintenanceLogCreate,
    svc: MaintenanceService = Depends(_service),
    db: Session = Depends(get_db),
) -> dict:
    rec = svc.log_maintenance(
        equipment_id, body.maintenance_type, body.description,
        body.performed_by, body.downtime_hours, body.cost)
    db.commit()
    return {"id": rec.id, "equipment_id": rec.equipment_id,
            "maintenance_type": rec.maintenance_type.value}


@router.post("/equipment/{equipment_id}/predictions",
             response_model=PredictionResponse,
             status_code=status.HTTP_201_CREATED)
def record_prediction(
    equipment_id: str, body: PredictionCreate,
    svc: MaintenanceService = Depends(_service),
    db: Session = Depends(get_db),
) -> PredictionResponse:
    try:
        pred = svc.record_prediction(
            equipment_id, body.failure_probability, body.horizon_days)
    except domain_errors.NotFoundError as exc:
        raise CoreNotFound(str(exc)) from exc
    db.commit()
    return PredictionResponse.from_entity(pred)


@router.get("/equipment/{equipment_id}/health")
def health_report(
    equipment_id: str, svc: MaintenanceService = Depends(_service),
) -> dict:
    try:
        return svc.health_report(equipment_id)
    except domain_errors.NotFoundError as exc:
        raise CoreNotFound(str(exc)) from exc
