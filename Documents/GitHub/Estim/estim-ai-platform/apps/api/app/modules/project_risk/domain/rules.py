"""Business rules for the project risk module."""

from app.modules.project_risk.domain.entities import (
    Milestone,
    MilestoneStatus,
    RiskLevel,
    RiskPrediction,
)


def risk_from_delay(probability: float, delay_days: float) -> RiskLevel:
    score = probability * min(delay_days / 30.0, 2.0)
    if score >= 1.2 or (probability >= 0.8 and delay_days >= 14):
        return RiskLevel.CRITICAL
    if score >= 0.6 or delay_days >= 14:
        return RiskLevel.HIGH
    if score >= 0.25 or delay_days >= 5:
        return RiskLevel.MEDIUM
    return RiskLevel.LOW


def is_at_risk(pred: RiskPrediction) -> bool:
    return pred.risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL)


def project_health(predictions: list[RiskPrediction]) -> str:
    if any(p.risk_level == RiskLevel.CRITICAL for p in predictions):
        return "critical"
    if any(p.risk_level == RiskLevel.HIGH for p in predictions):
        return "at_risk"
    if any(p.risk_level == RiskLevel.MEDIUM for p in predictions):
        return "watch"
    return "healthy"


def overdue_milestones(milestones: list[Milestone]) -> list[Milestone]:
    return [m for m in milestones
            if m.status != MilestoneStatus.COMPLETED and m.delay_days() > 0]
