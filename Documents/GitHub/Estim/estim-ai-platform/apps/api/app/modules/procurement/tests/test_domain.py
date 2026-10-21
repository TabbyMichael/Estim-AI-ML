"""Domain tests for the procurement module (Phase 4.1 gate)."""

import pytest

from app.modules.procurement.domain import events as pev
from app.modules.procurement.domain.entities import (
    Anomaly,
    AnomalyDecision,
    AnomalyStatus,
    AnomalyType,
    InvalidStateError,
    OrderState,
    PurchaseOrder,
    PurchaseOrderLine,
)


def _line(material_id="MAT-001", quantity=100, unit_price=1000) -> PurchaseOrderLine:
    return PurchaseOrderLine(
        material_id=material_id,
        material_name="Cement",
        quantity=quantity,
        unit_price=unit_price,
        subtotal=quantity * unit_price,
    )


def _po(**kwargs) -> PurchaseOrder:
    base = {
        "id": "po-1",
        "po_number": "PO-001",
        "supplier_id": "SUP-001",
        "project_id": "PROJ-001",
        "total_amount": 100000,
        "state": OrderState.DRAFT,
        "line_items": [_line()],
        "created_at": None,
        "updated_at": None,
    }
    base.update(kwargs)
    return PurchaseOrder(**base)


class TestPurchaseOrder:
    def test_create(self):
        po = _po()
        assert po.id == "po-1"
        assert po.state == OrderState.DRAFT
        assert po.line_items[0].subtotal == 100000

    def test_requires_fields(self):
        with pytest.raises(ValueError):
            PurchaseOrder(
                id="",
                po_number="P",
                supplier_id="S",
                project_id="P",
                total_amount=0,
                state=OrderState.DRAFT,
                line_items=[_line()],
                created_at=None,
                updated_at=None,
            )
        with pytest.raises(ValueError):
            _po(total_amount=-1)
        with pytest.raises(ValueError):
            _po(line_items=[])

    def test_submit_approve_reject_flow(self):
        po = _po()
        po.submit()
        assert po.state == OrderState.SUBMITTED
        po.approve("user-1")
        assert po.state == OrderState.APPROVED
        assert po.approved_by == "user-1"
        assert po.approved_at is not None
        po.reject("user-1", "no need")
        assert po.state == OrderState.REJECTED

    def test_invalid_transitions(self):
        submitted = _po(state=OrderState.SUBMITTED)
        with pytest.raises(InvalidStateError):
            submitted.submit()
        draft = _po(state=OrderState.DRAFT)
        with pytest.raises(InvalidStateError):
            draft.approve("u")
        with pytest.raises(InvalidStateError):
            draft.reject("u")
        closed = _po(state=OrderState.COMPLETED)
        with pytest.raises(InvalidStateError):
            closed.submit()
        with pytest.raises(InvalidStateError):
            closed.approve("u")
        with pytest.raises(InvalidStateError):
            closed.reject("u")

    def test_total_amount_derived_from_lines(self):
        lines = [
            _line(material_id="A", quantity=10, unit_price=50),
            _line(material_id="B", quantity=2, unit_price=25),
        ]
        expected_total = sum(line.subtotal for line in lines)
        po = _po(line_items=lines, total_amount=expected_total)
        assert po.total_amount == expected_total
        assert po.line_items[0].subtotal == 500
        assert po.line_items[1].subtotal == 50

    def test_anomaly_validation(self):
        a = Anomaly(
            id="an-1",
            purchase_order_id="po-1",
            po_number="PO-001",
            anomaly_type=AnomalyType.PRICE,
            anomaly_score=0.0,
            risk_level=None,
            status=AnomalyStatus.PENDING,
            details={},
            created_at=None,
        )
        assert a.status == AnomalyStatus.PENDING
        with pytest.raises(ValueError):
            Anomaly(
                id="",
                purchase_order_id="p",
                po_number="P",
                anomaly_type=AnomalyType.PRICE,
                anomaly_score=0.0,
                risk_level=None,
                status=AnomalyStatus.PENDING,
                details={},
                created_at=None,
            )
        a.approve("rev-1", notes="benign")
        assert a.status == AnomalyStatus.APPROVED
        assert a.review_decision == AnomalyDecision.APPROVE
        assert a.review_notes == "benign"


class TestDomainEvents:
    def test_purchase_order_created(self):
        evt = pev.PurchaseOrderCreated(po_id="p", po_number="PO-1", supplier_id="s", project_id="x")
        assert evt.event_type == "procurement.order.created"
        payload = evt.to_payload()
        assert payload["po_id"] == "p" and payload["po_number"] == "PO-1"

    def test_anomaly_detected(self):
        evt = pev.AnomalyDetected(
            po_id="p",
            po_number="PO-1",
            anomaly_id="an-1",
            anomaly_type=AnomalyType.PRICE,
            score=0.93,
        )
        assert evt.to_payload()["score"] == 0.93
