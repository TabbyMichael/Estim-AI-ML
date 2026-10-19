"""Entity <-> model mappers for the procurement module."""

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import overload

from app.modules.procurement.domain.entities import (
    Anomaly,
    AnomalyDecision,
    AnomalyStatus,
    OrderState,
    PurchaseOrder,
    PurchaseOrderLine,
    RiskLevel,
)
from app.modules.procurement.infrastructure.models import (
    AnomalyModel,
    PurchaseOrderLineModel,
    PurchaseOrderModel,
)


def order_to_model(order: PurchaseOrder) -> PurchaseOrderModel:
    model = PurchaseOrderModel(
        id=uuid.UUID(order.id),
        po_number=order.po_number,
        supplier_id=order.supplier_id,
        project_id=order.project_id,
        total_amount=float(order.total_amount),
        state=order.state.value,
        created_at=order.created_at,
        updated_at=order.updated_at,
        approved_by=order.approved_by,
        approved_at=order.approved_at,
    )
    model.lines = [
        PurchaseOrderLineModel(
            material_id=line.material_id,
            material_name=line.material_name,
            quantity=line.quantity,
            unit_price=float(line.unit_price),
            subtotal=float(line.subtotal),
        )
        for line in order.line_items
    ]
    return model


def model_to_order(model: PurchaseOrderModel) -> PurchaseOrder:
    lines = [
        PurchaseOrderLine(
            material_id=line.material_id,
            material_name=line.material_name,
            quantity=line.quantity,
            unit_price=Decimal(str(line.unit_price)),
            subtotal=Decimal(str(line.subtotal)),
        )
        for line in sorted(model.lines, key=lambda line: line.material_id)
    ]
    return PurchaseOrder(
        id=str(model.id),
        po_number=model.po_number,
        supplier_id=model.supplier_id,
        project_id=model.project_id,
        total_amount=Decimal(str(model.total_amount)),
        state=OrderState(model.state),
        line_items=lines,
        created_at=_ensure_tz(model.created_at),
        updated_at=_ensure_tz(model.updated_at),
        approved_by=model.approved_by,
        approved_at=_ensure_tz(model.approved_at) if model.approved_at else None,
    )


def anomaly_to_model(anomaly: Anomaly) -> AnomalyModel:
    return AnomalyModel(
        id=uuid.UUID(anomaly.id),
        purchase_order_id=anomaly.purchase_order_id,
        po_number=anomaly.po_number,
        anomaly_type=getattr(anomaly.anomaly_type, "value", anomaly.anomaly_type),
        anomaly_score=anomaly.anomaly_score,
        risk_level=anomaly.risk_level.value,
        status=anomaly.status.value,
        details=anomaly.details,
        created_at=anomaly.created_at,
        reviewed_by=anomaly.reviewed_by,
        reviewed_at=anomaly.reviewed_at,
        review_decision=(anomaly.review_decision.value if anomaly.review_decision else None),
        review_notes=anomaly.review_notes,
    )


def model_to_anomaly(model: AnomalyModel) -> Anomaly:
    return Anomaly(
        id=str(model.id),
        purchase_order_id=model.purchase_order_id,
        po_number=model.po_number,
        anomaly_type=model.anomaly_type,
        anomaly_score=model.anomaly_score,
        risk_level=RiskLevel(model.risk_level),
        status=AnomalyStatus(model.status),
        details=model.details,
        created_at=_ensure_tz(model.created_at),
        reviewed_by=model.reviewed_by,
        reviewed_at=_ensure_tz(model.reviewed_at) if model.reviewed_at else None,
        review_decision=(AnomalyDecision(model.review_decision) if model.review_decision else None),
        review_notes=model.review_notes,
    )


@overload
def _ensure_tz(value: datetime) -> datetime: ...


@overload
def _ensure_tz(value: None) -> None: ...


def _ensure_tz(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value
