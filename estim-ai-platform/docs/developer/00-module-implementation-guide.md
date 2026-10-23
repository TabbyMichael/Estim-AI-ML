# Estim AI Platform - Module Implementation Guide

## 1. Purpose

This guide helps developers understand how to implement new modules, add features to existing modules, and navigate the modular monolith architecture.

## 2. Module Structure

Each module follows a consistent three-layer structure:

```
module-name/
├── domain/           # Business logic
│   ├── entities.py   # Domain entities
│   ├── events.py     # Domain events
│   └── rules.py      # Business rules
├── infrastructure/   # External adapters
│   ├── repositories.py  # Data access
│   ├── clients.py       # External APIs
│   └── transformers.py  # Data transformation
└── api/              # Public interface
    └── routes.py
```

## 3. Step-by-Step Implementation

### 3.1 Create Module Directory

```bash
mkdir -p apps/api/app/modules/{module_name}/{domain,infrastructure,api}
```

### 3.2 Implement Domain Layer

#### Domain Entities

```python
# apps/api/app/modules/procurement/domain/entities.py
from uuid import UUID
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ...shared.base_entity import BaseEntity

class Invoice(BaseEntity):
    __tablename__ = "invoices"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    supplier_id = Column(String, ForeignKey("supplier_contacts.id"), nullable=False)
    invoice_number = Column(String, unique=True, nullable=False)
    invoice_date = Column(DateTime, nullable=False)
    amount = Column(Numeric, nullable=False)
    status = Column(String, default="DRAFT")
    
    # Relationships
    supplier = relationship("SupplierContact", back_populates="invoices")
    
    # Domain events
    @property
    def status_changed_event(self):
        if self._status_changed:
            return InvoiceStatusChanged(
                invoice_id=self.id,
                old_status=self._old_status,
                new_status=self.status
            )
```

#### Domain Events


### 3.3 Implement Infrastructure Layer

#### Repository Pattern

```python
# apps/api/app/modules/procurement/infrastructure/repositories.py
from sqlalchemy.orm import Session
from ...domain.entities import Invoice

class InvoiceRepository:
    def __init__(self, db: Session):
        self.db = db
    
    def create(self, invoice: Invoice) -> Invoice:
        self.db.add(invoice)
        self.db.commit()
        self.db.refresh(invoice)
        return invoice
    
    def get_by_id(self, invoice_id: str) -> Invoice | None:
        return self.db.query(Invoice).filter(Invoice.id == invoice_id).first()
    
    def get_by_supplier(self, supplier_id: str) -> list[Invoice]:
        return self.db.query(Invoice).filter(
            Invoice.supplier_id == supplier_id
        ).all()
    
    def get_pending_sync(self) -> list[Invoice]:
        return self.db.query(Invoice).filter(
            Invoice.status == "DRAFT"
        ).all()
```

#### External Client

```python
# apps/api/app/modules/procurement/infrastructure/clients.py

### 3.4 Implement API Layer

```python
# apps/api/app/modules/procurement/api/routes.py
from fastapi import APIRouter, Depends, HTTPException
from ...domain.entities import Invoice
from ...domain.repositories import InvoiceRepository
from ...domain.events import InvoiceSynchronized

router = APIRouter(prefix="/procurement/invoices", tags=["Procurement"])

@router.post("")
async def create_invoice(
    invoice_data: dict,
    repository: InvoiceRepository = Depends(get_invoice_repository),
    current_user: User = Depends(get_current_user)
):
    # Business rule validation
    InvoiceRules.validate_amount(invoice_data["amount"])
    
    # Create domain entity

## 5. Testing Strategy

### 5.1 Unit Tests (Domain)

```python
# tests/unit/procurement/test_rules.py
def test_validate_amount_positive():
    InvoiceRules.validate_amount(Decimal("100.00"))
    
def test_validate_amount_negative_raises():
    with pytest.raises(ValueError):
        InvoiceRules.validate_amount(Decimal("-10.00"))
```

## 6. Common Patterns

### 6.1 Transactional Outbox

For reliable event delivery:

```python
@dataclass
class OutboxMessage:
    event_type: str
    payload: dict
    created_at: datetime

def create_outbox_message(event_type: str, payload: dict) -> OutboxMessage:
    return OutboxMessage(
        event_type=event_type,
        payload=payload,
        created_at=datetime.utcnow()
    )
```

### 6.2 CQRS Pattern

For read-heavy operations:

```python
class ForecastQuery:
    def get_forecast_by_project(self, project_id: str) -> list:
        # Query read model
        pass

class ForecastCommand:
    def update_forecast(self, forecast_id: str, data: dict):
        # Command write model
        pass
```

## 7. Related Documentation

- [Module Boundaries](../architecture/05-module-boundaries.md)
- [Data Flow](../architecture/04-data-flow.md)
- [Architecture Overview](../architecture/01-overview.md)


### 5.2 Integration Tests (Application)

```python
# tests/integration/procurement/test_invoice_flow.py
def test_create_invoice_traversal():
    # Given
    invoice_data = {...}
    
    # When
    response = client.post("/api/v1/procurement/invoices", json=invoice_data)
    
    # Then
    assert response.status_code == 201
    assert "id" in response.json()["data"]
```

### 5.3 Architectural Tests

```python
# tests/architecture/test_module_boundaries.py
def test_no_cross_module_access():
    # Verify that modules only access their own schema
    # via repository pattern, not direct model access
    modules = [
        "identity",
        "procurement",
        "cost_forecasting",
        # ... all modules
    ]
    
    for module in modules:
        # Check that module can only access own schema
        assert schema_exists(modules[module], "own_schema")
        assert not cross_schema_access(module)
```

    invoice = Invoice(
        supplier_id=invoice_data["supplier_id"],
        invoice_number=invoice_data["invoice_number"],
        invoice_date=invoice_data["invoice_date"],
        amount=invoice_data["amount"],
        status="DRAFT"
    )
    
    # Persist
    created = repository.create(invoice)
    
    # Publish domain event
    publish_event(InvoiceSynchronized(invoice_id=created.id, ...))
    
    return created
```

## 4. Module Boundaries

### 4.1 Don't Violate Boundaries

| ✅ Allowed | ❌ Not Allowed |
|------------|----------------|
| Call other module's API | Access other module's models directly |
| Use domain events | Access other module's database schema |
| Use interfaces | Import models from other modules |

### 4.2 Cross-Module Communication

```python
# ✅ Good: Use events
publish_event(InvoiceSynchronized(invoice_id=invoice.id, ...))

# ✅ Good: Use API clients for synchronous calls
supplier = SupplierClient.get_by_id(supplier_id)

# ❌ Bad: Direct model access
# from ...procurement.infrastructure.repositories import SupplierRepository
# supplier = SupplierRepository(db).get_by_id(supplier_id)
```

import httpx
from ...domain.events import InvoiceSynchronized, InvoiceSynchronizedFailed

class OdooClient:
    def __init__(self, base_url: str, username: str, password: str):
        self.base_url = base_url
        self.auth = (username, password)
    
    async def sync_invoice(self, invoice: Invoice) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/invoices",
                json=invoice.to_dict(),
                auth=self.auth
            )
            response.raise_for_status()
            return response.json()
```

#### Transformer

```python
# apps/api/app/modules/procurement/infrastructure/transformers.py
from ...domain.entities import Invoice

class InvoiceTransformer:
    @staticmethod
    def to_domain(invoice_dict: dict) -> Invoice:
        return Invoice(
            id=invoice_dict.get("id"),
            supplier_id=invoice_dict["supplier_id"],
            invoice_number=invoice_dict["invoice_number"],
            invoice_date=invoice_dict["invoice_date"],
            amount=invoice_dict["amount"],
            status=invoice_dict.get("status", "DRAFT"),
        )
    
    @staticmethod
    def to_dict(invoice: Invoice) -> dict:
        return {
            "id": invoice.id,
            "supplier_id": invoice.supplier_id,
            "invoice_number": invoice.invoice_number,
            "invoice_date": invoice.invoice_date.isoformat(),
            "amount": str(invoice.amount),
            "status": invoice.status,
        }
```

```python
# apps/api/app/modules/procurement/domain/events.py
from dataclasses import dataclass
from typing import Optional

@dataclass
class InvoiceSynchronized:
    invoice_id: str
    supplier_id: str
    synced_at: datetime
    
@dataclass
class InvoiceSynchronizedFailed:
    invoice_id: str
    error: str
    attempted_at: datetime
```

#### Business Rules

```python
# apps/api/app/modules/procurement/domain/rules.py
from decimal import Decimal

class InvoiceRules:
    @staticmethod
    def validate_amount(amount: Decimal) -> None:
        if amount <= Decimal('0'):
            raise ValueError("Invoice amount must be positive")
    
    @staticmethod
    def validate_status_transition(current: str, new: str) -> None:
        valid_transitions = {
            "DRAFT": ["SYNCED", "FAILED"],
            "SYNCED": ["REVIEWED", "FAILED"],
            "REVIEWED": ["APPROVED", "REJECTED"],
            "APPROVED": ["PAID", "CANCELLED"],
        }
        if new not in valid_transitions.get(current, []):
            raise ValueError(f"Invalid status transition: {current} -> {new}")
```
