"""
Domain events for the cost forecasting module.

Publish from the application layer inside the DB transaction;
stored in platform.outbox_events by the transactional-outbox
port so they are delivered exactly once by the Celery relay.
"""

from dataclasses import dataclass

from app.shared.events import DomainEvent


@dataclass(frozen=True, kw_only=True)
class ForecastGenerated(DomainEvent):
    event_type: str = "cost_forecasting.forecast.generated"
    forecast_id: str = ""
    project_id: str = ""
    forecast_type: str = ""
    predicted_amount: float = 0.0


@dataclass(frozen=True, kw_only=True)
class ForecastApproved(DomainEvent):
    event_type: str = "cost_forecasting.forecast.approved"
    forecast_id: str = ""
    project_id: str = ""
    approved_by: str = ""


@dataclass(frozen=True, kw_only=True)
class ForecastRejected(DomainEvent):
    event_type: str = "cost_forecasting.forecast.rejected"
    forecast_id: str = ""
    project_id: str = ""
    rejected_by: str = ""


@dataclass(frozen=True, kw_only=True)
class BudgetAtRisk(DomainEvent):
    event_type: str = "cost_forecasting.budget.at_risk"
    project_id: str = ""
    forecast_id: str = ""
    remaining_budget: float = 0.0


@dataclass(frozen=True, kw_only=True)
class ForecastModelActivated(DomainEvent):
    event_type: str = "cost_forecasting.model.activated"
    model_id: str = ""
    model_name: str = ""
    version: str = ""
