"""Ports for visual inspection."""

from __future__ import annotations

from typing import Protocol

from app.modules.visual_inspection.domain.entities import (
    DefectDetection,
    ImageAsset,
    Inspection,
)


class InspectionRepository(Protocol):
    def get_by_id(self, inspection_id: str) -> Inspection: ...
    def save(self, inspection: Inspection) -> Inspection: ...
    def list_inspections(
        self, skip: int = 0, limit: int = 100, filters: dict | None = None
    ) -> tuple[list[Inspection], int]: ...


class ImageRepository(Protocol):
    def save(self, image: ImageAsset) -> ImageAsset: ...
    def list_for_inspection(self, inspection_id: str) -> list[ImageAsset]: ...


class DetectionRepository(Protocol):
    def save(self, detection: DefectDetection) -> DefectDetection: ...
    def list_for_inspection(
        self, inspection_id: str
    ) -> list[DefectDetection]: ...
