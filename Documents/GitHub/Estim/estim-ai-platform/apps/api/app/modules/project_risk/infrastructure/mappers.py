"""Mappers for the project risk module."""

import uuid
from datetime import UTC, datetime

from app.modules.project_risk.domain.entities import (
    Milestone,
    MilestoneStatus,
    RiskLevel,
    RiskPrediction,
)
from app.modules.project_risk.infrastructure.models import (
    MilestoneModel,
    RiskPredictionModel,
)


def _tz(v: datetime | None) -> datetime | None:
    if v is None:
        return None
    return v if v.tzinfo else v.replace(tzinfo=UTC)


def milestone_to_model(m: Milestone) -> MilestoneModel:
    return MilestoneModel(
        id=uuid.UUID(m.id),
        project_id=m.project_id,
        name=m.name,
        planned_start=m.planned_start,
        planned_end=m.planned_end,
        status=m.status.value,
        actual_start=m.actual_start,
        actual_end=m.actual_end,
        progress_pct=m.progress_pct,
    )


def model_to_milestone(m: MilestoneModel) -> Milestone:
    start = _tz(m.planned_start)
    end = _tz(m.planned_end)
    assert start is not None and end is not None
    return Milestone(
        id=str(m.id),
        project_id=m.project_id,
        name=m.name,
        planned_start=start,
        planned_end=end,
        status=MilestoneStatus(m.status),
        actual_start=_tz(m.actual_start),
        actual_end=_tz(m.actual_end),
        progress_pct=m.progress_pct,
    )


def prediction_to_model(p: RiskPrediction) -> RiskPredictionModel:
    return RiskPredictionModel(
        id=uuid.UUID(p.id),
        project_id=p.project_id,
        milestone_id=p.milestone_id,
        delay_probability=p.delay_probability,
        predicted_delay_days=p.predicted_delay_days,
        risk_level=p.risk_level.value,
        model_version=p.model_version,
        created_at=p.created_at,
        notes=p.notes,
    )


def model_to_prediction(m: RiskPredictionModel) -> RiskPrediction:
    created = _tz(m.created_at)
    assert created is not None
    return RiskPrediction(
        id=str(m.id),
        project_id=m.project_id,
        milestone_id=m.milestone_id,
        delay_probability=m.delay_probability,
        predicted_delay_days=m.predicted_delay_days,
        risk_level=RiskLevel(m.risk_level),
        model_version=m.model_version,
        created_at=created,
        notes=m.notes,
    )
