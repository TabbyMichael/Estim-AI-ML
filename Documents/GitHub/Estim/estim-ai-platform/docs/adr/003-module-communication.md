# ADR-003: Module Communication Patterns

## Status

Accepted

## Context

In a modular monolith, the seven business modules (procurement, cost forecasting, inventory, maintenance, project risk, visual inspection, document intelligence) need to communicate with each other.

We need clear patterns for:
- Synchronous communication (when immediate response needed)
- Asynchronous communication (when eventual consistency acceptable)
- Maintaining module boundaries while enabling collaboration

## Decision

We use **two complementary communication patterns**:

1. **Direct Application Interfaces** for synchronous operations
2. **Domain Events** for asynchronous operations

## Pattern 1: Direct Application Interfaces

### When to Use

Use direct interfaces when:
- An immediate response is required
- The operation is within a single business transaction
- Failure should propagate to the caller
- Latency is critical

### Implementation Pattern

Define a Protocol (interface) in the consuming module:

```python
# modules/procurement/application/ports.py
from typing import Protocol
from modules.procurement.domain.entities import PurchaseOrder

class SupplierInfoService(Protocol):
    """Interface for supplier information provided by integrations module."""
    def get_supplier_snapshot(self, supplier_id: str) -> SupplierSnapshot:
        """Get current supplier information."""
        ...

class InventoryQueryService(Protocol):
    """Interface for inventory queries provided by inventory module."""
    def get_available_stock(self, material_id: str, project_id: str) -> StockLevel:
        """Get current stock level for a material."""
        ...
```

Implement the interface in the owning module:

```python
# modules/inventory/application/services.py
class InventoryQueryServiceImpl:
    def __init__(self, repository: StockSnapshotRepository):
        self.repository = repository

    def get_available_stock(self, material_id: str, project_id: str) -> StockLevel:
        snapshot = self.repository.get_latest(material_id, project_id)
        return StockLevel(
            material_id=material_id,
            project_id=project_id,
            available_quantity=snapshot.quantity,
            last_updated=snapshot.timestamp
        )
```

Register the implementation in dependency injection:

```python
# app/bootstrap.py
from modules.inventory.application.services import InventoryQueryServiceImpl
from modules.procurement.application.ports import InventoryQueryService

def register_dependencies(container):
    container.register(
        InventoryQueryService,
        InventoryQueryServiceImpl
    )
```

### Example Use Case

Procurement module needs to check inventory before approving a purchase order:

```python
# modules/procurement/application/services.py
class PurchaseOrderApprovalService:
    def __init__(
        self,
        repository: PurchaseOrderRepository,
        inventory_service: InventoryQueryService
    ):
        self.repository = repository
        self.inventory_service = inventory_service

    def approve_order(self, order_id: str) -> PurchaseOrder:
        order = self.repository.get_by_id(order_id)

        # Synchronous call to inventory module
        stock = self.inventory_service.get_available_stock(
            material_id=order.material_id,
            project_id=order.project_id
        )

        if stock.available_quantity < order.quantity:
            raise InsufficientStockError(
                f"Only {stock.available_quantity} available, need {order.quantity}"
            )

        order.approve()
        self.repository.save(order)
        return order
```

## Pattern 2: Domain Events

### When to Use

Use domain events when:
- Immediate response is not required
- Multiple modules need to react to the same event
- The operation should eventually propagate
- You want loose coupling between modules

### Event Definition

Define events in the module's domain layer:

```python
# modules/procurement/domain/events.py
from dataclasses import dataclass
from datetime import datetime
from typing import Any
from shared.events import DomainEvent

@dataclass
class PurchaseOrderImported(DomainEvent):
    """Published when a purchase order is imported from Odoo."""
    order_id: str
    po_number: str
    supplier_id: str
    total_amount: Decimal
    project_id: str
    line_items: list[dict[str, Any]]
    timestamp: datetime

    event_type: str = "purchase_order.imported"
    event_version: str = "1.0"
```

### Event Publishing

Publish events from the application layer:

```python
# modules/procurement/application/services.py
class OdooImportService:
    def __init__(
        self,
        repository: PurchaseOrderRepository,
        event_publisher: EventPublisher
    ):
        self.repository = repository
        self.event_publisher = event_publisher

    def import_purchase_order(self, odoo_data: dict) -> PurchaseOrder:
        order = self._map_from_odoo(odoo_data)
        self.repository.save(order)

        # Publish event
        event = PurchaseOrderImported(
            order_id=order.id,
            po_number=order.po_number,
            supplier_id=order.supplier_id,
            total_amount=order.total_amount,
            project_id=order.project_id,
            line_items=order.line_items,
            timestamp=datetime.utcnow()
        )
        self.event_publisher.publish(event)

        return order
```

### Transactional Outbox

Use a transactional outbox for reliable event delivery:

```python
# modules/shared/events/outbox.py
class TransactionalOutbox:
    def __init__(self, db_session):
        self.db_session = db_session

    def store(self, event: DomainEvent):
        """Store event in outbox within the same transaction."""
        outbox_event = OutboxEvent(
            event_type=event.event_type,
            event_version=event.event_version,
            payload=json.dumps(asdict(event)),
            status="pending",
            created_at=datetime.utcnow()
        )
        self.db_session.add(outbox_event)
        # Committed when the main transaction commits
```

### Event Consumption

Background workers consume events from the outbox:

```python
# apps/worker/task_registry.py
from modules.inventory.application.handlers import PurchaseOrderImportedHandler
from modules.cost_forecasting.application.handlers import PurchaseOrderImportedHandler as CostHandler

@register_task("process_outbox_events")
def process_outbox_events():
    """Background task to process pending outbox events."""
    events = outbox_repository.get_pending_events(limit=100)

    for event in events:
        try:
            if event.event_type == "purchase_order.imported":
                # Dispatch to handlers
                handler = get_handler(event.event_type)
                handler.handle(event.payload)
                outbox_repository.mark_as_processed(event.id)
        except Exception as e:
            outbox_repository.mark_as_failed(event.id, str(e))
            # Will retry with exponential backoff
```

### Example Event Handlers

Inventory module handler:

```python
# modules/inventory/application/handlers.py
class PurchaseOrderImportedHandler:
    def __init__(self, demand_forecaster: DemandForecaster):
        self.demand_forecaster = demand_forecaster

    def handle(self, payload: dict):
        """Update expected supply when PO is imported."""
        event = PurchaseOrderImported(**payload)

        for item in event.line_items:
            self.demand_forecaster.update_expected_supply(
                material_id=item["material_id"],
                project_id=event.project_id,
                expected_quantity=item["quantity"],
                expected_delivery_date=item["delivery_date"]
            )
```

Cost forecasting module handler:

```python
# modules/cost_forecasting/application/handlers.py
class PurchaseOrderImportedHandler:
    def __init__(self, cost_baseline_service: CostBaselineService):
        self.cost_baseline_service = cost_baseline_service

    def handle(self, payload: dict):
        """Update cost baseline when PO is imported."""
        event = PurchaseOrderImported(**payload)

        self.cost_baseline_service.update_procurement_cost(
            project_id=event.project_id,
            cost_amount=event.total_amount,
            timestamp=event.timestamp
        )
```

## Communication Pattern Decision Tree

```
Need to communicate between modules?
│
├─ Is immediate response required?
│  ├─ YES → Use Direct Application Interface
│  │       - Define Protocol in consuming module
│  │       - Implement in owning module
│  │       - Register in DI container
│  │
│  └─ NO → Continue
│
├─ Do multiple modules need to react?
│  ├─ YES → Use Domain Events
│  │       - Define event in domain layer
│  │       - Publish from application layer
│  │       - Store in transactional outbox
│  │       - Process with background workers
│  │
│  └─ NO → Use Direct Application Interface
│
└─ Should failure propagate to caller?
   ├─ YES → Use Direct Application Interface
   │
   └─ NO → Use Domain Events
```

## Module Communication Examples

| Scenario | Pattern | Example |
|----------|---------|---------|
| Procurement checks inventory before approval | Direct Interface | `InventoryQueryService.get_available_stock()` |
| PO imported, inventory updates expected supply | Domain Event | `PurchaseOrderImported` event |
| Cost forecasting needs project milestones | Direct Interface | `ProjectQueryService.get_milestones()` |
| Equipment failure predicted, schedule maintenance | Domain Event | `EquipmentFailurePredicted` event |
| Document uploaded, extract and index | Domain Event | `DocumentUploaded` event |
| User requests report across all modules | Direct Interface | `ReportingService.generate_report()` |

## Implementation Requirements

### 1. Direct Interfaces

- Define as Python Protocols (type hints, duck typing)
- Place in `application/ports.py` of consuming module
- Implement in `application/services.py` of owning module
- Register in dependency injection container
- Never import SQLAlchemy models across modules

### 2. Domain Events

- Define in `domain/events.py` of publishing module
- Inherit from shared `DomainEvent` base class
- Include event_type and event_version for versioning
- Publish from application layer (not domain layer)
- Store in transactional outbox for reliability
- Process with background workers (Celery)
- Handle idempotently (duplicate events possible)

### 3. Event Handler Guidelines

- Place in `application/handlers.py` of consuming module
- Register in worker task registry
- Mark events as processed only on success
- Retry failed events with exponential backoff
- Log all handler executions

## Consequences

### Positive

- Clear separation between synchronous and asynchronous communication
- Module boundaries enforced through interfaces and events
- Eventual consistency where appropriate, strong consistency where needed
- Loose coupling between modules
- Easy to test (mock interfaces, test events independently)

### Negative

- More boilerplate (Protocol definitions, event handlers)
- Need to manage event delivery and retries
- eventual consistency requires careful UX design
- More complex debugging (event flow vs direct calls)

### Mitigation

- Shared base classes for events and handlers
- Generic event publishing infrastructure
- Event replay capability for debugging
- Architectural tests to prevent direct model access

## References

- [ADR-001: Modular Monolith vs Microservices](./001-modular-monolith.md)
- [ADR-002: Database Schema Separation](./002-database-schemas.md)
- [Domain-Driven Design: Domain Events](https://martinfowler.com/eaaDev/DomainEvent.html)
- [Transactional Outbox Pattern](https://microservices.io/patterns/data/transactional-outbox.html)
