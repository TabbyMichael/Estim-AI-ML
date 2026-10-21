"""
Domain entities for the cost forecasting module.

This module defines the core business entities:
- CostForecast: Represents a cost forecast for a project
- CostSnapshot: Represents a historical cost data point
- ForecastModel: Represents an ML forecasting model version

These entities are pure Python dataclasses with no external dependencies.
"""

from dataclasses import dataclass, field
from datetime import UTC, datetime
from decimal import Decimal
from enum import Enum


class ForecastStatus(Enum):
    """Cost forecast status enumeration."""

    DRAFT = "draft"
    GENERATED = "generated"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUPERSEDED = "superseded"


class ForecastType(Enum):
    """Type of cost forecast."""

    PROJECT_TOTAL = "project_total"
    PHASE_BREAKDOWN = "phase_breakdown"
    MONTHLY_BURN = "monthly_burn"
    VARIANCE_ANALYSIS = "variance_analysis"


@dataclass
class CostSnapshot:
    """Represents a historical cost data point for forecasting."""

    id: str
    project_id: str
    category: str
    amount: Decimal
    recorded_at: datetime
    currency: str = "USD"
    metadata: dict = field(default_factory=dict)

    def __post_init__(self) -> None:
        """Validate cost snapshot."""
        if not self.id:
            raise ValueError("Cost snapshot ID is required")
        if not self.project_id:
            raise ValueError("Project ID is required")
        if not self.category:
            raise ValueError("Category is required")
        if self.amount < 0:
            raise ValueError("Amount cannot be negative")


@dataclass
class CostForecast:
    """Represents a cost forecast for a project."""

    id: str
    project_id: str
    forecast_type: ForecastType
    status: ForecastStatus
    predicted_amount: Decimal
    confidence_interval_low: Decimal
    confidence_interval_high: Decimal
    model_version: str
    created_at: datetime
    created_by: str
    actual_amount: Decimal | None = None
    variance: Decimal | None = None
    accuracy_score: float | None = None
    approved_by: str | None = None
    approved_at: datetime | None = None
    notes: str | None = None

    def __post_init__(self) -> None:
        """Validate cost forecast state."""
        if not self.id:
            raise ValueError("Forecast ID is required")
        if not self.project_id:
            raise ValueError("Project ID is required")
        if self.predicted_amount < 0:
            raise ValueError("Predicted amount cannot be negative")
        if self.confidence_interval_low < 0:
            raise ValueError("Confidence interval low cannot be negative")
        if self.confidence_interval_high < self.confidence_interval_low:
            raise ValueError("Confidence interval high must be >= low")

    def approve(self, user_id: str, notes: str | None = None) -> None:
        """Approve the cost forecast.

        Args:
            user_id: User ID of the approver
            notes: Optional approval notes

        Raises:
            InvalidStateError: If forecast is not in GENERATED state
        """
        if self.status != ForecastStatus.GENERATED:
            raise InvalidStateError(f"Cannot approve forecast in {self.status.value} state")
        self.status = ForecastStatus.APPROVED
        self.approved_by = user_id
        self.approved_at = datetime.now(UTC)
        self.notes = notes

    def reject(self, user_id: str, notes: str | None = None) -> None:
        """Reject the cost forecast.

        Args:
            user_id: User ID of the rejecter
            notes: Optional rejection notes

        Raises:
            InvalidStateError: If forecast is not in GENERATED state
        """
        if self.status != ForecastStatus.GENERATED:
            raise InvalidStateError(f"Cannot reject forecast in {self.status.value} state")
        self.status = ForecastStatus.REJECTED
        self.notes = notes

    def mark_superseded(self) -> None:
        """Mark the forecast as superseded by a newer version."""
        self.status = ForecastStatus.SUPERSEDED

    def record_actual(self, actual_amount: Decimal) -> None:
        """Record the actual cost and compute variance/accuracy.

        Args:
            actual_amount: The actual cost incurred

        Raises:
            ValueError: If actual amount is negative
        """
        if actual_amount < 0:
            raise ValueError("Actual amount cannot be negative")
        self.actual_amount = actual_amount
        self.variance = actual_amount - self.predicted_amount
        if self.predicted_amount > 0:
            accuracy = 1 - abs(self.variance) / self.predicted_amount
            self.accuracy_score = max(0.0, float(accuracy))


@dataclass
class ForecastModel:
    """Represents an ML forecasting model version."""

    id: str
    name: str
    version: str
    model_type: str
    training_period_start: datetime
    training_period_end: datetime
    is_active: bool = True
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    metrics: dict = field(default_factory=dict)

    def __post_init__(self) -> None:
        """Validate forecast model."""
        if not self.id:
            raise ValueError("Model ID is required")
        if not self.name:
            raise ValueError("Model name is required")
        if not self.version:
            raise ValueError("Model version is required")

    def deactivate(self) -> None:
        """Deactivate this model version."""
        self.is_active = False


# Custom Exceptions


class InvalidStateError(Exception):
    """Raised when an operation is invalid for the current state."""

    pass


class ValidationError(Exception):
    """Raised when entity validation fails."""

    pass


class NotFoundError(Exception):
    """Raised when an entity is not found."""

    pass


class DuplicateForecastError(Exception):
    """Raised when attempting to create a duplicate forecast."""

    pass


class ModelNotActiveError(Exception):
    """Raised when attempting to use an inactive forecast model."""

    pass
