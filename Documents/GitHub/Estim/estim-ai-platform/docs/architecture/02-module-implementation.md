# Module Implementation Guide

## 1. Module Structure

Every business module follows this four-layer architecture:

```
modules/{module_name}/
├── api/                    # HTTP API layer
│   ├── routes.py          # FastAPI route definitions
│   └── schemas.py         # Pydantic request/response models
├── application/           # Application/orchestration layer
│   ├── services.py        # Use case orchestration
│   ├── commands.py        # Command objects (write operations)
│   ├── queries.py         # Query objects (read operations)
│   ├── ports.py           # Interface definitions (Protocols)
│   └── handlers.py        # Domain event handlers
├── domain/                # Domain/business logic layer
│   ├── entities.py        # Business entities (dataclasses)
│   ├── rules.py           # Business rules and policies
│   ├── events.py          # Domain events
│   └── value_objects.py  # Value objects (immutable types)
├── infrastructure/        # Infrastructure/persistence layer
│   ├── models.py          # SQLAlchemy ORM models
│   ├── repository.py      # Repository implementations
│   └── mappers.py         # Entity ↔ Model mappers
├── ml/                    # Machine learning (module-specific)
│   ├── features.py        # Feature engineering
│   ├── inference.py       # Model inference adapters
│   └── evaluation.py      # Model evaluation metrics
└── tests/                 # Module tests
    ├── test_domain.py     # Domain logic tests
    ├── test_application.py # Application service tests
    └── test_infrastructure.py # Repository tests
```

## 2. Layer Responsibilities

### 2.1 API Layer (`api/`)

**Purpose**: Handle HTTP requests, validate input, return responses.

**Responsibilities**:
- Define FastAPI routes
- Validate request bodies with Pydantic schemas
- Call application services
- Return HTTP responses with appropriate status codes
- Handle API-specific errors (404, 400, etc.)

**What NOT to do**:
- Business logic (belongs in domain)
- Database access (belongs in infrastructure)
- Direct calls to other modules (use application interfaces)

**Example**:

```python
# modules/procurement/api/routes.py
from fastapi import APIRouter, Depends, HTTPException
from modules.procurement.api.schemas import (
    PurchaseOrderCreate,
    PurchaseOrderResponse,
    AnomalyReviewRequest
)
from modules.procurement.application.services import (
    PurchaseOrderService,
    AnomalyReviewService
)

router = APIRouter(prefix="/procurement", tags=["procurement"])

@router.post("/purchase-orders", response_model=PurchaseOrderResponse)
def create_purchase_order(
    request: PurchaseOrderCreate,
    service: PurchaseOrderService = Depends()
) -> PurchaseOrderResponse:
    """Create a new purchase order."""
    try:
        order = service.create_order(request)
        return PurchaseOrderResponse.from_entity(order)
    except DuplicateOrderError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

**File Size Guidelines**:
- `routes.py`: 100-300 lines (one file per module, split if larger)
- `schemas.py`: 50-200 lines per schema group

### 2.2 Application Layer (`application/`)

**Purpose**: Orchestrate use cases, manage transactions, enforce authorization.

**Responsibilities**:
- Implement business use cases (workflows)
- Coordinate multiple domain operations
- Manage database transactions
- Check authorization
- Publish domain events
- Call external services through interfaces

**What NOT to do**:
- Direct database queries (use repositories)
- Business rules (belongs in domain)
- HTTP handling (belongs in API)

**Example**:

```python
# modules/procurement/application/services.py
from modules.procurement.domain.entities import PurchaseOrder
from modules.procurement.domain.rules import can_approve_order
from modules.procurement.infrastructure.repository import PurchaseOrderRepository
from modules.procurement.application.ports import InventoryQueryService
from shared.events import EventPublisher

class PurchaseOrderService:
    def __init__(
        self,
        repository: PurchaseOrderRepository,
        inventory_service: InventoryQueryService,
        event_publisher: EventPublisher
    ):
        self.repository = repository
        self.inventory_service = inventory_service
        self.event_publisher = event_publisher

    def approve_order(self, order_id: str, user_id: str) -> PurchaseOrder:
        """Approve a purchase order after business validation."""
        order = self.repository.get_by_id(order_id)

        # Business rule check
        if not can_approve_order(order, user_id):
            raise UnauthorizedApprovalError("User not authorized to approve")

        # Check inventory (external module call)
        stock = self.inventory_service.get_available_stock(
            material_id=order.material_id,
            project_id=order.project_id
        )

        if stock.available_quantity < order.quantity:
            raise InsufficientStockError(
                f"Only {stock.available_quantity} available"
            )

        # Domain operation
        order.approve()

        # Persist
        self.repository.save(order)

        # Publish event
        self.event_publisher.publish(
            PurchaseOrderApproved(
                order_id=order.id,
                approved_by=user_id,
                timestamp=datetime.utcnow()
            )
        )

        return order
```

**File Size Guidelines**:
- `services.py`: 100-400 lines (one service per use case area)
- `commands.py`: 50-150 lines (dataclass command objects)
- `queries.py`: 50-150 lines (dataclass query objects)
- `ports.py`: 50-200 lines (Protocol definitions)
- `handlers.py`: 50-200 lines (event handlers)

### 2.3 Domain Layer (`domain/`)

**Purpose**: Core business logic, rules, and entities.

**Responsibilities**:
- Define business entities (pure Python dataclasses)
- Implement business rules and invariants
- Define domain events
- Ensure entity consistency
- No external dependencies (framework-agnostic)

**What NOT to do**:
- Database concerns (SQLAlchemy, repositories)
- HTTP handling (FastAPI, requests)
- External service calls (Odoo, APIs)
- Framework-specific code

**Example**:

```python
# modules/procurement/domain/entities.py
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional

class OrderState(Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"

@dataclass
class PurchaseOrderLine:
    material_id: str
    material_name: str
    quantity: int
    unit_price: Decimal
    subtotal: Decimal

@dataclass
class PurchaseOrder:
    id: str
    po_number: str
    supplier_id: str
    project_id: str
    total_amount: Decimal
    state: OrderState
    line_items: list[PurchaseOrderLine]
    created_at: datetime
    updated_at: datetime
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None

    def approve(self, user_id: str):
        """Approve the order if in valid state."""
        if self.state != OrderState.SUBMITTED:
            raise InvalidStateError(
                f"Cannot approve order in {self.state} state"
            )

        self.state = OrderState.APPROVED
        self.approved_by = user_id
        self.approved_at = datetime.utcnow()

    def reject(self, user_id: str, reason: str):
        """Reject the order."""
        if self.state not in [OrderState.SUBMITTED, OrderState.APPROVED]:
            raise InvalidStateError(
                f"Cannot reject order in {self.state} state"
            )

        self.state = OrderState.REJECTED
        self.updated_at = datetime.utcnow()
```

```python
# modules/procurement/domain/rules.py
from modules.procurement.domain.entities import PurchaseOrder, OrderState

def can_approve_order(order: PurchaseOrder, user_id: str) -> bool:
    """Check if user can approve the order."""
    if order.state != OrderState.SUBMITTED:
        return False

    # Additional business rules would go here
    # e.g., user must be in procurement role
    # e.g., order amount must be within approval limit

    return True

def validate_order_amount(order: PurchaseOrder, max_amount: Decimal) -> bool:
    """Validate order amount is within limit."""
    return order.total_amount <= max_amount
```

**File Size Guidelines**:
- `entities.py`: 100-300 lines (all entities for module)
- `rules.py`: 50-150 lines (all business rules)
- `events.py`: 50-150 lines (all domain events)
- `value_objects.py`: 50-150 lines (if needed)

### 2.4 Infrastructure Layer (`infrastructure/`)

**Purpose**: External concerns, persistence, adapters.

**Responsibilities**:
- SQLAlchemy ORM models
- Repository implementations
- External service adapters (Odoo, email, etc.)
- Mappers between entities and models

**What NOT to do**:
- Business logic (belongs in domain)
- Use case orchestration (belongs in application)

**Example**:

```python
# modules/procurement/infrastructure/models.py
from sqlalchemy import Column, String, Numeric, DateTime, Enum, JSON
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum

from app.core.database import Base

class OrderStateEnum(enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"

class PurchaseOrderModel(Base):
    __tablename__ = "purchase_orders"
    __table_args__ = {"schema": "procurement"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    po_number = Column(String(50), unique=True, nullable=False)
    supplier_id = Column(String(100), nullable=False)
    project_id = Column(String(100), nullable=False)
    total_amount = Column(Numeric(20, 2), nullable=False)
    state = Column(Enum(OrderStateEnum), nullable=False)
    line_items = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)
    approved_by = Column(String(100))
    approved_at = Column(DateTime(timezone=True))
```

```python
# modules/procurement/infrastructure/repository.py
from sqlalchemy.orm import Session
from modules.procurement.infrastructure.models import PurchaseOrderModel
from modules.procurement.domain.entities import PurchaseOrder, OrderState
from modules.procurement.application.ports import PurchaseOrderRepository

class SqlAlchemyPurchaseOrderRepository(PurchaseOrderRepository):
    def __init__(self, session: Session):
        self.session = session

    def get_by_id(self, order_id: str) -> PurchaseOrder:
        model = self.session.query(PurchaseOrderModel).filter(
            PurchaseOrderModel.id == order_id
        ).first()

        if not model:
            raise NotFoundError(f"Purchase order {order_id} not found")

        return self._to_entity(model)

    def save(self, order: PurchaseOrder) -> PurchaseOrder:
        model = self.session.query(PurchaseOrderModel).filter(
            PurchaseOrderModel.id == order.id
        ).first()

        if model:
            # Update
            model.state = OrderStateEnum(order.state.value)
            model.updated_at = order.updated_at
            model.approved_by = order.approved_by
            model.approved_at = order.approved_at
        else:
            # Create
            model = PurchaseOrderModel(
                id=order.id,
                po_number=order.po_number,
                supplier_id=order.supplier_id,
                project_id=order.project_id,
                total_amount=order.total_amount,
                state=OrderStateEnum(order.state.value),
                line_items=[asdict(item) for item in order.line_items],
                created_at=order.created_at,
                updated_at=order.updated_at
            )
            self.session.add(model)

        self.session.commit()
        return self._to_entity(model)

    def _to_entity(self, model: PurchaseOrderModel) -> PurchaseOrder:
        return PurchaseOrder(
            id=str(model.id),
            po_number=model.po_number,
            supplier_id=model.supplier_id,
            project_id=model.project_id,
            total_amount=Decimal(model.total_amount),
            state=OrderState(model.state.value),
            line_items=[
                PurchaseOrderLine(**item)
                for item in model.line_items
            ],
            created_at=model.created_at,
            updated_at=model.updated_at,
            approved_by=model.approved_by,
            approved_at=model.approved_at
        )
```

**File Size Guidelines**:
- `models.py`: 100-400 lines (all models for module)
- `repository.py`: 150-500 lines (all repository methods)
- `mappers.py`: 50-200 lines (if complex mapping needed)

### 2.5 ML Layer (`ml/`)

**Purpose**: Module-specific machine learning inference and evaluation.

**Responsibilities**:
- Feature engineering
- Model inference adapters
- Model evaluation metrics
- Model-specific preprocessing

**What NOT to do**:
- Model training (belongs in `ml/training/` monorepo folder)
- General ML utilities (belongs in `shared/ml/`)

**Example**:

```python
# modules/procurement/ml/inference.py
from typing import List
import numpy as np
from sklearn.ensemble import IsolationForest
from modules.procurement.domain.entities import PurchaseOrder
from modules.procurement.application.ports import RiskScorer

class IsolationForestRiskScorer(RiskScorer):
    def __init__(self, model: IsolationForest, feature_columns: List[str]):
        self.model = model
        self.feature_columns = feature_columns

    def score(self, order: PurchaseOrder) -> float:
        """Score purchase order risk (higher = more anomalous)."""
        features = self._extract_features(order)
        features_array = np.array([list(features.values())])

        # IsolationForest: negative score_samples = anomaly score
        anomaly_score = -self.model.score_samples(features_array)[0]

        return float(anomaly_score)

    def _extract_features(self, order: PurchaseOrder) -> dict:
        """Extract features from purchase order."""
        return {
            "total_amount": float(order.total_amount),
            "line_item_count": len(order.line_items),
            "avg_unit_price": np.mean([
                item.unit_price for item in order.line_items
            ]),
            "quantity_total": sum(item.quantity for item in order.line_items)
        }
```

**File Size Guidelines**:
- `features.py`: 100-300 lines
- `inference.py`: 100-300 lines
- `evaluation.py`: 50-200 lines

## 3. Module Communication

### 3.1 Defining Interfaces (Ports)

In the consuming module's `application/ports.py`:

```python
# modules/procurement/application/ports.py
from typing import Protocol
from modules.procurement.domain.entities import PurchaseOrder

class InventoryQueryService(Protocol):
    """Interface for inventory queries."""
    def get_available_stock(self, material_id: str, project_id: str) -> StockLevel:
        ...

class RiskScorer(Protocol):
    """Interface for ML risk scoring."""
    def score(self, order: PurchaseOrder) -> float:
        ...
```

### 3.2 Implementing Interfaces

In the owning module's `application/services.py`:

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

### 3.3 Registering Dependencies

In `app/bootstrap.py`:

```python
from modules.inventory.application.services import InventoryQueryServiceImpl
from modules.procurement.application.ports import InventoryQueryService

def register_dependencies(container: DIContainer):
    container.register(
        InventoryQueryService,
        InventoryQueryServiceImpl
    )
```

## 4. Testing Strategy

### 4.1 Domain Tests (`test_domain.py`)

Test business logic in isolation (no database, no external services).

```python
def test_can_approve_order():
    order = PurchaseOrder(
        id="1",
        po_number="PO-001",
        supplier_id="SUP-001",
        project_id="PROJ-001",
        total_amount=Decimal("10000.00"),
        state=OrderState.SUBMITTED,
        line_items=[],
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

    order.approve(user_id="user-123")

    assert order.state == OrderState.APPROVED
    assert order.approved_by == "user-123"
    assert order.approved_at is not None
```

### 4.2 Application Tests (`test_application.py`)

Test use case orchestration with mocked repositories and external services.

```python
def test_approve_order_with_insufficient_stock():
    # Arrange
    mock_repo = Mock(spec=PurchaseOrderRepository)
    mock_inventory = Mock(spec=InventoryQueryService)
    mock_inventory.get_available_stock.return_value = StockLevel(
        available_quantity=10
    )

    order = PurchaseOrder(
        id="1",
        po_number="PO-001",
        supplier_id="SUP-001",
        project_id="PROJ-001",
        total_amount=Decimal("10000.00"),
        state=OrderState.SUBMITTED,
        line_items=[PurchaseOrderLine(
            material_id="MAT-001",
            material_name="Cement",
            quantity=100,  # Requesting 100, only 10 available
            unit_price=Decimal("100.00"),
            subtotal=Decimal("10000.00")
        )],
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

    mock_repo.get_by_id.return_value = order

    service = PurchaseOrderService(
        repository=mock_repo,
        inventory_service=mock_inventory,
        event_publisher=Mock()
    )

    # Act & Assert
    with pytest.raises(InsufficientStockError):
        service.approve_order("1", "user-123")
```

### 4.3 Infrastructure Tests (`test_infrastructure.py`)

Test repository implementations with test database.

```python
@pytest.fixture
def session(test_db):
    yield test_db.session

def test_repository_save_and_retrieve(session):
    repo = SqlAlchemyPurchaseOrderRepository(session)

    order = PurchaseOrder(
        id=str(uuid.uuid4()),
        po_number="PO-001",
        supplier_id="SUP-001",
        project_id="PROJ-001",
        total_amount=Decimal("10000.00"),
        state=OrderState.SUBMITTED,
        line_items=[],
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

    repo.save(order)
    retrieved = repo.get_by_id(order.id)

    assert retrieved.po_number == "PO-001"
    assert retrieved.state == OrderState.SUBMITTED
```

## 5. Module Registration

Register module in FastAPI app:

```python
# app/main.py
from modules.procurement.api.routes import router as procurement_router
from modules.cost_forecasting.api.routes import router as cost_router
# ... other modules

app = FastAPI()

app.include_router(procurement_router)
app.include_router(cost_router)
# ... other routers
```

## 6. Summary Checklist

For each module:

- [ ] Create four-layer folder structure (api, application, domain, infrastructure)
- [ ] Define domain entities (dataclasses, no framework dependencies)
- [ ] Implement business rules in domain layer
- [ ] Define domain events
- [ ] Create SQLAlchemy models in infrastructure
- [ ] Implement repository with entity ↔ model mapping
- [ ] Define application services (use case orchestration)
- [ ] Define ports (Protocols) for external dependencies
- [ ] Implement event handlers
- [ ] Create FastAPI routes and Pydantic schemas
- [ ] Implement ML inference adapters (if applicable)
- [ ] Write domain tests (pure Python, no mocks)
- [ ] Write application tests (mock repositories and external services)
- [ ] Write infrastructure tests (test database)
- [ ] Register module in main FastAPI app
- [ ] Register dependencies in bootstrap.py
