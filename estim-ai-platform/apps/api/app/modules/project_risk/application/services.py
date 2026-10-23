"""Application services for the project risk module."""

import uuid
from datetime import datetime

from app.modules.project_risk.application.ports import (
    MilestoneRepository,
    RiskPredictionRepository,
)
from app.modules.project_risk.domain import rules
from app.modules.project_risk.domain.entities import (
    Milestone,
    MilestoneStatus,
    RiskPrediction,
)


class ProjectRiskService:
    def __init__(
        self,
        milestones: MilestoneRepository,
        predictions: RiskPredictionRepository | None = None,
    ) -> None:
        self.milestones = milestones
        self.predictions = predictions

    def track_milestone(
        self,
        project_id: str,
        name: str,
        planned_start: datetime,
        planned_end: datetime,
        status: str = MilestoneStatus.NOT_STARTED.value,
    ) -> Milestone:
        ms = Milestone(
            id=str(uuid.uuid4()),
            project_id=project_id,
            name=name,
            planned_start=planned_start,
            planned_end=planned_end,
            status=MilestoneStatus(status),
        )
        return self.milestones.save(ms)

    def list_milestones(self, project_id: str) -> list[Milestone]:
        return self.milestones.list_for_project(project_id)

    def record_prediction(
        self,
        project_id: str,
        milestone_id: str,
        probability: float,
        delay_days: float,
    ) -> RiskPrediction:
        if self.predictions is None:
            raise ValueError("Prediction repository not configured")
        self.milestones.get_by_id(milestone_id)
        pred = RiskPrediction(
            id=str(uuid.uuid4()),
            project_id=project_id,
            milestone_id=milestone_id,
            delay_probability=probability,
            predicted_delay_days=delay_days,
            risk_level=rules.risk_from_delay(probability, delay_days),
        )
        return self.predictions.save(pred)

    def project_health(self, project_id: str) -> dict:
        milestones = self.milestones.list_for_project(project_id)
        preds, _ = self.predictions.list_for_project(project_id) if self.predictions else ([], 0)
        return {
            "project_id": project_id,
            "health": rules.project_health(preds),
            "overdue_count": len(rules.overdue_milestones(milestones)),
            "milestone_count": len(milestones),
            "prediction_count": len(preds),
        }
