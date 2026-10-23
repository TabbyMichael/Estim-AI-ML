"""Application services for the procurement module.

PurchaseOrderService: CRUD + lifecycle (submit/approve/reject/complete).
AnomalyReviewService: list anomalies + submit review decisions.

Services orchestrate domain entities + repositories and translate
external (API/schema) input into domain operations. They raise domain
errors (DuplicateOrderError, NotFoundError, InvalidStateError, ...)
which the API layer maps to HTTP responses.
"""

import uuid
from datetime import UTC, datetime
from decimal import Decimal

from app.modules.procurement.api.schemas import (
    PurchaseOrderCreate,
    PurchaseOrderFilters,
    PurchaseOrderUpdate,
)
from app.modules.procurement.application.ports import (
    AnomalyRepository,
    InventoryQueryService,
    PurchaseOrderRepository,
    RiskScorer,
)
from app.modules.procurement.domain import rules
from app.modules.procurement.domain.entities import (
    Anomaly,
    AnomalyDecision,
    DuplicateOrderError,
    InvalidStateError,
    OrderState,
    PurchaseOrder,
    PurchaseOrderLine,
)


class PurchaseOrderService:
    def __init__(
        self,
        orders: PurchaseOrderRepository,
        inventory: InventoryQueryService | None = None,
        risk_scorer: RiskScorer | None = None,
    ) -> None:
        self.orders = orders
        self.inventory = inventory
        self.risk_scorer = risk_scorer

    def create_order(self, request: PurchaseOrderCreate) -> PurchaseOrder:
        if self.orders.exists_by_po_number(request.po_number):
            raise DuplicateOrderError(f"Purchase order {request.po_number} already exists.")
        line_items = [
            PurchaseOrderLine(
                material_id=item.material_id,
                material_name=item.material_name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                subtotal=item.quantity * item.unit_price,
            )
            for item in request.line_items
        ]
        total_amount = sum((line.subtotal for line in line_items), Decimal("0"))
        now = datetime.now(UTC)
        order = PurchaseOrder(
            id=str(uuid.uuid4()),
            po_number=request.po_number.strip().upper(),
            supplier_id=request.supplier_id,
            project_id=request.project_id,
            total_amount=total_amount,
            state=OrderState.DRAFT,
            line_items=line_items,
            created_at=now,
            updated_at=now,
        )
        # Domain validates required fields + unique line items.
        return self.orders.save(order)

    def get_order(self, order_id: str) -> PurchaseOrder:
        return self.orders.get_by_id(order_id)

    def list_orders(
        self, skip: int, limit: int, filters: PurchaseOrderFilters
    ) -> tuple[list[PurchaseOrder], int]:
        return self.orders.list_orders(
            skip=skip,
            limit=limit,
            filters=filters.model_dump(exclude_none=True),
        )

    def update_order(self, order_id: str, request: PurchaseOrderUpdate) -> PurchaseOrder:
        order = self.orders.get_by_id(order_id)
        if request.supplier_id is not None:
            order.supplier_id = request.supplier_id
        if request.project_id is not None:
            order.project_id = request.project_id
        if request.line_items is not None:
            if order.state != OrderState.DRAFT:
                raise InvalidStateError("Line items can only be changed on a draft order.")
            line_items: list[PurchaseOrderLine] = []
            for item in request.line_items:
                if (
                    item.material_id is None
                    or item.material_name is None
                    or item.quantity is None
                    or item.unit_price is None
                ):
                    raise InvalidStateError(
                        "Line item fields are required when replacing line items."
                    )
                line_items.append(
                    PurchaseOrderLine(
                        material_id=item.material_id,
                        material_name=item.material_name,
                        quantity=item.quantity,
                        unit_price=item.unit_price,
                        subtotal=item.quantity * item.unit_price,
                    )
                )
            order.line_items = line_items
            order.total_amount = sum((line.subtotal for line in line_items), Decimal("0"))
        if request.state is not None:
            target = OrderState(request.state.value)
            if target == OrderState.SUBMITTED:
                if not rules.can_submit_order(order):
                    raise InvalidStateError("Order cannot be submitted.")
                order.submit()
            elif target == OrderState.APPROVED:
                raise InvalidStateError("Use the approve endpoint to approve.")
            elif target == OrderState.REJECTED:
                raise InvalidStateError("Use the reject endpoint to reject.")
        order.updated_at = datetime.now(UTC)
        return self.orders.save(order)

    def approve_order(self, order_id: str, user_id: str) -> PurchaseOrder:
        order = self.orders.get_by_id(order_id)
        order.approve(user_id)
        return self.orders.save(order)

    def reject_order(self, order_id: str, user_id: str, reason: str | None = None) -> PurchaseOrder:
        order = self.orders.get_by_id(order_id)
        order.reject(user_id, reason=reason)
        return self.orders.save(order)

    def complete_order(self, order_id: str) -> PurchaseOrder:
        order = self.orders.get_by_id(order_id)
        order.complete()
        return self.orders.save(order)


class AnomalyReviewService:
    def __init__(self, anomalies: AnomalyRepository) -> None:
        self.anomalies = anomalies

    def list_anomalies(
        self, skip: int, limit: int, status: str | None
    ) -> tuple[list[Anomaly], int]:
        return self.anomalies.list_anomalies(skip=skip, limit=limit, status=status)

    def submit_review(
        self,
        anomaly_id: str,
        decision: AnomalyDecision,
        reviewer_id: str,
        notes: str | None,
    ) -> Anomaly:
        anomaly = self.anomalies.get_by_id(anomaly_id)
        if decision == AnomalyDecision.APPROVE:
            anomaly.approve(reviewer_id, notes=notes)
        elif decision == AnomalyDecision.REJECT:
            anomaly.reject(reviewer_id, notes=notes)
        elif decision == AnomalyDecision.INVESTIGATE:
            anomaly.investigate(reviewer_id, notes=notes)
        return self.anomalies.save(anomaly)
