"""
Domain entities for the procurement module.

This module defines the core business entities:
- PurchaseOrder: Represents a purchase order
- PurchaseOrderLine: Represents a line item in a purchase order
- Anomaly: Represents a detected procurement anomaly

These entities are pure Python dataclasses with no external dependencies.
"""

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from enum import Enum


class OrderState(Enum):
    """Purchase order state enumeration."""

    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"


class AnomalyStatus(Enum):
    """Anomaly review status enumeration."""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    UNDER_INVESTIGATION = "under_investigation"


class AnomalyDecision(Enum):
    """Anomaly review decision enumeration."""

    APPROVE = "approve"
    REJECT = "reject"
    INVESTIGATE = "investigate"


class AnomalyType(Enum):
    """Classification of procurement anomalies."""

    PRICE = "price"
    QUANTITY = "quantity"
    DUPLICATE = "duplicate"
    SUPPLIER = "supplier"
    PATTERN = "pattern"


class RiskLevel(Enum):
    """Risk level enumeration."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


@dataclass
class PurchaseOrderLine:
    """Represents a line item in a purchase order."""

    material_id: str
    material_name: str
    quantity: int
    unit_price: Decimal
    subtotal: Decimal

    def __post_init__(self) -> None:
        """Validate and calculate subtotal."""
        if self.quantity <= 0:
            raise ValueError("Quantity must be positive")
        if self.unit_price <= 0:
            raise ValueError("Unit price must be positive")
        self.subtotal = self.quantity * self.unit_price


@dataclass
class PurchaseOrder:
    """Represents a purchase order in the procurement domain."""

    id: str
    po_number: str
    supplier_id: str
    project_id: str
    total_amount: Decimal
    state: OrderState
    line_items: list[PurchaseOrderLine]
    created_at: datetime
    updated_at: datetime
    approved_by: str | None = None
    approved_at: datetime | None = None

    def __post_init__(self) -> None:
        """Validate purchase order state."""
        if not self.id:
            raise ValueError("Purchase order ID is required")
        if not self.po_number:
            raise ValueError("PO number is required")
        if not self.supplier_id:
            raise ValueError("Supplier ID is required")
        if not self.project_id:
            raise ValueError("Project ID is required")
        if self.total_amount < 0:
            raise ValueError("Total amount cannot be negative")
        if not self.line_items:
            raise ValueError("Purchase order must have at least one line item")

    def submit(self) -> None:
        """Submit the purchase order for approval."""
        if self.state != OrderState.DRAFT:
            raise InvalidStateError(f"Cannot submit order in {self.state.value} state")
        self.state = OrderState.SUBMITTED
        self.updated_at = datetime.utcnow()

    def approve(self, user_id: str) -> None:
        """Approve the purchase order.

        Args:
            user_id: User ID of the approver

        Raises:
            InvalidStateError: If order is not in SUBMITTED state
        """
        if self.state != OrderState.SUBMITTED:
            raise InvalidStateError(f"Cannot approve order in {self.state.value} state")
        self.state = OrderState.APPROVED
        self.approved_by = user_id
        self.approved_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def reject(self, user_id: str, reason: str | None = None) -> None:
        """Reject the purchase order.

        Args:
            user_id: User ID of the rejecter
            reason: Optional rejection reason

        Raises:
            InvalidStateError: If order is not in SUBMITTED or APPROVED state
        """
        if self.state not in [OrderState.SUBMITTED, OrderState.APPROVED]:
            raise InvalidStateError(f"Cannot reject order in {self.state.value} state")
        self.state = OrderState.REJECTED
        self.updated_at = datetime.utcnow()

    def complete(self) -> None:
        """Mark the purchase order as completed.

        Raises:
            InvalidStateError: If order is not in APPROVED state
        """
        if self.state != OrderState.APPROVED:
            raise InvalidStateError(f"Cannot complete order in {self.state.value} state")
        self.state = OrderState.COMPLETED
        self.updated_at = datetime.utcnow()

    def add_line_item(self, line_item: PurchaseOrderLine) -> None:
        """Add a line item to the purchase order.

        Args:
            line_item: Line item to add

        Raises:
            InvalidStateError: If order is not in DRAFT state
            ValueError: If material already exists in line items
        """
        if self.state != OrderState.DRAFT:
            raise InvalidStateError(f"Cannot add line items to order in {self.state.value} state")

        material_ids = [item.material_id for item in self.line_items]
        if line_item.material_id in material_ids:
            raise ValueError(f"Material {line_item.material_id} already exists in line items")

        self.line_items.append(line_item)
        self.recalculate_total()

    def remove_line_item(self, material_id: str) -> None:
        """Remove a line item from the purchase order.

        Args:
            material_id: Material ID to remove

        Raises:
            InvalidStateError: If order is not in DRAFT state
            ValueError: If material not found in line items
        """
        if self.state != OrderState.DRAFT:
            raise InvalidStateError(
                f"Cannot remove line items from order in {self.state.value} state"
            )

        self.line_items = [item for item in self.line_items if item.material_id != material_id]

        if len(self.line_items) == 0:
            raise ValueError("Purchase order must have at least one line item")

        self.recalculate_total()

    def recalculate_total(self) -> Decimal:
        """Recalculate total amount from line items.

        Returns:
            Updated total amount
        """
        total: Decimal = sum(
            (item.subtotal for item in self.line_items),
            Decimal("0"),
        )
        self.total_amount = total
        self.updated_at = datetime.utcnow()
        return self.total_amount


@dataclass
class Anomaly:
    """Represents a detected procurement anomaly."""

    id: str
    purchase_order_id: str
    po_number: str
    anomaly_type: str
    anomaly_score: float
    risk_level: RiskLevel
    status: AnomalyStatus
    details: dict
    created_at: datetime
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    review_decision: AnomalyDecision | None = None
    review_notes: str | None = None

    def __post_init__(self) -> None:
        """Validate anomaly state."""
        if not self.id:
            raise ValueError("Anomaly ID is required")
        if not self.purchase_order_id:
            raise ValueError("Purchase order ID is required")
        if self.anomaly_score < 0:
            raise ValueError("Anomaly score cannot be negative")

    def approve(self, reviewer_id: str, notes: str | None = None) -> None:
        """Approve the anomaly (determine it's a false positive).

        Args:
            reviewer_id: User ID of the reviewer
            notes: Optional review notes

        Raises:
            InvalidStateError: If anomaly is not in PENDING status
        """
        if self.status != AnomalyStatus.PENDING:
            raise InvalidStateError(f"Cannot approve anomaly in {self.status.value} status")
        self.status = AnomalyStatus.APPROVED
        self.review_decision = AnomalyDecision.APPROVE
        self.reviewed_by = reviewer_id
        self.reviewed_at = datetime.utcnow()
        self.review_notes = notes

    def reject(self, reviewer_id: str, notes: str | None = None) -> None:
        """Reject the anomaly (confirm it's a real issue).

        Args:
            reviewer_id: User ID of the reviewer
            notes: Optional review notes

        Raises:
            InvalidStateError: If anomaly is not in PENDING status
        """
        if self.status != AnomalyStatus.PENDING:
            raise InvalidStateError(f"Cannot reject anomaly in {self.status.value} status")
        self.status = AnomalyStatus.REJECTED
        self.review_decision = AnomalyDecision.REJECT
        self.reviewed_by = reviewer_id
        self.reviewed_at = datetime.utcnow()
        self.review_notes = notes

    def investigate(self, reviewer_id: str, notes: str | None = None) -> None:
        """Mark the anomaly for further investigation.

        Args:
            reviewer_id: User ID of the reviewer
            notes: Optional review notes

        Raises:
            InvalidStateError: If anomaly is not in PENDING status
        """
        if self.status != AnomalyStatus.PENDING:
            raise InvalidStateError(
                f"Cannot mark anomaly for investigation in {self.status.value} status"
            )
        self.status = AnomalyStatus.UNDER_INVESTIGATION
        self.review_decision = AnomalyDecision.INVESTIGATE
        self.reviewed_by = reviewer_id
        self.reviewed_at = datetime.utcnow()
        self.review_notes = notes


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


class DuplicateOrderError(Exception):
    """Raised when attempting to create a duplicate purchase order."""

    pass


class UnauthorizedApprovalError(Exception):
    """Raised when a user is not authorized to approve an order."""

    pass


class InsufficientStockError(Exception):
    """Raised when insufficient stock is available for an order."""

    pass
