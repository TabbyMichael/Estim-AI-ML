"""Ports for the project risk module."""

from __future__ import annotations

from typing import Protocol

from app.modules.project_risk.domain.entities import Milestone, RiskPrediction


class MilestoneRepository(Protocol):
    def get_by_id(self, milestone_id: str) -> Milestone: ...
    def save(self, milestone: Milestone) -> Milestone: ...
    def list_for_project(self, project_id: str) -> list[Milestone]: ...


class RiskPredictionRepository(Protocol):
    def save(self, prediction: RiskPrediction) -> RiskPrediction: ...
    def list_for_project(
        self, project_id: str, skip: int = 0, limit: int = 100
    ) -> tuple[list[RiskPrediction], int]: ...
