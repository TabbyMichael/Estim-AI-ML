"""Mappers for visual inspection."""

import uuid
from datetime import UTC, datetime

from app.modules.visual_inspection.domain.entities import (
    DefectDetection,
    DefectSeverity,
    ImageAsset,
    Inspection,
    InspectionStatus,
)
from app.modules.visual_inspection.infrastructure.models import (
    DefectDetectionModel,
    ImageAssetModel,
    InspectionModel,
)


def _tz(v: datetime | None) -> datetime | None:
    if v is None:
        return None
    return v if v.tzinfo else v.replace(tzinfo=UTC)


def inspection_to_model(i: Inspection) -> InspectionModel:
    return InspectionModel(
        id=uuid.UUID(i.id), project_id=i.project_id, site_id=i.site_id,
        title=i.title, status=i.status.value, created_by=i.created_by,
        created_at=i.created_at, reviewed_by=i.reviewed_by,
        reviewed_at=i.reviewed_at)


def model_to_inspection(m: InspectionModel) -> Inspection:
    created = _tz(m.created_at)
    assert created is not None
    return Inspection(
        id=str(m.id), project_id=m.project_id, site_id=m.site_id,
        title=m.title, status=InspectionStatus(m.status),
        created_by=m.created_by, created_at=created,
        reviewed_by=m.reviewed_by, reviewed_at=_tz(m.reviewed_at))


def image_to_model(img: ImageAsset) -> ImageAssetModel:
    return ImageAssetModel(
        id=uuid.UUID(img.id), inspection_id=img.inspection_id,
        storage_key=img.storage_key, filename=img.filename,
        content_type=img.content_type, size_bytes=img.size_bytes,
        uploaded_at=img.uploaded_at)


def model_to_image(m: ImageAssetModel) -> ImageAsset:
    uploaded = _tz(m.uploaded_at)
    assert uploaded is not None
    return ImageAsset(
        id=str(m.id), inspection_id=m.inspection_id,
        storage_key=m.storage_key, filename=m.filename,
        content_type=m.content_type, size_bytes=m.size_bytes,
        uploaded_at=uploaded)


def detection_to_model(d: DefectDetection) -> DefectDetectionModel:
    return DefectDetectionModel(
        id=uuid.UUID(d.id), image_id=d.image_id,
        inspection_id=d.inspection_id, defect_type=d.defect_type,
        confidence=d.confidence, severity=d.severity.value, bbox=d.bbox,
        model_version=d.model_version, created_at=d.created_at)


def model_to_detection(m: DefectDetectionModel) -> DefectDetection:
    created = _tz(m.created_at)
    assert created is not None
    return DefectDetection(
        id=str(m.id), image_id=m.image_id, inspection_id=m.inspection_id,
        defect_type=m.defect_type, confidence=m.confidence,
        severity=DefectSeverity(m.severity), bbox=m.bbox,
        model_version=m.model_version, created_at=created)
