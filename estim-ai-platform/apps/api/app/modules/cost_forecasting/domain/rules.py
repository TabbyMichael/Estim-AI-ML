"""
Business rules for the cost forecasting module.

This module contains pure functions that implement business rules and policies.
These functions have no side effects and are independent of infrastructure.
"""

from datetime import UTC, datetime, timedelta
from decimal import Decimal

from app.modules.cost_forecasting.domain.entities import (
    CostForecast,
    ForecastModel,
    ForecastStatus,
    ForecastType,
)


def can_generate_forecast(forecast: CostForecast) -> bool:
    """Check if a forecast can be generated.

    Args:
        forecast: Cost forecast to check

    Returns:
        True if forecast can be generated, False otherwise
    """
    return forecast.status == ForecastStatus.DRAFT


def can_approve_forecast(forecast: CostForecast) -> bool:
    """Check if a forecast can be approved.

    Args:
        forecast: Cost forecast to check

    Returns:
        True if forecast can be approved, False otherwise
    """
    return forecast.status == ForecastStatus.GENERATED


def can_reject_forecast(forecast: CostForecast) -> bool:
    """Check if a forecast can be rejected.

    Args:
        forecast: Cost forecast to check

    Returns:
        True if forecast can be rejected, False otherwise
    """
    return forecast.status == ForecastStatus.GENERATED


def validate_forecast_amount(forecast: CostForecast, max_amount: Decimal) -> bool:
    """Validate that forecast amount is within allowed limit.

    Args:
        forecast: Cost forecast to validate
        max_amount: Maximum allowed amount

    Returns:
        True if amount is valid, False otherwise
    """
    return forecast.predicted_amount <= max_amount


def is_duplicate_forecast(
    project_id: str, forecast_type: ForecastType, existing: list[CostForecast]
) -> bool:
    """Check if a forecast already exists for the project and type.

    Args:
        project_id: Project ID
        forecast_type: Type of forecast
        existing: List of existing forecasts

    Returns:
        True if duplicate forecast exists, False otherwise
    """
    return any(f.project_id == project_id and f.forecast_type == forecast_type for f in existing)


def calculate_variance(predicted: Decimal, actual: Decimal) -> Decimal:
    """Calculate variance between predicted and actual amounts.

    Args:
        predicted: Predicted amount
        actual: Actual amount

    Returns:
        Variance (actual - predicted)
    """
    return actual - predicted


def calculate_accuracy(predicted: Decimal, actual: Decimal) -> float:
    """Calculate forecast accuracy score.

    Args:
        predicted: Predicted amount
        actual: Actual amount

    Returns:
        Accuracy score (0.0 to 1.0)
    """
    if predicted <= 0:
        return 0.0
    variance = abs(actual - predicted)
    return max(0.0, float(1 - variance / predicted))


def is_forecast_stale(forecast: CostForecast, max_age_hours: int = 168) -> bool:
    """Check if a forecast is stale based on creation time.

    Args:
        forecast: Cost forecast to check
        max_age_hours: Maximum age in hours before considered stale

    Returns:
        True if forecast is stale, False otherwise
    """
    age = datetime.now(UTC) - forecast.created_at
    return age > timedelta(hours=max_age_hours)


def get_forecast_priority(forecast: CostForecast) -> str:
    """Determine forecast priority based on predicted amount.

    Args:
        forecast: Cost forecast

    Returns:
        Priority level: "high", "medium", or "low"
    """
    if forecast.predicted_amount > Decimal("1000000"):
        return "high"
    elif forecast.predicted_amount > Decimal("100000"):
        return "medium"
    else:
        return "low"


def is_within_tolerance(predicted: Decimal, actual: Decimal, tolerance: Decimal) -> bool:
    """Check if actual amount is within tolerance of predicted.

    Args:
        predicted: Predicted amount
        actual: Actual amount
        tolerance: Allowed tolerance

    Returns:
        True if within tolerance, False otherwise
    """
    return abs(actual - predicted) <= tolerance


def get_budget_remaining(
    project_budget: Decimal, forecast_amount: Decimal, spent_amount: Decimal
) -> Decimal:
    """Calculate remaining budget after forecast and spending.

    Args:
        project_budget: Total project budget
        forecast_amount: Forecasted remaining cost
        spent_amount: Amount already spent

    Returns:
        Remaining budget
    """
    return project_budget - spent_amount - forecast_amount


def is_budget_at_risk(
    project_budget: Decimal, forecast_amount: Decimal, spent_amount: Decimal
) -> bool:
    """Check if project budget is at risk of being exceeded.

    Args:
        project_budget: Total project budget
        forecast_amount: Forecasted remaining cost
        spent_amount: Amount already spent

    Returns:
        True if budget is at risk, False otherwise
    """
    remaining = get_budget_remaining(project_budget, forecast_amount, spent_amount)
    return remaining < 0


def get_budget_utilization(spent_amount: Decimal, project_budget: Decimal) -> float:
    """Calculate budget utilization percentage.

    Args:
        spent_amount: Amount spent
        project_budget: Total budget

    Returns:
        Utilization percentage (0.0 to 1.0)
    """
    if project_budget <= 0:
        return 1.0
    return float(spent_amount / project_budget)


def is_budget_critical(utilization: float) -> bool:
    """Check if budget utilization is critical.

    Args:
        utilization: Budget utilization (0.0 to 1.0)

    Returns:
        True if critical (>90%), False otherwise
    """
    return utilization > 0.9


def is_model_active(model: ForecastModel) -> bool:
    """Check if a forecast model is active.

    Args:
        model: Forecast model

    Returns:
        True if model is active, False otherwise
    """
    return model.is_active


def is_training_period_valid(
    model: ForecastModel, data_start: datetime, data_end: datetime
) -> bool:
    """Check if model training period covers the data range.

    Args:
        model: Forecast model
        data_start: Start of data range
        data_end: End of data range

    Returns:
        True if training period is valid, False otherwise
    """
    return model.training_period_start <= data_start and model.training_period_end >= data_end
