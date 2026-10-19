# mypy: ignore-errors
"""Visual inspection API routes: /visual-inspection/*."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import NotFoundError as CoreNotFound
from app.modules.visual_inspection.api.schemas import (
    DetectionCreate,
    DetectionResponse,
    ImageAttachRequest,
    ImageResponse,
    InspectionCreate,
    InspectionListResponse,
    InspectionResponse,
)
from app.modules.visual_inspection.application.services import (
    VisualInspectionService,
)
from app.modules.visual_inspection.domain import entities as domain_errors
from app.modules.visual_inspection.infrastructure.repository import (
    SqlAlchemyDetectionRepository,
    SqlAlchemyImageRepository,
    SqlAlchemyInspectionRepository,
)

router = APIRouter(prefix="/visual-inspection", tags=["visual-inspection"])


def _service(db: Session = Depends(get_db)) -> VisualInspectionService:
    return VisualInspectionService(
        inspections=SqlAlchemyInspectionRepository(db),
        images=SqlAlchemyImageRepository(db),
        detections=SqlAlchemyDetectionRepository(db),
    )


@router.post("/inspections", response_model=InspectionResponse,
             status_code=status.HTTP_201_CREATED)
def create_inspection(
    body: InspectionCreate, svc: VisualInspectionService = Depends(_service),
    db: Session = Depends(get_db),
) -> InspectionResponse:
    insp = svc.create_inspection(body.project_id, body.title, body.site_id,
                                 body.created_by)
    db.commit()
    return InspectionResponse.from_entity(insp)


@router.get("/inspections", response_model=InspectionListResponse)
def list_inspections(
    skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=1000),
    project_id: str | None = Query(None),
    svc: VisualInspectionService = Depends(_service),
) -> InspectionListResponse:
    filters = {"project_id": project_id} if project_id else {}
    items, total = svc.list_inspections(skip, limit, filters)
    return InspectionListResponse(
        inspections=[InspectionResponse.from_entity(i) for i in items],
        total=total, skip=skip, limit=limit)


@router.post("/inspections/{inspection_id}/images",
             response_model=ImageResponse,
             status_code=status.HTTP_201_CREATED)
def attach_image(
    inspection_id: str, body: ImageAttachRequest,
    svc: VisualInspectionService = Depends(_service),
    db: Session = Depends(get_db),
) -> ImageResponse:
    try:
        img = svc.attach_image(inspection_id, body.storage_key, body.filename,
                               body.content_type, body.size_bytes)
    except domain_errors.NotFoundError as exc:
        raise CoreNotFound(str(exc)) from exc
    db.commit()
    return ImageResponse.from_entity(img)


@router.post("/inspections/{inspection_id}/detections",
             response_model=DetectionResponse,
             status_code=status.HTTP_201_CREATED)
def record_detection(
    inspection_id: str, body: DetectionCreate,
    svc: VisualInspectionService = Depends(_service),
    db: Session = Depends(get_db),
) -> DetectionResponse:
    det = svc.record_detection(inspection_id, body.image_id,
                               body.defect_type, body.confidence, body.bbox)
    db.commit()
    return DetectionResponse.from_entity(det)


@router.get("/inspections/{inspection_id}/summary")
def review_summary(
    inspection_id: str, svc: VisualInspectionService = Depends(_service),
) -> dict:
    try:
        return svc.review_summary(inspection_id)
    except domain_errors.NotFoundError as exc:
        raise CoreNotFound(str(exc)) from exc
