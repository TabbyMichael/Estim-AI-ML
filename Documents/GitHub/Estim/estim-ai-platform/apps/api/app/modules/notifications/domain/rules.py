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
    "procurement.anomaly": {
        "subject": "Procurement anomaly on PO {po_number}",
        "body": "Anomaly {anomaly_type} detected with score {anomaly_score}.",
    },
    "stockout.risk": {
        "subject": "Stockout risk for {material_id}",
        "body": "Material {material_id} at {site_id} has "
                "{days_of_cover:.1f} days of cover.",
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
    "procurement.anomaly.detected": "procurement.anomaly",
    "inventory.stockout.risk": "stockout.risk",
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
