"""Application services for visual inspection."""

import uuid
from datetime import UTC, datetime

from app.modules.visual_inspection.application.ports import (
    DetectionRepository,
    ImageRepository,
    InspectionRepository,
)
from app.modules.visual_inspection.domain import rules
from app.modules.visual_inspection.domain.entities import (
    DefectDetection,
    ImageAsset,
    Inspection,
    InspectionStatus,
)


class VisualInspectionService:
    def __init__(
        self,
        inspections: InspectionRepository,
        images: ImageRepository | None = None,
        detections: DetectionRepository | None = None,
    ) -> None:
        self.inspections = inspections
        self.images = images
        self.detections = detections

    def create_inspection(
        self,
        project_id: str,
        title: str = "",
        site_id: str = "",
        created_by: str = "",
    ) -> Inspection:
        insp = Inspection(
            id=str(uuid.uuid4()),
            project_id=project_id,
            site_id=site_id,
            title=title,
            status=InspectionStatus.PENDING,
            created_by=created_by,
            created_at=datetime.now(UTC),
        )
        return self.inspections.save(insp)

    def list_inspections(
        self, skip: int = 0, limit: int = 100, filters: dict | None = None
    ) -> tuple[list[Inspection], int]:
        return self.inspections.list_inspections(skip, limit, filters or {})

    def attach_image(
        self,
        inspection_id: str,
        storage_key: str,
        filename: str = "",
        content_type: str = "image/jpeg",
        size_bytes: int = 0,
    ) -> ImageAsset:
        if self.images is None:
            raise ValueError("Image repository not configured")
        self.inspections.get_by_id(inspection_id)
        img = ImageAsset(
            id=str(uuid.uuid4()),
            inspection_id=inspection_id,
            storage_key=storage_key,
            filename=filename,
            content_type=content_type,
            size_bytes=size_bytes,
        )
        return self.images.save(img)

    def record_detection(
        self,
        inspection_id: str,
        image_id: str,
        defect_type: str,
        confidence: float,
        bbox: dict | None = None,
    ) -> DefectDetection:
        if self.detections is None:
            raise ValueError("Detection repository not configured")
        det = DefectDetection(
            id=str(uuid.uuid4()),
            image_id=image_id,
            inspection_id=inspection_id,
            defect_type=defect_type,
            confidence=confidence,
            severity=rules.severity_from_confidence(confidence, defect_type),
            bbox=bbox,
        )
        return self.detections.save(det)

    def review_summary(self, inspection_id: str) -> dict:
        insp = self.inspections.get_by_id(inspection_id)
        dets = self.detections.list_for_inspection(inspection_id) if self.detections else []
        worst = rules.worst_severity(dets)
        return {
            "inspection_id": insp.id,
            "status": insp.status.value,
            "detection_count": len(dets),
            "worst_severity": worst.value,
            "needs_rework": rules.needs_rework(dets),
        }
