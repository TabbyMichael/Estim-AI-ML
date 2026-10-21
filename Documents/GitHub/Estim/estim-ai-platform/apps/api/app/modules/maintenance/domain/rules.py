"""Business rules for the maintenance module."""

from app.modules.maintenance.domain.entities import (
    Equipment,
    EquipmentStatus,
    FailurePrediction,
    MaintenanceRecord,
    RiskLevel,
)


def risk_from_probability(p: float) -> RiskLevel:
    if p >= 0.8:
        return RiskLevel.CRITICAL
    if p >= 0.5:
        return RiskLevel.HIGH
    if p >= 0.2:
        return RiskLevel.MEDIUM
    return RiskLevel.LOW


def needs_maintenance(equipment: Equipment, hours_threshold: float = 500.0) -> bool:
    return (
        equipment.operating_hours >= hours_threshold or equipment.status == EquipmentStatus.DEGRADED
    )


def mtbf_hours(records: list[MaintenanceRecord], total_hours: float) -> float:
    failures = [r for r in records if r.downtime_hours > 0]
    if not failures:
        return total_hours
    return total_hours / len(failures)


def is_critical(pred: FailurePrediction) -> bool:
    return pred.risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL)
