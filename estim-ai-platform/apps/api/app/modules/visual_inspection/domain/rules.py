"""Business rules for visual inspection."""

from app.modules.visual_inspection.domain.entities import (
    DefectDetection,
    DefectSeverity,
    Inspection,
    InspectionStatus,
)


def severity_from_confidence(confidence: float, defect_type: str) -> DefectSeverity:
    structural = {"crack", "spalling", "corrosion", "exposed_rebar"}
    if defect_type in structural and confidence >= 0.5:
        return DefectSeverity.CRITICAL if confidence >= 0.8 else DefectSeverity.MAJOR
    if confidence >= 0.8:
        return DefectSeverity.MAJOR
    if confidence >= 0.5:
        return DefectSeverity.MINOR
    return DefectSeverity.NONE


def can_approve(inspection: Inspection) -> bool:
    return inspection.status == InspectionStatus.IN_REVIEW


def worst_severity(detections: list[DefectDetection]) -> DefectSeverity:
    order = [
        DefectSeverity.NONE,
        DefectSeverity.MINOR,
        DefectSeverity.MAJOR,
        DefectSeverity.CRITICAL,
    ]
    worst = DefectSeverity.NONE
    for d in detections:
        if order.index(d.severity) > order.index(worst):
            worst = d.severity
    return worst


def needs_rework(detections: list[DefectDetection]) -> bool:
    return worst_severity(detections) in (DefectSeverity.MAJOR, DefectSeverity.CRITICAL)
