"""Business rules for the inventory module (pure functions)."""

from datetime import UTC, datetime, timedelta
from decimal import Decimal

from app.modules.inventory.domain.entities import (
    DemandForecast,
    DemandTrend,
    ForecastStatus,
    StockSnapshot,
)


def can_generate(forecast: DemandForecast) -> bool:
    return forecast.status == ForecastStatus.DRAFT


def can_approve(forecast: DemandForecast) -> bool:
    return forecast.status == ForecastStatus.GENERATED


def days_of_cover(snapshot: StockSnapshot, daily_demand: Decimal) -> float:
    if daily_demand <= 0:
        return float("inf")
    return float(snapshot.quantity_on_hand / daily_demand)


def is_stockout_risk(
    snapshot: StockSnapshot, daily_demand: Decimal, horizon_days: int = 14
) -> bool:
    return days_of_cover(snapshot, daily_demand) < horizon_days


def reorder_quantity(
    snapshot: StockSnapshot, daily_demand: Decimal, horizon_days: int = 30
) -> Decimal:
    need = daily_demand * horizon_days - snapshot.quantity_on_hand
    return max(Decimal("0"), need)


def detect_trend(quantities: list[Decimal]) -> DemandTrend:
    if len(quantities) < 3:
        return DemandTrend.STABLE
    first = sum(quantities[: len(quantities) // 2])
    second = sum(quantities[len(quantities) // 2 :])
    if second > first * Decimal("1.2"):
        return DemandTrend.RISING
    if second < first * Decimal("0.8"):
        return DemandTrend.FALLING
    return DemandTrend.STABLE


def is_forecast_stale(forecast: DemandForecast, max_age_hours: int = 168) -> bool:
    age = datetime.now(UTC) - forecast.created_at
    return age > timedelta(hours=max_age_hours)
