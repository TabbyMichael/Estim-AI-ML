"""Repositories for visual inspection."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.visual_inspection.domain.entities import (
    DefectDetection,
    ImageAsset,
    Inspection,
    NotFoundError,
)
from app.modules.visual_inspection.infrastructure import mappers
from app.modules.visual_inspection.infrastructure.models import (
    DefectDetectionModel,
    ImageAssetModel,
    InspectionModel,
)


class SqlAlchemyInspectionRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_id(self, inspection_id: str) -> Inspection:
        m = self.session.get(InspectionModel, uuid.UUID(inspection_id))
        if m is None:
            raise NotFoundError(f"Inspection {inspection_id} not found.")
        return mappers.model_to_inspection(m)

    def save(self, inspection: Inspection) -> Inspection:
        merged = self.session.merge(mappers.inspection_to_model(inspection))
        self.session.flush()
        return mappers.model_to_inspection(merged)

    def list_inspections(
        self, skip: int = 0, limit: int = 100, filters: dict | None = None
    ) -> tuple[list[Inspection], int]:
        stmt = select(InspectionModel)
        count_stmt = select(func.count(InspectionModel.id))
        for key in ("project_id", "status"):
            if filters and filters.get(key):
                col = getattr(InspectionModel, key)
                stmt = stmt.where(col == filters[key])
                count_stmt = count_stmt.where(col == filters[key])
        total = self.session.execute(count_stmt).scalar_one()
        rows = self.session.execute(stmt.offset(skip).limit(limit)).scalars()
        return [mappers.model_to_inspection(r) for r in rows], total


class SqlAlchemyImageRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def save(self, image: ImageAsset) -> ImageAsset:
        merged = self.session.merge(mappers.image_to_model(image))
        self.session.flush()
        return mappers.model_to_image(merged)

    def list_for_inspection(self, inspection_id: str) -> list[ImageAsset]:
        stmt = select(ImageAssetModel).where(
            ImageAssetModel.inspection_id == inspection_id)
        rows = self.session.execute(stmt).scalars().all()
        return [mappers.model_to_image(r) for r in rows]


class SqlAlchemyDetectionRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def save(self, detection: DefectDetection) -> DefectDetection:
        merged = self.session.merge(mappers.detection_to_model(detection))
        self.session.flush()
        return mappers.model_to_detection(merged)

    def list_for_inspection(self, inspection_id: str) -> list[DefectDetection]:
        stmt = select(DefectDetectionModel).where(
            DefectDetectionModel.inspection_id == inspection_id)
        rows = self.session.execute(stmt).scalars().all()
        return [mappers.model_to_detection(r) for r in rows]
