"""Domain events for the procurement module (ADR-003).

Publish from the application layer inside the DB transaction;
stored in platform.outbox_events by the transactional-outbox
port so they are delivered exactly once by the Celery relay.
"""
from dataclasses import dataclass
from datetime import datetime

from app.shared.events import DomainEvent


@dataclass(frozen=True, kw_only=True)
class PurchaseOrderCreated(DomainEvent):
    event_type: str = "procurement.order.created"
    po_id: str = ""
    po_number: str = ""
    supplier_id: str = ""
    project_id: str = ""


@dataclass(frozen=True, kw_only=True)
class PurchaseOrderSubmitted(DomainEvent):
    event_type: str = "procurement.order.submitted"
    po_id: str = ""
    po_number: str = ""


@dataclass(frozen=True, kw_only=True)
class PurchaseOrderApproved(DomainEvent):
    event_type: str = "procurement.order.approved"
    po_id: str = ""
    po_number: str = ""


@dataclass(frozen=True, kw_only=True)
class PurchaseOrderRejected(DomainEvent):
    event_type: str = "procurement.order.rejected"
    po_id: str = ""
    po_number: str = ""
    reason: str = ""


@dataclass(frozen=True, kw_only=True)
class AnomalyDetected(DomainEvent):
    event_type: str = "procurement.anomaly.detected"
    po_id: str = ""
    po_number: str = ""
    anomaly_id: str = ""
    anomaly_type: str = ""
    score: float = 0.0


@dataclass(frozen=True, kw_only=True)
class SupplierSnapshotImported(DomainEvent):
    event_type: str = "procurement.supplier.snapshot_imported"
    supplier_id: str = ""
    snapshot_count: int = 0
