"""Repositories for the project risk module."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.project_risk.domain.entities import (
    Milestone,
    NotFoundError,
    RiskPrediction,
)
from app.modules.project_risk.infrastructure import mappers
from app.modules.project_risk.infrastructure.models import (
    MilestoneModel,
    RiskPredictionModel,
)


class SqlAlchemyMilestoneRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_id(self, milestone_id: str) -> Milestone:
        m = self.session.get(MilestoneModel, uuid.UUID(milestone_id))
        if m is None:
            raise NotFoundError(f"Milestone {milestone_id} not found.")
        return mappers.model_to_milestone(m)

    def save(self, milestone: Milestone) -> Milestone:
        merged = self.session.merge(mappers.milestone_to_model(milestone))
        self.session.flush()
        return mappers.model_to_milestone(merged)

    def list_for_project(self, project_id: str) -> list[Milestone]:
        stmt = select(MilestoneModel).where(MilestoneModel.project_id == project_id)
        rows = self.session.execute(stmt).scalars().all()
        return [mappers.model_to_milestone(r) for r in rows]


class SqlAlchemyRiskPredictionRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def save(self, prediction: RiskPrediction) -> RiskPrediction:
        merged = self.session.merge(mappers.prediction_to_model(prediction))
        self.session.flush()
        return mappers.model_to_prediction(merged)

    def list_for_project(
        self, project_id: str, skip: int = 0, limit: int = 100
    ) -> tuple[list[RiskPrediction], int]:
        stmt = select(RiskPredictionModel).where(RiskPredictionModel.project_id == project_id)
        count_stmt = select(func.count(RiskPredictionModel.id)).where(
            RiskPredictionModel.project_id == project_id
        )
        total = self.session.execute(count_stmt).scalar_one()
        rows = self.session.execute(stmt.offset(skip).limit(limit)).scalars()
        return [mappers.model_to_prediction(r) for r in rows], total
