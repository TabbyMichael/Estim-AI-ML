# mypy: ignore-errors
"""Project risk API routes: /project-risk/*."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import NotFoundError as CoreNotFound
from app.modules.project_risk.api.schemas import (
    MilestoneCreate,
    MilestoneResponse,
    PredictionCreate,
    PredictionResponse,
)
from app.modules.project_risk.application.services import ProjectRiskService
from app.modules.project_risk.domain import entities as domain_errors
from app.modules.project_risk.infrastructure.repository import (
    SqlAlchemyMilestoneRepository,
    SqlAlchemyRiskPredictionRepository,
)

router = APIRouter(prefix="/project-risk", tags=["project-risk"])


def _service(db: Session = Depends(get_db)) -> ProjectRiskService:
    return ProjectRiskService(
        milestones=SqlAlchemyMilestoneRepository(db),
        predictions=SqlAlchemyRiskPredictionRepository(db),
    )


@router.post("/milestones", response_model=MilestoneResponse,
             status_code=status.HTTP_201_CREATED)
def track_milestone(
    body: MilestoneCreate, svc: ProjectRiskService = Depends(_service),
    db: Session = Depends(get_db),
) -> MilestoneResponse:
    ms = svc.track_milestone(body.project_id, body.name, body.planned_start,
                             body.planned_end, body.status)
    db.commit()
    return MilestoneResponse.from_entity(ms)


@router.get("/projects/{project_id}/milestones",
            response_model=list[MilestoneResponse])
def list_milestones(
    project_id: str, svc: ProjectRiskService = Depends(_service),
) -> list[MilestoneResponse]:
    return [MilestoneResponse.from_entity(m)
            for m in svc.list_milestones(project_id)]


@router.post("/projects/{project_id}/predictions",
             response_model=PredictionResponse,
             status_code=status.HTTP_201_CREATED)
def record_prediction(
    project_id: str, body: PredictionCreate,
    svc: ProjectRiskService = Depends(_service),
    db: Session = Depends(get_db),
) -> PredictionResponse:
    try:
        pred = svc.record_prediction(project_id, body.milestone_id,
                                     body.delay_probability,
                                     body.predicted_delay_days)
    except domain_errors.NotFoundError as exc:
        raise CoreNotFound(str(exc)) from exc
    db.commit()
    return PredictionResponse.from_entity(pred)


@router.get("/projects/{project_id}/health")
def project_health(
    project_id: str, svc: ProjectRiskService = Depends(_service),
) -> dict:
    return svc.project_health(project_id)


@router.get("/projects/{project_id}/predictions")
def list_predictions(
    project_id: str, skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    svc: ProjectRiskService = Depends(_service),
) -> dict:
    preds, total = (svc.predictions.list_for_project(project_id, skip, limit)
                    if svc.predictions is not None else ([], 0))
    return {"predictions": [PredictionResponse.from_entity(p).model_dump(
        mode="json") for p in preds], "total": total}
