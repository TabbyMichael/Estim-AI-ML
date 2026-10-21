"""Infrastructure tests for procurement repositories (Phase 4.2 gate).

SQLite-backed: verifies entity<->model mapping and repository
round-trips. Schema-qualified table names are stripped for SQLite
compat since SQLite has no schemas.
"""

import uuid
from collections.abc import Iterator
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session

from app.core.database import Base
from app.modules.procurement.domain.entities import (
    Anomaly,
    AnomalyStatus,
    AnomalyType,
    NotFoundError,
    OrderState,
    PurchaseOrder,
    PurchaseOrderLine,
    RiskLevel,
)
from app.modules.procurement.infrastructure import mappers
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

    # SQLite has no schemas: drop the schema qualifier for OUR tables
    # only and create just those (global metadata also holds other
    # modules' schema-qualified tables SQLite rejects).
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


def _line(material_id="MAT-001", quantity=10, unit_price=Decimal("100.00")) -> PurchaseOrderLine:
    return PurchaseOrderLine(
        material_id=material_id,
        material_name="Cement",
        quantity=quantity,
        unit_price=unit_price,
        subtotal=quantity * unit_price,
    )


def _po(**kwargs) -> PurchaseOrder:
    now = datetime.now(UTC)
    base = {
        "id": str(uuid.uuid4()),
        "po_number": "PO-001",
        "supplier_id": "SUP-001",
        "project_id": "PROJ-001",
        "total_amount": Decimal("1000.00"),
        "state": OrderState.DRAFT,
        "line_items": [_line()],
        "created_at": now,
        "updated_at": now,
    }
    base.update(kwargs)
    return PurchaseOrder(**base)


def _anomaly(**kwargs) -> Anomaly:
    now = datetime.now(UTC)
    base = {
        "id": str(uuid.uuid4()),
        "purchase_order_id": "po-1",
        "po_number": "PO-001",
        "anomaly_type": AnomalyType.PRICE,
        "anomaly_score": 0.93,
        "risk_level": RiskLevel.HIGH,
        "status": AnomalyStatus.PENDING,
        "details": {"key": "value"},
        "created_at": now,
    }
    base.update(kwargs)
    return Anomaly(**base)


class TestMappers:
    def test_order_roundtrip(self):
        order = _po()
        model = mappers.order_to_model(order)
        assert model.po_number == "PO-001"
        assert len(model.lines) == 1
        assert model.lines[0].material_id == "MAT-001"
        back = mappers.model_to_order(model)
        assert back.id == order.id
        assert back.po_number == order.po_number
        assert back.total_amount == order.total_amount
        assert back.state == order.state
        assert back.line_items[0].material_id == "MAT-001"

    def test_anomaly_roundtrip(self):
        anomaly = _anomaly()
        model = mappers.anomaly_to_model(anomaly)
        assert model.anomaly_score == 0.93
        assert model.risk_level == "high"
        back = mappers.model_to_anomaly(model)
        assert back.id == anomaly.id
        assert back.status == AnomalyStatus.PENDING
        assert back.review_decision is None


class TestPurchaseOrderRepository:
    def test_save_and_get_by_id(self, session: Session):
        repo = SqlAlchemyPurchaseOrderRepository(session)
        order = _po()
        saved = repo.save(order)
        assert saved.id == order.id
        fetched = repo.get_by_id(saved.id)
        assert fetched.po_number == "PO-001"
        assert fetched.total_amount == Decimal("1000.00")
        assert len(fetched.line_items) == 1

    def test_exists_by_po_number(self, session: Session):
        repo = SqlAlchemyPurchaseOrderRepository(session)
        assert repo.exists_by_po_number("PO-001") is False
        repo.save(_po())
        assert repo.exists_by_po_number("PO-001") is True

    def test_get_missing_raises(self, session: Session):
        repo = SqlAlchemyPurchaseOrderRepository(session)
        with pytest.raises(NotFoundError):
            repo.get_by_id("00000000-0000-0000-0000-000000000000")

    def test_delete(self, session: Session):
        repo = SqlAlchemyPurchaseOrderRepository(session)
        order = repo.save(_po())
        repo.delete(order.id)
        with pytest.raises(NotFoundError):
            repo.get_by_id(order.id)

    def test_list_orders_pagination(self, session: Session):
        repo = SqlAlchemyPurchaseOrderRepository(session)
        for i in range(5):
            repo.save(_po(po_number=f"PO-{i:03d}"))
        page, total = repo.list_orders(skip=0, limit=2)
        assert total == 5
        assert len(page) == 2

    def test_list_orders_filter_state(self, session: Session):
        repo = SqlAlchemyPurchaseOrderRepository(session)
        draft = _po(po_number="PO-DRAFT", state=OrderState.DRAFT)
        submitted = _po(po_number="PO-SUBMIT", state=OrderState.DRAFT)
        submitted.submit()
        repo.save(draft)
        repo.save(submitted)
        page, total = repo.list_orders(filters={"state": "draft"})
        assert total == 1
        assert page[0].state == OrderState.DRAFT


class TestAnomalyRepository:
    def test_save_and_get_by_id(self, session: Session):
        repo = SqlAlchemyAnomalyRepository(session)
        anomaly = _anomaly()
        saved = repo.save(anomaly)
        assert saved.id == anomaly.id
        fetched = repo.get_by_id(saved.id)
        assert fetched.anomaly_score == 0.93
        assert fetched.status == AnomalyStatus.PENDING

    def test_get_missing_raises(self, session: Session):
        repo = SqlAlchemyAnomalyRepository(session)
        with pytest.raises(NotFoundError):
            repo.get_by_id("00000000-0000-0000-0000-000000000000")

    def test_list_anomalies_filter_status(self, session: Session):
        repo = SqlAlchemyAnomalyRepository(session)
        pending = _anomaly(status=AnomalyStatus.PENDING)
        approved = _anomaly(status=AnomalyStatus.PENDING)
        approved.approve("rev-1")
        repo.save(pending)
        repo.save(approved)
        page, total = repo.list_anomalies(status="pending")
        assert total == 1
        assert page[0].status == AnomalyStatus.PENDING
