"""
Pydantic schemas for procurement API request/response validation.

This module defines the data models used for:
- Request validation (input schemas)
- Response formatting (output schemas)
- Entity conversion (to/from domain entities)
"""

from datetime import datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, Field, validator

from app.modules.procurement.domain.entities import Anomaly, PurchaseOrder


class OrderStateEnum(str, Enum):
    """Order state enumeration for API."""

    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"


class PurchaseOrderLineCreate(BaseModel):
    """Schema for creating a purchase order line item."""

    material_id: str = Field(..., description="Material identifier", min_length=1)
    material_name: str = Field(..., description="Material name", min_length=1)
    quantity: int = Field(..., description="Quantity ordered", gt=0)
    unit_price: Decimal = Field(..., description="Unit price", gt=0, decimal_places=2)

    @validator("unit_price")
    def validate_unit_price(cls, v: Decimal) -> Decimal:
        """Validate unit price is reasonable."""
        if v > Decimal("10000000"):
            raise ValueError("Unit price exceeds maximum allowed")
        return v

    @validator("quantity")
    def validate_quantity(cls, v: int) -> int:
        """Validate quantity is reasonable."""
        if v > 1000000:
            raise ValueError("Quantity exceeds maximum allowed")
        return v


class PurchaseOrderLineUpdate(BaseModel):
    """Schema for updating a purchase order line item."""

    material_id: str | None = Field(None, min_length=1)
    material_name: str | None = Field(None, min_length=1)
    quantity: int | None = Field(None, gt=0)
    unit_price: Decimal | None = Field(None, gt=0, decimal_places=2)


class PurchaseOrderCreate(BaseModel):
    """Schema for creating a new purchase order."""

    po_number: str = Field(..., description="Purchase order number", min_length=1, max_length=50)
    supplier_id: str = Field(..., description="Supplier identifier", min_length=1)
    project_id: str = Field(..., description="Project identifier", min_length=1)
    line_items: list[PurchaseOrderLineCreate] = Field(
        ..., description="Line items", min_length=1, max_length=100
    )

    @validator("po_number")
    def validate_po_number(cls, v: str) -> str:
        """Validate PO number format."""
        if not v.strip():
            raise ValueError("PO number cannot be empty")
        return v.strip().upper()

    @validator("line_items")
    def validate_line_items(cls, v: list[PurchaseOrderLineCreate]) -> list[PurchaseOrderLineCreate]:
        """Validate line items are unique."""
        material_ids = [item.material_id for item in v]
        if len(material_ids) != len(set(material_ids)):
            raise ValueError("Duplicate materials in line items")
        return v


class PurchaseOrderUpdate(BaseModel):
    """Schema for updating an existing purchase order."""

    supplier_id: str | None = Field(None, min_length=1)
    project_id: str | None = Field(None, min_length=1)
    line_items: list[PurchaseOrderLineUpdate] | None = Field(None, max_length=100)
    state: OrderStateEnum | None = Field(None, description="New order state")


class PurchaseOrderLineResponse(BaseModel):
    """Schema for purchase order line item in response."""

    material_id: str
    material_name: str
    quantity: int
    unit_price: Decimal
    subtotal: Decimal


class PurchaseOrderResponse(BaseModel):
    """Schema for purchase order response."""

    id: str = Field(..., description="Purchase order UUID")
    po_number: str = Field(..., description="Purchase order number")
    supplier_id: str = Field(..., description="Supplier identifier")
    project_id: str = Field(..., description="Project identifier")
    total_amount: Decimal = Field(..., description="Total amount")
    state: OrderStateEnum = Field(..., description="Order state")
    line_items: list[PurchaseOrderLineResponse] = Field(..., description="Line items")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    approved_by: str | None = Field(None, description="Approver user ID")
    approved_at: datetime | None = Field(None, description="Approval timestamp")

    @classmethod
    def from_entity(cls, order: PurchaseOrder) -> "PurchaseOrderResponse":
        """Convert domain entity to response schema."""
        return cls(
            id=order.id,
            po_number=order.po_number,
            supplier_id=order.supplier_id,
            project_id=order.project_id,
            total_amount=order.total_amount,
            state=OrderStateEnum(order.state.value),
            line_items=[
                PurchaseOrderLineResponse(
                    material_id=item.material_id,
                    material_name=item.material_name,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    subtotal=item.subtotal,
                )
                for item in order.line_items
            ],
            created_at=order.created_at,
            updated_at=order.updated_at,
            approved_by=order.approved_by,
            approved_at=order.approved_at,
        )


class PurchaseOrderFilters(BaseModel):
    """Schema for purchase order query filters."""

    supplier_id: str | None = None
    project_id: str | None = None
    state: str | None = None


class PurchaseOrderListResponse(BaseModel):
    """Schema for paginated purchase order list response."""

    orders: list[PurchaseOrderResponse] = Field(..., description="Purchase orders")
    total: int = Field(..., description="Total number of orders")
    skip: int = Field(..., description="Pagination offset")
    limit: int = Field(..., description="Page size")


# Anomaly Detection Schemas


class AnomalyDecisionEnum(str, Enum):
    """Anomaly review decision enumeration."""

    APPROVE = "approve"
    REJECT = "reject"
    INVESTIGATE = "investigate"


class AnomalyStatusEnum(str, Enum):
    """Anomaly review status enumeration."""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    UNDER_INVESTIGATION = "under_investigation"


class AnomalyReviewRequest(BaseModel):
    """Schema for submitting an anomaly review."""

    decision: AnomalyDecisionEnum = Field(..., description="Review decision")
    reviewer_id: str = Field(..., description="Reviewer user ID", min_length=1)
    notes: str | None = Field(None, description="Review notes", max_length=1000)

    @validator("notes")
    def validate_notes(cls, v: str | None) -> str | None:
        """Validate notes length."""
        if v and len(v.strip()) == 0:
            return None
        return v


class AnomalyResponse(BaseModel):
    """Schema for anomaly response."""

    id: str = Field(..., description="Anomaly UUID")
    purchase_order_id: str = Field(..., description="Related purchase order ID")
    po_number: str = Field(..., description="Purchase order number")
    anomaly_type: str = Field(..., description="Type of anomaly detected")
    anomaly_score: float = Field(..., description="Anomaly score (higher = more anomalous)")
    risk_level: str = Field(..., description="Risk level (low, medium, high)")
    status: AnomalyStatusEnum = Field(..., description="Review status")
    details: dict = Field(..., description="Anomaly details and evidence")
    created_at: datetime = Field(..., description="Detection timestamp")
    reviewed_by: str | None = Field(None, description="Reviewer user ID")
    reviewed_at: datetime | None = Field(None, description="Review timestamp")
    review_decision: AnomalyDecisionEnum | None = Field(None, description="Review decision")
    review_notes: str | None = Field(None, description="Review notes")

    @classmethod
    def from_entity(cls, anomaly: Anomaly) -> "AnomalyResponse":
        """Convert domain entity to response schema."""
        return cls(
            id=anomaly.id,
            purchase_order_id=anomaly.purchase_order_id,
            po_number=anomaly.po_number,
            anomaly_type=anomaly.anomaly_type,
            anomaly_score=anomaly.anomaly_score,
            risk_level=anomaly.risk_level.value,
            status=AnomalyStatusEnum(anomaly.status.value),
            details=anomaly.details,
            created_at=anomaly.created_at,
            reviewed_by=anomaly.reviewed_by,
            reviewed_at=anomaly.reviewed_at,
            review_decision=(
                AnomalyDecisionEnum(anomaly.review_decision.value)
                if anomaly.review_decision
                else None
            ),
            review_notes=anomaly.review_notes,
        )


class AnomalyListResponse(BaseModel):
    """Schema for paginated anomaly list response."""

    anomalies: list[AnomalyResponse] = Field(..., description="Anomalies")
    total: int = Field(..., description="Total number of anomalies")
    skip: int = Field(..., description="Pagination offset")
    limit: int = Field(..., description="Page size")
