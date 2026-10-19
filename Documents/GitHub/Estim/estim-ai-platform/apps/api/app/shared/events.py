"""Domain event base classes + transactional outbox.

Publishing flow (ADR-003):
1. Application service calls `publish()` inside its DB transaction.
2. `SqlAlchemyOutbox.publish` writes the event row to platform.outbox_events
   in the SAME transaction -> no lost events on crash.
3. A Celery worker later calls `OutboxRelay.drain()` which dispatches each
   NEW event to registered handlers, marking it PROCESSED (idempotent).
"""

import uuid
from collections.abc import Callable
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from enum import Enum
from typing import Any, Protocol


class EventStatus(str, Enum):  # noqa: UP042 - str-enum keeps JSON compat
    NEW = "new"
    PROCESSED = "processed"
    FAILED = "failed"


@dataclass(frozen=True, kw_only=True)
class DomainEvent:
    """Base class for all module domain events.

    Subclasses declare their own payload fields, e.g.:
        @dataclass(frozen=True, kw_only=True)
        class PurchaseOrderImported(DomainEvent):
            event_type: str = "procurement.order_imported"
            order_id: str = ""
    """

    event_type: str = ""
    event_version: str = "v1"
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    occurred_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    def __post_init__(self) -> None:
        if not self.event_type:
            raise ValueError("event_type is required.")

    def to_payload(self) -> dict[str, Any]:
        data = asdict(self)
        # datetime -> ISO for JSON storage
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
        return data


class EventHandler(Protocol):
    """Idempotent consumer of a domain event payload."""

    def handle(self, payload: dict[str, Any]) -> None: ...


class EventBus(Protocol):
    """In-process publish/subscribe (dev + unit tests)."""

    def publish(self, event: DomainEvent) -> None: ...
    def subscribe(self, event_type: str, handler: EventHandler) -> None: ...


class InMemoryEventBus:
    """Synchronous in-process bus for tests and simple local flows."""

    def __init__(self) -> None:
        self._handlers: dict[str, list[EventHandler]] = {}
        self.published: list[DomainEvent] = []

    def subscribe(self, event_type: str, handler: EventHandler) -> None:
        self._handlers.setdefault(event_type, []).append(handler)

    def publish(self, event: DomainEvent) -> None:
        self.published.append(event)
        for handler in self._handlers.get(event.event_type, []):
            if hasattr(handler, "handle"):
                handler.handle(event.to_payload())
            else:
                handler(event.to_payload())  # plain callable


@dataclass
class OutboxRecord:
    """One row of platform.outbox_events."""

    id: str
    event_type: str
    event_version: str
    payload: dict[str, Any]
    status: EventStatus = EventStatus.NEW
    attempts: int = 0
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    processed_at: datetime | None = None
    error: str | None = None


class OutboxStore(Protocol):
    """Persistence port for the outbox (SQLAlchemy impl in Phase 2.2b)."""

    def append(self, event: DomainEvent) -> OutboxRecord: ...
    def fetch_new(self, limit: int = 100) -> list[OutboxRecord]: ...
    def mark_processed(self, record_id: str) -> None: ...
    def mark_failed(self, record_id: str, error: str) -> None: ...


class InMemoryOutboxStore:
    """Test double for the outbox."""

    def __init__(self) -> None:
        self.records: list[OutboxRecord] = []

    def append(self, event: DomainEvent) -> OutboxRecord:
        record = OutboxRecord(
            id=str(uuid.uuid4()),
            event_type=event.event_type,
            event_version=event.event_version,
            payload=event.to_payload(),
        )
        self.records.append(record)
        return record

    def fetch_new(self, limit: int = 100) -> list[OutboxRecord]:
        return [r for r in self.records if r.status == EventStatus.NEW][:limit]

    def mark_processed(self, record_id: str) -> None:
        self._get(record_id).status = EventStatus.PROCESSED
        self._get(record_id).processed_at = datetime.now(UTC)

    def mark_failed(self, record_id: str, error: str) -> None:
        rec = self._get(record_id)
        rec.status = EventStatus.FAILED
        rec.attempts += 1
        rec.error = error

    def _get(self, record_id: str) -> OutboxRecord:
        for rec in self.records:
            if rec.id == record_id:
                return rec
        raise KeyError(record_id)


class OutboxRelay:
    """Drains NEW outbox rows -> handlers. Idempotent: only PROCESSED on success."""

    def __init__(self, store: OutboxStore) -> None:
        self.store = store
        self._handlers: dict[str, list[Callable[[dict[str, Any]], None]]] = {}

    def register(self, event_type: str, handler: Callable[[dict[str, Any]], None]) -> None:
        self._handlers.setdefault(event_type, []).append(handler)

    def drain(self, limit: int = 100) -> dict[str, int]:
        stats = {"processed": 0, "failed": 0, "skipped": 0}
        for record in self.store.fetch_new(limit):
            handlers = self._handlers.get(record.event_type, [])
            if not handlers:
                stats["skipped"] += 1
                continue
            try:
                for handler in handlers:
                    handler(record.payload)
            except Exception as exc:  # noqa: BLE001 - relay must not crash
                self.store.mark_failed(record.id, str(exc))
                stats["failed"] += 1
            else:
                self.store.mark_processed(record.id)
                stats["processed"] += 1
        return stats
