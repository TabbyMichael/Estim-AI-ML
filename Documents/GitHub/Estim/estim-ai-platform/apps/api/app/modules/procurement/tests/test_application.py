"""Application service tests for procurement (Phase 4.3 gate).

Uses SQLite-backed repositories to exercise the service layer end-to-end.
"""

import uuid
from collections.abc import Iterator
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session

from app.core.database import Base
from app.modules.procurement.api.schemas import (
    PurchaseOrderCreate,
    PurchaseOrderFilters,
    PurchaseOrderLineUpdate,
    PurchaseOrderUpdate,
)
from app.modules.procurement.application.services import AnomalyReviewService, PurchaseOrderService
from app.modules.procurement.domain import entities as domain_errors
from app.modules.procurement.domain.entities import (
    Anomaly,
    AnomalyDecision,
    AnomalyStatus,
    AnomalyType,
    OrderState,
    PurchaseOrderLine,
    RiskLevel,
)
from app.modules.procurement.infrastructure.repository import (
    SqlAlchemyAnomalyRepository,
    SqlAlchemyPurchaseOrderRepository,
)


@pytest.fixture
def session() -> Iterator[Session]:
    engine = create_engine("sqlite:///:memory:")

    @event.listens_for(engine, "connect")
    def _fk_on(dbapi_conn, conn_record):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    for table in Base.metadata.tables.values():
        if table.schema == "procurement" or (
            table.schema is None
            and table.name
            in (
                "purchase_orders",
                "purchase_order_lines",
                "anomalies",
            )
        ):
            table.schema = None
            table.create(bind=engine, checkfirst=True)
    with Session(engine) as sess:
        yield sess


def _line() -> PurchaseOrderLine:
    return PurchaseOrderLine(
        material_id="MAT-001",
        material_name="Cement",
        quantity=10,
        unit_price=Decimal("100.00"),
        subtotal=Decimal("1000.00"),
    )


def _create_payload(po_number="PO-001") -> PurchaseOrderCreate:
    from app.modules.procurement.api.schemas import PurchaseOrderLineCreate

    return PurchaseOrderCreate(
        po_number=po_number,
        supplier_id="SUP-001",
        project_id="PROJ-001",
        line_items=[
            PurchaseOrderLineCreate(
                material_id="MAT-001",
                material_name="Cement",
                quantity=10,
                unit_price=Decimal("100.00"),
            )
        ],
    )


class TestPurchaseOrderService:
    def test_create_order(self, session: Session):
        svc = PurchaseOrderService(orders=SqlAlchemyPurchaseOrderRepository(session))
        order = svc.create_order(_create_payload("PO-001"))
        assert order.state == OrderState.DRAFT
        assert order.total_amount == Decimal("1000.00")
        assert order.po_number == "PO-001"

    def test_create_duplicate_po_raises(self, session: Session):
        svc = PurchaseOrderService(orders=SqlAlchemyPurchaseOrderRepository(session))
        svc.create_order(_create_payload("PO-001"))
        with pytest.raises(domain_errors.DuplicateOrderError):
            svc.create_order(_create_payload("PO-001"))

    def test_get_and_list_orders(self, session: Session):
        svc = PurchaseOrderService(orders=SqlAlchemyPurchaseOrderRepository(session))
        svc.create_order(_create_payload("PO-001"))
        svc.create_order(_create_payload("PO-002"))
        orders, total = svc.list_orders(skip=0, limit=10, filters=PurchaseOrderFilters())
        assert total == 2
        fetched = svc.get_order(orders[0].id)
        assert fetched.po_number in ("PO-001", "PO-002")

    def test_submit_and_approve_flow(self, session: Session):
        svc = PurchaseOrderService(orders=SqlAlchemyPurchaseOrderRepository(session))
        order = svc.create_order(_create_payload("PO-001"))
        order.submit()
        svc.orders.save(order)
        updated = svc.approve_order(order.id, "user-1")
        assert updated.state == OrderState.APPROVED
        assert updated.approved_by == "user-1"

    def test_update_line_items_only_on_draft(self, session: Session):
        svc = PurchaseOrderService(orders=SqlAlchemyPurchaseOrderRepository(session))
        order = svc.create_order(_create_payload("PO-001"))
        order.submit()
        svc.orders.save(order)
        with pytest.raises(domain_errors.InvalidStateError):
            svc.update_order(
                order.id,
                PurchaseOrderUpdate(
                    line_items=[
                        PurchaseOrderLineUpdate(
                            material_id="MAT-002",
                            material_name="Steel",
                            quantity=5,
                            unit_price=Decimal("200.00"),
                        )
                    ]
                ),
            )


class TestAnomalyReviewService:
    def test_submit_review_approve(self, session: Session):
        svc = AnomalyReviewService(anomalies=SqlAlchemyAnomalyRepository(session))
        anomaly = Anomaly(
            id=str(uuid.uuid4()),
            purchase_order_id="po-1",
            po_number="PO-001",
            anomaly_type=AnomalyType.PRICE,
            anomaly_score=0.93,
            risk_level=RiskLevel.HIGH,
            status=AnomalyStatus.PENDING,
            details={},
            created_at=datetime.now(UTC),
        )
        svc.anomalies.save(anomaly)
        reviewed = svc.submit_review(anomaly.id, AnomalyDecision.APPROVE, "rev-1", "benign")
        assert reviewed.status == AnomalyStatus.APPROVED
        assert reviewed.review_decision == AnomalyDecision.APPROVE
        assert reviewed.reviewed_by == "rev-1"

    def test_list_anomalies(self, session: Session):
        svc = AnomalyReviewService(anomalies=SqlAlchemyAnomalyRepository(session))
        a1 = Anomaly(
            id=str(uuid.uuid4()),
            purchase_order_id="po-1",
            po_number="PO-001",
            anomaly_type=AnomalyType.PRICE,
            anomaly_score=0.5,
            risk_level=RiskLevel.LOW,
            status=AnomalyStatus.PENDING,
            details={},
            created_at=datetime.now(UTC),
        )
        a2 = Anomaly(
            id=str(uuid.uuid4()),
            purchase_order_id="po-2",
            po_number="PO-002",
            anomaly_type=AnomalyType.DUPLICATE,
            anomaly_score=0.9,
            risk_level=RiskLevel.HIGH,
            status=AnomalyStatus.PENDING,
            details={},
            created_at=datetime.now(UTC),
        )
        svc.anomalies.save(a1)
        svc.anomalies.save(a2)
        page, total = svc.list_anomalies(skip=0, limit=10, status=None)
        assert total == 2
