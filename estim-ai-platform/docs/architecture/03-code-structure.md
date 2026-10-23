# Code Structure and File Size Guidelines

## 1. Overview

This document provides detailed guidelines for code organization, file structure, and file size limits to ensure maintainability across the Estim AI Platform codebase.

## 2. General Principles

### 2.1 File Size Limits

| File Type | Recommended Lines | Maximum Lines | Rationale |
|-----------|-------------------|---------------|-----------|
| Single function/method | 10-50 | 100 | Easier to test and understand |
| Class | 100-300 | 500 | Single responsibility, focused |
| Module file (.py) | 100-400 | 800 | Easy to navigate, reduces merge conflicts |
| Test file | 100-500 | 1000 | Organized by test case |
| Configuration file | 50-200 | 400 | Clear, readable config |
| Documentation (.md) | 100-500 | 2000 | Focused documentation |

**When to split files**:
- If a file exceeds recommended lines, consider splitting
- Split by logical responsibility (e.g., separate services by use case)
- Split tests by test class or feature area

### 2.2 Line Length

- **Maximum line length**: 100 characters (configured in `.editorconfig`)
- **Preferred line length**: 80-90 characters for readability
- **Exceptions**: URLs, long string literals, data tables

### 2.3 Function Complexity

- **Cyclomatic complexity**: Target < 10 per function
- **Nesting depth**: Maximum 4 levels
- **Parameters**: Maximum 5 parameters (use dataclasses for more)

### 2.4 Naming Conventions

| Entity | Convention | Example |
|--------|------------|---------|
| Modules/files | `snake_case` | `purchase_order_service.py` |
| Classes | `PascalCase` | `PurchaseOrderService` |
| Functions/Methods | `snake_case` | `approve_order()` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_ORDER_AMOUNT` |
| Private members | `_leading_underscore` | `_validate_internal()` |
| Type variables | `PascalCase` | `TModel`, `TEntity` |

## 3. Backend (FastAPI) Structure

### 3.1 Application Entry Points

#### `apps/api/app/main.py` (50-100 lines)

**Purpose**: FastAPI application initialization and middleware setup.

**Content**:
- FastAPI app instance creation
- CORS configuration
- Middleware registration
- Router inclusion
- Exception handlers
- Startup/shutdown events

**Example**:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import setup_logging
from modules.procurement.api.routes import router as procurement_router
from modules.cost_forecasting.api.routes import router as cost_router

setup_logging()

app = FastAPI(
    title="Estim AI Platform",
    description="Construction intelligence platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(procurement_router)
app.include_router(cost_router)

@app.on_event("startup")
async def startup():
    """Initialize database connections and background workers."""
    pass

@app.on_event("shutdown")
async def shutdown():
    """Cleanup resources."""
    pass
```

#### `apps/api/app/bootstrap.py` (100-200 lines)

**Purpose**: Dependency injection container setup and service registration.

**Content**:
- Container initialization
- Database session factory
- Repository registration
- Service registration
- External client registration

**Example**:

```python
from dependency_injector import containers, providers
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.core.database import Base
from modules.procurement.infrastructure.repository import SqlAlchemyPurchaseOrderRepository
from modules.procurement.application.services import PurchaseOrderService
from modules.inventory.application.services import InventoryQueryServiceImpl

class Container(containers.DeclarativeContainer):
    config = providers.Configuration()

    # Database
    engine = providers.Singleton(
        create_engine,
        settings.database_url
    )

    session_factory = providers.Singleton(
        sessionmaker,
        bind=engine
    )

    session = providers.ScopedSession(
        session_factory
    )

    # Repositories
    procurement_repository = providers.Factory(
        SqlAlchemyPurchaseOrderRepository,
        session=session
    )

    # Services
    inventory_service = providers.Factory(
        InventoryQueryServiceImpl,
        repository=inventory_repository
    )

    procurement_service = providers.Factory(
        PurchaseOrderService,
        repository=procurement_repository,
        inventory_service=inventory_service,
        event_publisher=event_publisher
    )
```

### 3.2 Core Infrastructure

#### `apps/api/app/core/config.py` (50-150 lines)

**Purpose**: Application configuration and environment variables.

**Content**:
- Settings class with Pydantic
- Environment variable parsing
- Validation rules
- Default values

**Example**:

```python
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    app_name: str = "Estim AI Platform"
    debug: bool = False

    database_url: str
    redis_url: str

    cors_origins: List[str] = ["http://localhost:3000"]

    odoo_url: str
    odoo_db: str
    odoo_username: str
    odoo_password: str

    mlflow_tracking_uri: str = "http://localhost:5000"

    class Config:
        env_file = ".env"

settings = Settings()
```

#### `apps/api/app/core/database.py` (50-100 lines)

**Purpose**: Database session management and base model.

**Content**:
- SQLAlchemy engine setup
- Session factory
- Base declarative class
- Session dependency for FastAPI

**Example**:

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
from app.core.config import settings

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db() -> Session:
    """FastAPI dependency for database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

#### `apps/api/app/core/security.py` (50-150 lines)

**Purpose**: Authentication and authorization utilities.

**Content**:
- JWT token creation and verification
- Password hashing
- User context extraction
- Permission checking

**Example**:

```python
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm="HS256")
```

### 3.3 Module API Layer

#### `modules/{module}/api/routes.py` (100-300 lines)

**Purpose**: FastAPI route definitions.

**Content**:
- Router instance with prefix and tags
- Route handlers (GET, POST, PUT, DELETE)
- Dependency injection
- Error handling
- Response models

**Example**:

```python
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from modules.procurement.api.schemas import (
    PurchaseOrderCreate,
    PurchaseOrderResponse,
    PurchaseOrderListResponse
)
from modules.procurement.application.services import PurchaseOrderService

router = APIRouter(prefix="/procurement/purchase-orders", tags=["procurement"])

@router.post("", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
def create_purchase_order(
    request: PurchaseOrderCreate,
    service: PurchaseOrderService = Depends()
) -> PurchaseOrderResponse:
    """Create a new purchase order."""
    try:
        order = service.create_order(request)
        return PurchaseOrderResponse.from_entity(order)
    except DuplicateOrderError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("", response_model=PurchaseOrderListResponse)
def list_purchase_orders(
    skip: int = 0,
    limit: int = 100,
    service: PurchaseOrderService = Depends()
) -> PurchaseOrderListResponse:
    """List purchase orders with pagination."""
    orders = service.list_orders(skip=skip, limit=limit)
    return PurchaseOrderListResponse(
        orders=[PurchaseOrderResponse.from_entity(o) for o in orders],
        total=len(orders)
    )
```

#### `modules/{module}/api/schemas.py` (50-200 lines)

**Purpose**: Pydantic models for request/response validation.

**Content**:
- Request schemas (input validation)
- Response schemas (output formatting)
- Conversion methods (to/from entities)
- Field validators

**Example**:

```python
from pydantic import BaseModel, Field, validator
from decimal import Decimal
from datetime import datetime
from typing import List, Optional
from modules.procurement.domain.entities import PurchaseOrder, OrderState

class PurchaseOrderLineCreate(BaseModel):
    material_id: str = Field(..., description="Material identifier")
    material_name: str = Field(..., description="Material name")
    quantity: int = Field(..., gt=0, description="Quantity")
    unit_price: Decimal = Field(..., gt=0, description="Unit price")

    @validator("unit_price")
    def validate_price(cls, v):
        if v > Decimal("1000000"):
            raise ValueError("Unit price too high")
        return v

class PurchaseOrderCreate(BaseModel):
    po_number: str = Field(..., description="Purchase order number")
    supplier_id: str = Field(..., description="Supplier identifier")
    project_id: str = Field(..., description="Project identifier")
    line_items: List[PurchaseOrderLineCreate] = Field(..., min_items=1)

class PurchaseOrderResponse(BaseModel):
    id: str
    po_number: str
    supplier_id: str
    project_id: str
    total_amount: Decimal
    state: str
    line_items: List[dict]
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_entity(cls, order: PurchaseOrder) -> "PurchaseOrderResponse":
        return cls(
            id=order.id,
            po_number=order.po_number,
            supplier_id=order.supplier_id,
            project_id=order.project_id,
            total_amount=order.total_amount,
            state=order.state.value,
            line_items=[asdict(item) for item in order.line_items],
            created_at=order.created_at,
            updated_at=order.updated_at
        )
```

### 3.4 Module Application Layer

#### `modules/{module}/application/services.py` (100-400 lines)

**Purpose**: Use case orchestration and business workflow.

**Content**:
- Service class with constructor DI
- Use case methods (approve, create, update)
- Transaction management
- Authorization checks
- Event publishing
- External service calls through interfaces

**Example**:

```python
from typing import Optional
from modules.procurement.domain.entities import PurchaseOrder
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

    def create_order(self, request: PurchaseOrderCreate) -> PurchaseOrder:
        """Create a new purchase order with validation."""
        # Check for duplicate
        if self.repository.exists_by_po_number(request.po_number):
            raise DuplicateOrderError(f"PO {request.po_number} already exists")

        # Create entity
        order = PurchaseOrder(
            id=str(uuid.uuid4()),
            po_number=request.po_number,
            supplier_id=request.supplier_id,
            project_id=request.project_id,
            total_amount=sum(
                item.quantity * item.unit_price
                for item in request.line_items
            ),
            state=OrderState.DRAFT,
            line_items=[
                PurchaseOrderLine(**item.dict())
                for item in request.line_items
            ],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        # Persist
        self.repository.save(order)

        # Publish event
        self.event_publisher.publish(
            PurchaseOrderCreated(
                order_id=order.id,
                po_number=order.po_number,
                timestamp=datetime.utcnow()
            )
        )

        return order
```

#### `modules/{module}/application/ports.py` (50-200 lines)

**Purpose**: Interface definitions (Protocols) for external dependencies.

**Content**:
- Protocol definitions for services
- Type hints for methods
- Documentation of expected behavior

**Example**:

```python
from typing import Protocol
from modules.procurement.domain.entities import PurchaseOrder
from modules.inventory.domain.value_objects import StockLevel

class InventoryQueryService(Protocol):
    """Interface for inventory queries provided by inventory module."""

    def get_available_stock(
        self,
        material_id: str,
        project_id: str
    ) -> StockLevel:
        """Get current stock level for a material in a project.

        Args:
            material_id: Material identifier
            project_id: Project identifier

        Returns:
            StockLevel with available quantity and last updated timestamp
        """
        ...

class RiskScorer(Protocol):
    """Interface for ML risk scoring."""

    def score(self, order: PurchaseOrder) -> float:
        """Score purchase order risk.

        Returns:
            Anomaly score (higher = more anomalous)
        """
        ...
```

### 3.5 Module Domain Layer

#### `modules/{module}/domain/entities.py` (100-300 lines)

**Purpose**: Business entities (pure Python dataclasses).

**Content**:
- Dataclass definitions
- Business methods (state transitions)
- Invariants and validation
- No external dependencies

**Example**:

```python
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import List, Optional

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
    line_items: List[PurchaseOrderLine]
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
        self.updated_at = datetime.utcnow()

    def calculate_total(self) -> Decimal:
        """Recalculate total from line items."""
        self.total_amount = sum(
            item.quantity * item.unit_price
            for item in self.line_items
        )
        return self.total_amount
```

#### `modules/{module}/domain/rules.py` (50-150 lines)

**Purpose**: Business rules and policies.

**Content**:
- Pure functions for business logic
- Rule validation functions
- No state or side effects

**Example**:

```python
from modules.procurement.domain.entities import PurchaseOrder, OrderState
from decimal import Decimal

def can_approve_order(order: PurchaseOrder, user_id: str) -> bool:
    """Check if user can approve the order."""
    if order.state != OrderState.SUBMITTED:
        return False
    if order.total_amount > Decimal("1000000"):
        return False  # Requires higher approval
    return True

def validate_order_amount(order: PurchaseOrder, max_amount: Decimal) -> bool:
    """Validate order amount is within limit."""
    return order.total_amount <= max_amount

def is_duplicate_po(po_number: str, existing_numbers: List[str]) -> bool:
    """Check if PO number already exists."""
    return po_number in existing_numbers
```

### 3.6 Module Infrastructure Layer

#### `modules/{module}/infrastructure/models.py` (100-400 lines)

**Purpose**: SQLAlchemy ORM models.

**Content**:
- Table definitions
- Column definitions with types
- Relationships (within module only)
- Indexes and constraints

**Example**:

```python
from sqlalchemy import Column, String, Numeric, DateTime, Enum, JSON, Index
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum
from datetime import datetime

from app.core.database import Base

class OrderStateEnum(enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"

class PurchaseOrderModel(Base):
    __tablename__ = "purchase_orders"
    __table_args__ = {
        "schema": "procurement",
        Index("ix_procurement_po_number", "po_number"),
        Index("ix_procurement_supplier_id", "supplier_id"),
    }

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    po_number = Column(String(50), unique=True, nullable=False, index=True)
    supplier_id = Column(String(100), nullable=False, index=True)
    project_id = Column(String(100), nullable=False, index=True)
    total_amount = Column(Numeric(20, 2), nullable=False)
    state = Column(Enum(OrderStateEnum), nullable=False, default=OrderStateEnum.DRAFT)
    line_items = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    approved_by = Column(String(100))
    approved_at = Column(DateTime(timezone=True))
```

#### `modules/{module}/infrastructure/repository.py` (150-500 lines)

**Purpose**: Repository implementations with entity ↔ model mapping.

**Content**:
- Repository class
- CRUD operations
- Query methods
- Entity ↔ model conversion
- Database session management

**Example**:

```python
from typing import List, Optional
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
            self._update_model(model, order)
        else:
            model = self._create_model(order)
            self.session.add(model)

        self.session.commit()
        self.session.refresh(model)
        return self._to_entity(model)

    def list_orders(self, skip: int = 0, limit: int = 100) -> List[PurchaseOrder]:
        models = self.session.query(PurchaseOrderModel)\
            .offset(skip)\
            .limit(limit)\
            .all()

        return [self._to_entity(m) for m in models]

    def exists_by_po_number(self, po_number: str) -> bool:
        return self.session.query(PurchaseOrderModel)\
            .filter(PurchaseOrderModel.po_number == po_number)\
            .first() is not None

    def _to_entity(self, model: PurchaseOrderModel) -> PurchaseOrder:
        return PurchaseOrder(
            id=str(model.id),
            po_number=model.po_number,
            supplier_id=model.supplier_id,
            project_id=model.project_id,
            total_amount=Decimal(str(model.total_amount)),
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

    def _create_model(self, order: PurchaseOrder) -> PurchaseOrderModel:
        return PurchaseOrderModel(
            id=uuid.UUID(order.id),
            po_number=order.po_number,
            supplier_id=order.supplier_id,
            project_id=order.project_id,
            total_amount=order.total_amount,
            state=OrderStateEnum(order.state.value),
            line_items=[asdict(item) for item in order.line_items],
            created_at=order.created_at,
            updated_at=order.updated_at
        )

    def _update_model(self, model: PurchaseOrderModel, order: PurchaseOrder):
        model.state = OrderStateEnum(order.state.value)
        model.updated_at = order.updated_at
        model.approved_by = order.approved_by
        model.approved_at = order.approved_at
```

## 4. Frontend (Next.js) Structure

### 4.1 Component Guidelines

#### File Size: 50-200 lines per component

**Example**:

```typescript
// apps/web/src/components/procurement/PurchaseOrderTable.tsx
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table } from '@/components/ui/Table';

interface PurchaseOrderTableProps {
  projectId?: string;
}

export function PurchaseOrderTable({ projectId }: PurchaseOrderTableProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['purchase-orders', projectId],
    queryFn: () => fetchPurchaseOrders(projectId),
  });

  const columns = useMemo(() => [
    { key: 'poNumber', label: 'PO Number' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'totalAmount', label: 'Total Amount' },
    { key: 'state', label: 'State' },
  ], []);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading orders</div>;

  return (
    <Table
      columns={columns}
      data={data?.orders || []}
    />
  );
}
```

### 4.2 Page Structure

#### File Size: 100-300 lines per page

**Example**:

```typescript
// apps/web/src/app/(dashboard)/procurement/page.tsx
import { PurchaseOrderTable } from '@/components/procurement/PurchaseOrderTable';
import { CreateOrderButton } from '@/components/procurement/CreateOrderButton';

export default function ProcurementPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Procurement</h1>
        <CreateOrderButton />
      </div>

      <PurchaseOrderTable />
    </div>
  );
}
```

### 4.3 API Hooks

#### File Size: 50-150 lines per hook file

**Example**:

```typescript
// apps/web/src/features/procurement/hooks/usePurchaseOrders.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  totalAmount: number;
  state: string;
}

export function usePurchaseOrders(projectId?: string) {
  return useQuery({
    queryKey: ['purchase-orders', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/procurement/purchase-orders?projectId=${projectId}`);
      return response.json();
    },
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/procurement/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
}
```

## 5. ML Training Structure

### 5.1 Training Scripts

#### File Size: 100-400 lines per training script

**Example**:

```python
# ml/training/procurement/train_anomaly_detection.py
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import mlflow
import mlflow.sklearn

def load_data(path: str) -> pd.DataFrame:
    """Load and preprocess training data."""
    df = pd.read_csv(path)
    df = df.dropna()
    return df

def train_model(df: pd.DataFrame):
    """Train Isolation Forest model."""
    features = ['unit_price', 'quantity', 'total_amount']
    X = df[features]

    model = IsolationForest(
        n_estimators=200,
        contamination=0.03,
        random_state=42
    )

    model.fit(X)
    return model

def evaluate_model(model, X_test):
    """Evaluate model performance."""
    predictions = model.predict(X_test)
    # Calculate metrics
    return predictions

if __name__ == "__main__":
    mlflow.set_experiment("procurement-anomaly-detection")

    with mlflow.start_run():
        df = load_data("data/procurement/orders.csv")
        model = train_model(df)

        mlflow.sklearn.log_model(model, "model")
        mlflow.log_params({
            "n_estimators": 200,
            "contamination": 0.03
        })
```

## 6. Configuration Files

### 6.1 `docker-compose.yml` (100-300 lines)

**Purpose**: Define local development services.

**Content**:
- Service definitions (api, web, worker, postgres, redis, etc.)
- Volume mounts
- Environment variables
- Network configuration

### 6.2 `.env.example` (50-150 lines)

**Purpose**: Template for environment variables.

**Content**:
- All required environment variables
- Comments explaining each variable
- Example values (non-sensitive)

**Example**:

```bash
# Application
APP_NAME=Estim AI Platform
DEBUG=true

# Database
DATABASE_URL=postgresql://estim:estim@localhost:5432/estim_ai

# Redis
REDIS_URL=redis://localhost:6379/0

# Odoo Integration
ODOO_URL=https://odoo.estim.co.tz
ODOO_DB=production
ODOO_USERNAME=api_user
ODOO_PASSWORD=change_me

# Security
SECRET_KEY=change_me_in_production
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=30

# MLflow
MLFLOW_TRACKING_URI=http://localhost:5000

# CORS
CORS_ORIGINS=http://localhost:3000
```

## 7. Documentation Files

### 7.1 `README.md` (100-500 lines)

**Purpose**: Project overview and quick start.

**Content**:
- Project description
- Prerequisites
- Installation steps
- Running the application
- Testing
- Deployment

### 7.2 Module README (50-200 lines)

**Purpose**: Module-specific documentation.

**Location**: `modules/{module}/README.md`

**Content**:
- Module purpose
- Key features
- Domain entities
- API endpoints
- Usage examples

## 8. Code Quality Enforcement

### 8.1 Linting

- **Tool**: Ruff (fast Python linter)
- **Configuration**: `pyproject.toml`
- **CI**: Fail on lint errors

### 8.2 Type Checking

- **Tool**: mypy
- **Configuration**: `pyproject.toml`
- **Coverage**: Target 90%+ type coverage
- **CI**: Fail on type errors

### 8.3 Formatting

- **Tool**: Black (Python), Prettier (TypeScript)
- **Configuration**: `pyproject.toml`, `.prettierrc`
- **CI**: Auto-format in PR

### 8.4 Testing

- **Tool**: pytest (Python), Playwright (E2E)
- **Coverage**: Target 80%+ code coverage
- **CI**: Run tests on every PR

## 9. Architectural Tests

### 9.1 Module Boundary Tests

```python
# tests/architecture/test_module_boundaries.py
import os
from pathlib import Path

def test_no_cross_module_imports():
    """Ensure modules don't import each other's infrastructure."""
    modules = [
        "procurement",
        "cost_forecasting",
        "inventory",
        "maintenance",
        "project_risk",
        "visual_inspection",
        "document_intelligence"
    ]

    for module in modules:
        module_path = Path(f"apps/api/app/modules/{module}")
        for py_file in module_path.rglob("*.py"):
            content = py_file.read_text()
            for other_module in modules:
                if other_module != module:
                    # Check for direct model imports
                    assert f"modules.{other_module}.infrastructure.models" not in content
```

## 10. Summary Checklist

For every file created:

- [ ] File name follows `snake_case` convention
- [ ] File length within recommended limits
- [ ] Line length ≤ 100 characters
- [ ] Functions have clear, descriptive names
- [ ] Functions are ≤ 100 lines
- [ ] Classes have single responsibility
- [ ] Classes are ≤ 500 lines
- [ ] Type hints used for all public functions
- [ ] Docstrings for all public functions and classes
- [ ] No commented-out code
- [ ] No hardcoded secrets or configuration
- [ ] Imports organized (stdlib, third-party, local)
- [ ] No circular imports
