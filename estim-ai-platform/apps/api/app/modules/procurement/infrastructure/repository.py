"""SQLAlchemy repository implementations for the procurement module."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.modules.procurement.domain.entities import (
    Anomaly,
    DuplicateOrderError,
    NotFoundError,
    PurchaseOrder,
)
from app.modules.procurement.infrastructure import mappers
from app.modules.procurement.infrastructure.models import (
    AnomalyModel,
    PurchaseOrderModel,
)


class SqlAlchemyPurchaseOrderRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_id(self, order_id: str) -> PurchaseOrder:
        model = self.session.get(PurchaseOrderModel, uuid.UUID(order_id))
        if model is None:
            raise NotFoundError(f"Purchase order {order_id} not found.")
        return mappers.model_to_order(model)

    def exists_by_po_number(self, po_number: str) -> bool:
        stmt = select(PurchaseOrderModel.id).where(
            PurchaseOrderModel.po_number == po_number.strip().upper()
        )
        return self.session.execute(stmt).scalar_one_or_none() is not None

    def save(self, order: PurchaseOrder) -> PurchaseOrder:
        if self.exists_by_po_number(order.po_number):
            existing = self.session.get(PurchaseOrderModel, uuid.UUID(order.id))
            if existing is None or existing.po_number != order.po_number.strip().upper():
                raise DuplicateOrderError(f"Purchase order {order.po_number} already registered.")
        model = mappers.order_to_model(order)
        merged = self.session.merge(model)
        self.session.flush()
        return mappers.model_to_order(merged)

    def delete(self, order_id: str) -> None:
        model = self.session.get(PurchaseOrderModel, uuid.UUID(order_id))
        if model is None:
            raise NotFoundError(f"Purchase order {order_id} not found.")
        self.session.delete(model)
        self.session.flush()

    def list_orders(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: dict | None = None,
    ) -> tuple[list[PurchaseOrder], int]:
        stmt = select(PurchaseOrderModel).options(selectinload(PurchaseOrderModel.lines))
        count_stmt = select(func.count(PurchaseOrderModel.id))
        if filters:
            if filters.get("supplier_id"):
                cond = PurchaseOrderModel.supplier_id == filters["supplier_id"]
                stmt = stmt.where(cond)
                count_stmt = count_stmt.where(cond)
            if filters.get("project_id"):
                cond = PurchaseOrderModel.project_id == filters["project_id"]
                stmt = stmt.where(cond)
                count_stmt = count_stmt.where(cond)
            if filters.get("state"):
                cond = PurchaseOrderModel.state == filters["state"]
                stmt = stmt.where(cond)
                count_stmt = count_stmt.where(cond)
        total = self.session.execute(count_stmt).scalar_one()
        stmt = stmt.offset(skip).limit(limit)
        models = self.session.execute(stmt).scalars().all()
        return [mappers.model_to_order(m) for m in models], total


class SqlAlchemyAnomalyRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_id(self, anomaly_id: str) -> Anomaly:
        model = self.session.get(AnomalyModel, uuid.UUID(anomaly_id))
        if model is None:
            raise NotFoundError(f"Anomaly {anomaly_id} not found.")
        return mappers.model_to_anomaly(model)

    def save(self, anomaly: Anomaly) -> Anomaly:
        model = mappers.anomaly_to_model(anomaly)
        merged = self.session.merge(model)
        self.session.flush()
        return mappers.model_to_anomaly(merged)

    def list_anomalies(
        self,
        skip: int = 0,
        limit: int = 100,
        status: str | None = None,
    ) -> tuple[list, int]:
        stmt = select(AnomalyModel)
        if status:
            stmt = stmt.where(AnomalyModel.status == status)
        total = self.session.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
        stmt = stmt.offset(skip).limit(limit)
        models = self.session.execute(stmt).scalars().all()
        return [mappers.model_to_anomaly(m) for m in models], total
