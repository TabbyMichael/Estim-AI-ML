"""Pydantic schemas for visual inspection."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.modules.visual_inspection.domain.entities import (
    DefectDetection,
    ImageAsset,
    Inspection,
)


class InspectionCreate(BaseModel):
    project_id: str = Field(..., min_length=1)
    title: str = Field("")
    site_id: str = Field("")
    created_by: str = Field("")


class InspectionResponse(BaseModel):
    id: str
    project_id: str
    site_id: str
    title: str
    status: str
    created_by: str
    created_at: datetime

    @classmethod
    def from_entity(cls, i: Inspection) -> "InspectionResponse":
        return cls(
            id=i.id,
            project_id=i.project_id,
            site_id=i.site_id,
            title=i.title,
            status=i.status.value,
            created_by=i.created_by,
            created_at=i.created_at,
        )


class InspectionListResponse(BaseModel):
    inspections: list[InspectionResponse]
    total: int
    skip: int
    limit: int


class ImageAttachRequest(BaseModel):
    storage_key: str = Field(..., min_length=1)
    filename: str = Field("")
    content_type: str = Field("image/jpeg")
    size_bytes: int = Field(0, ge=0)


class ImageResponse(BaseModel):
    id: str
    inspection_id: str
    storage_key: str
    filename: str
    content_type: str
    size_bytes: int

    @classmethod
    def from_entity(cls, img: ImageAsset) -> "ImageResponse":
        return cls(
            id=img.id,
            inspection_id=img.inspection_id,
            storage_key=img.storage_key,
            filename=img.filename,
            content_type=img.content_type,
            size_bytes=img.size_bytes,
        )


class DetectionCreate(BaseModel):
    image_id: str = Field(..., min_length=1)
    defect_type: str = Field(..., min_length=1)
    confidence: float = Field(..., ge=0, le=1)
    bbox: dict | None = None


class DetectionResponse(BaseModel):
    id: str
    image_id: str
    inspection_id: str
    defect_type: str
    confidence: float
    severity: str

    @classmethod
    def from_entity(cls, d: DefectDetection) -> "DetectionResponse":
        return cls(
            id=d.id,
            image_id=d.image_id,
            inspection_id=d.inspection_id,
            defect_type=d.defect_type,
            confidence=d.confidence,
            severity=d.severity.value,
        )
