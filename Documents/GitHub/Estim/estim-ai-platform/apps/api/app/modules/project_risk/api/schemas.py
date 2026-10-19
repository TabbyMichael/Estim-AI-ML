"""Pydantic schemas for the project risk API."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.modules.project_risk.domain.entities import Milestone, RiskPrediction


class MilestoneCreate(BaseModel):
    project_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    planned_start: datetime
    planned_end: datetime
    status: str = Field("not_started")


class MilestoneResponse(BaseModel):
    id: str
    project_id: str
    name: str
    planned_start: datetime
    planned_end: datetime
    status: str
    progress_pct: float

    @classmethod
    def from_entity(cls, m: Milestone) -> "MilestoneResponse":
        return cls(id=m.id, project_id=m.project_id, name=m.name,
                   planned_start=m.planned_start, planned_end=m.planned_end,
                   status=m.status.value, progress_pct=m.progress_pct)


class PredictionCreate(BaseModel):
    milestone_id: str = Field(..., min_length=1)
    delay_probability: float = Field(..., ge=0, le=1)
    predicted_delay_days: float = Field(..., ge=0)


class PredictionResponse(BaseModel):
    id: str
    project_id: str
    milestone_id: str
    delay_probability: float
    predicted_delay_days: float
    risk_level: str
    model_version: str
    created_at: datetime
    notes: Optional[str] = None

    @classmethod
    def from_entity(cls, p: RiskPrediction) -> "PredictionResponse":
        return cls(id=p.id, project_id=p.project_id,
                   milestone_id=p.milestone_id,
                   delay_probability=p.delay_probability,
                   predicted_delay_days=p.predicted_delay_days,
                   risk_level=p.risk_level.value,
                   model_version=p.model_version, created_at=p.created_at,
                   notes=p.notes)
