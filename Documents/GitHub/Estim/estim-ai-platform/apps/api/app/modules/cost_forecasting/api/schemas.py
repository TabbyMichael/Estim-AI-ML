"""
Pydantic schemas for cost forecasting API request/response validation.

This module defines the data models used for:
- Request validation (input schemas)
- Response formatting (output schemas)
- Entity conversion (to/from domain entities)
"""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, validator

from app.modules.cost_forecasting.domain.entities import (
    CostForecast,
    CostSnapshot,
    ForecastModel,
)


class ForecastStatusEnum(str, Enum):
    """Forecast status enumeration for API."""

    DRAFT = "draft"
    GENERATED = "generated"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUPERSEDED = "superseded"


class ForecastTypeEnum(str, Enum):
    """Forecast type enumeration for API."""

    PROJECT_TOTAL = "project_total"
    PHASE_BREAKDOWN = "phase_breakdown"
    MONTHLY_BURN = "monthly_burn"
    VARIANCE_ANALYSIS = "variance_analysis"


class CostForecastCreate(BaseModel):
    """Schema for creating a cost forecast."""

    project_id: str = Field(..., description="Project identifier", min_length=1)
    forecast_type: ForecastTypeEnum = Field(..., description="Type of forecast")
    predicted_amount: Decimal = Field(
        ..., description="Predicted cost amount", ge=0, decimal_places=2
    )
    confidence_interval_low: Decimal = Field(
        ..., description="Lower bound of confidence interval", ge=0, decimal_places=2
    )
    confidence_interval_high: Decimal = Field(
        ..., description="Upper bound of confidence interval", ge=0, decimal_places=2
    )
    model_version: str = Field(..., description="Forecast model version", min_length=1)
    created_by: str = Field(..., description="User who created the forecast", min_length=1)

    @validator("confidence_interval_high")
    def validate_interval(cls, v: Decimal, values: dict) -> Decimal:
        """Validate that high >= low."""
        if "confidence_interval_low" in values and v < values["confidence_interval_low"]:
            raise ValueError("Confidence interval high must be >= low")
        return v


class CostForecastUpdate(BaseModel):
    """Schema for updating a cost forecast."""

    predicted_amount: Optional[Decimal] = Field(
        None, description="Predicted cost amount", ge=0, decimal_places=2
    )
    confidence_interval_low: Optional[Decimal] = Field(
        None, description="Lower bound of confidence interval", ge=0, decimal_places=2
    )
    confidence_interval_high: Optional[Decimal] = Field(
        None, description="Upper bound of confidence interval", ge=0, decimal_places=2
    )
    model_version: Optional[str] = Field(
        None, description="Forecast model version", min_length=1
    )
    notes: Optional[str] = Field(None, description="Additional notes")


class CostForecastResponse(BaseModel):
    """Schema for cost forecast response."""

    id: str
    project_id: str
    forecast_type: str
    status: str
    predicted_amount: Decimal
    confidence_interval_low: Decimal
    confidence_interval_high: Decimal
    model_version: str
    created_at: datetime
    created_by: str
    actual_amount: Optional[Decimal] = None
    variance: Optional[Decimal] = None
    accuracy_score: Optional[float] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    notes: Optional[str] = None

    @classmethod
    def from_entity(cls, forecast: CostForecast) -> "CostForecastResponse":
        return cls(
            id=forecast.id,
            project_id=forecast.project_id,
            forecast_type=forecast.forecast_type.value,
            status=forecast.status.value,
            predicted_amount=forecast.predicted_amount,
            confidence_interval_low=forecast.confidence_interval_low,
            confidence_interval_high=forecast.confidence_interval_high,
            model_version=forecast.model_version,
            created_at=forecast.created_at,
            created_by=forecast.created_by,
            actual_amount=forecast.actual_amount,
            variance=forecast.variance,
            accuracy_score=forecast.accuracy_score,
            approved_by=forecast.approved_by,
            approved_at=forecast.approved_at,
            notes=forecast.notes,
        )


class CostForecastListResponse(BaseModel):
    """Schema for paginated cost forecast list response."""

    forecasts: list[CostForecastResponse]
    total: int
    skip: int
    limit: int


class CostForecastFilters(BaseModel):
    """Schema for filtering cost forecasts."""

    project_id: Optional[str] = Field(None, description="Filter by project ID")
    forecast_type: Optional[ForecastTypeEnum] = Field(None, description="Filter by forecast type")
    status: Optional[ForecastStatusEnum] = Field(None, description="Filter by forecast status")


class CostSnapshotCreate(BaseModel):
    """Schema for creating a cost snapshot."""

    project_id: str = Field(..., description="Project identifier", min_length=1)
    category: str = Field(..., description="Cost category", min_length=1)
    amount: Decimal = Field(..., description="Cost amount", ge=0, decimal_places=2)
    recorded_at: Optional[datetime] = Field(None, description="When the cost was recorded")
    currency: str = Field("USD", description="Currency code", min_length=1, max_length=10)
    metadata: dict = Field(default_factory=dict, description="Additional metadata")


class CostSnapshotResponse(BaseModel):
    """Schema for cost snapshot response."""

    id: str
    project_id: str
    category: str
    amount: Decimal
    recorded_at: datetime
    currency: str
    metadata: dict

    @classmethod
    def from_entity(cls, snapshot: CostSnapshot) -> "CostSnapshotResponse":
        return cls(
            id=snapshot.id,
            project_id=snapshot.project_id,
            category=snapshot.category,
            amount=snapshot.amount,
            recorded_at=snapshot.recorded_at,
            currency=snapshot.currency,
            metadata=snapshot.metadata,
        )


class CostSnapshotListResponse(BaseModel):
    """Schema for paginated cost snapshot list response."""

    snapshots: list[CostSnapshotResponse]
    total: int
    skip: int
    limit: int


class ForecastModelCreate(BaseModel):
    """Schema for creating a forecast model."""

    name: str = Field(..., description="Model name", min_length=1)
    version: str = Field(..., description="Model version", min_length=1)
    model_type: str = Field(..., description="Model type", min_length=1)
    training_period_start: datetime = Field(..., description="Training period start")
    training_period_end: datetime = Field(..., description="Training period end")
    is_active: bool = Field(True, description="Whether model is active")
    metrics: dict = Field(default_factory=dict, description="Model performance metrics")


class ForecastModelResponse(BaseModel):
    """Schema for forecast model response."""

    id: str
    name: str
    version: str
    model_type: str
    training_period_start: datetime
    training_period_end: datetime
    is_active: bool
    created_at: datetime
    metrics: dict

    @classmethod
    def from_entity(cls, model: ForecastModel) -> "ForecastModelResponse":
        return cls(
            id=model.id,
            name=model.name,
            version=model.version,
            model_type=model.model_type,
            training_period_start=model.training_period_start,
            training_period_end=model.training_period_end,
            is_active=model.is_active,
            created_at=model.created_at,
            metrics=model.metrics,
        )


class ForecastModelListResponse(BaseModel):
    """Schema for paginated forecast model list response."""

    models: list[ForecastModelResponse]
    total: int
    skip: int
    limit: int


class GenerateForecastRequest(BaseModel):
    """Schema for generating a forecast."""

    forecast_id: str = Field(..., description="Forecast ID to generate")


class ApproveForecastRequest(BaseModel):
    """Schema for approving a forecast."""

    forecast_id: str = Field(..., description="Forecast ID to approve")
    approved_by: str = Field(..., description="User ID of approver", min_length=1)
    notes: Optional[str] = Field(None, description="Approval notes")


class RejectForecastRequest(BaseModel):
    """Schema for rejecting a forecast."""

    forecast_id: str = Field(..., description="Forecast ID to reject")
    rejected_by: str = Field(..., description="User ID of rejecter", min_length=1)
    notes: Optional[str] = Field(None, description="Rejection notes")


class RecordActualRequest(BaseModel):
    """Schema for recording actual cost."""

    forecast_id: str = Field(..., description="Forecast ID")
    actual_amount: Decimal = Field(..., description="Actual cost incurred", ge=0, decimal_places=2)
