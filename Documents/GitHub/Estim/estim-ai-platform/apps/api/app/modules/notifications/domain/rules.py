"""Templates + rules for the notifications module."""

from app.modules.notifications.domain.entities import Channel, NotificationPreference

TEMPLATES: dict[str, dict[str, str]] = {
    "forecast.approved": {
        "subject": "Cost forecast approved for {project_id}",
        "body": "Forecast {forecast_id} (predicted {predicted_amount}) was "
                "approved by {approved_by}.",
    },
    "forecast.rejected": {
        "subject": "Cost forecast rejected for {project_id}",
        "body": "Forecast {forecast_id} was rejected by {rejected_by}.",
    },
    "forecast.updated": {
        "subject": "Cost forecast updated for {project_id}",
        "body": "Forecast {forecast_id} was updated. Review the latest prediction.",
    },
    "procurement.anomaly": {
        "subject": "Procurement anomaly on PO {po_number}",
        "body": "Anomaly {anomaly_type} detected with score {anomaly_score}.",
    },
    "procurement.order_submitted": {
        "subject": "Purchase order {po_number} submitted",
        "body": "Order {po_number} for {total_amount} is awaiting approval.",
    },
    "procurement.order_approved": {
        "subject": "Purchase order {po_number} approved",
        "body": "Order {po_number} was approved by {approved_by}.",
    },
    "stockout.risk": {
        "subject": "Stockout risk for {material_id}",
        "body": "Material {material_id} at {site_id} has "
                "{days_of_cover:.1f} days of cover.",
    },
    "inventory.low_stock": {
        "subject": "Low stock warning: {material_id}",
        "body": "Material {material_id} at {site_id} is below reorder point.",
    },
    "maintenance.equipment_alert": {
        "subject": "Equipment alert: {equipment_id}",
        "body": "Equipment {equipment_id} reports {alert_type} "
                "(health {health_score}).",
    },
    "risk.level_changed": {
        "subject": "Risk level changed for {project_id}",
        "body": "Project {project_id} risk moved from {old_level} to {new_level}.",
    },
    "inspection.completed": {
        "subject": "Inspection {inspection_id} completed",
        "body": "Inspection found {defect_count} defects "
                "(severity {max_severity}).",
    },
    "document.processed": {
        "subject": "Document {document_id} processed",
        "body": "Document processing completed with status {status}.",
    },
    "report.generated": {
        "subject": "Report {report_type} ready",
        "body": "Report {report_id} ({report_type}) finished generating.",
    },
    "system.announcement": {
        "subject": "{subject}",
        "body": "{body}",
    },
    "default": {
        "subject": "Estim update: {event_type}",
        "body": "An event of type {event_type} occurred.",
    },
}

# event_type -> template key
EVENT_TEMPLATES: dict[str, str] = {
    "cost_forecasting.forecast.approved": "forecast.approved",
    "cost_forecasting.forecast.rejected": "forecast.rejected",
    "cost_forecasting.forecast.updated": "forecast.updated",
    "procurement.anomaly.detected": "procurement.anomaly",
    "procurement.order.submitted": "procurement.order_submitted",
    "procurement.order.approved": "procurement.order_approved",
    "inventory.stockout.risk": "stockout.risk",
    "inventory.low_stock": "inventory.low_stock",
    "maintenance.equipment.alert": "maintenance.equipment_alert",
    "project_risk.level.changed": "risk.level_changed",
    "visual_inspection.completed": "inspection.completed",
    "document_intelligence.processed": "document.processed",
    "reporting.generated": "report.generated",
    "system.announcement": "system.announcement",
}


def render(template_key: str, context: dict) -> tuple[str, str]:
    """Render (subject, body) for a template key with a context dict."""
    tpl = TEMPLATES.get(template_key, TEMPLATES["default"])
    try:
        subject = tpl["subject"].format(**context)
        body = tpl["body"].format(**context)
    except (KeyError, IndexError):
        subject = tpl["subject"].split(" {")[0]
        body = tpl["body"]
    return subject, body


def template_for_event(event_type: str) -> str:
    return EVENT_TEMPLATES.get(event_type, "default")


def allows(
    prefs: list[NotificationPreference], user_id: str,
    channel: Channel, event_type: str,
) -> bool:
    """Preference gate: explicit disable wins; wildcard covers all."""
    relevant = [p for p in prefs
                if p.user_id == user_id and p.channel == channel
                and p.event_type in ("*", event_type)]
    if any(not p.enabled for p in relevant if p.event_type == event_type):
        return False
    return any(p.enabled for p in relevant) or not any(
        p.user_id == user_id and p.channel == channel for p in prefs)
