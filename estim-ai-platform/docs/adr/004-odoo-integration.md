# ADR-004: Odoo Integration Strategy

## Status

Accepted

## Context

Estim Construction is rolling out Odoo ERP and wants AI integrated into its operations. The Estim AI Platform must:

- Read data from Odoo (purchase orders, inventory, projects, accounting)
- Potentially write recommendations back to Odoo (controlled workflows)
- Maintain data synchronization between Odoo and the AI platform
- Handle Odoo upgrades and API changes gracefully

## Decision

We treat Odoo as an **external enterprise system** with a **centralized integration adapter** acting as an anti-corruption layer.

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Odoo ERP                              │
│  Purchase Orders | Inventory | Projects | Accounting         │
└────────────────────────┬────────────────────────────────────┘
                           │ XML-RPC / REST API
┌─────────────────────────────────────────────────────────────┐
│              Odoo Integration Adapter                       │
│  - Authentication & Session Management                      │
│  - Rate Limiting & Retry Logic                               │
│  - Data Normalization (Odoo → Internal DTOs)                 │
│  - Incremental Synchronization                               │
│  - Error Handling & Reconciliation                           │
└────────────────────────┬────────────────────────────────────┘
                           │ Internal DTOs
┌─────────────────────────────────────────────────────────────┐
│              Estim AI Platform Modules                       │
│  Procurement │ Cost Forecasting │ Inventory │ etc.         │
└─────────────────────────────────────────────────────────────┘
```

## Key Principles

### 1. Anti-Corruption Layer

Odoo data structures should not leak into business modules. The integration adapter:

- Translates Odoo models to internal domain entities
- Hides Odoo-specific field names and relationships
- Provides stable interfaces independent of Odoo version

```python
# WRONG: Odoo model leaks into domain
class PurchaseOrder:
    odoo_id: int  # Odoo-specific
    partner_id: int  # Odoo naming
    amount_total: float  # Odoo field name

# CORRECT: Internal domain entity
class PurchaseOrder:
    id: str  # Internal UUID
    po_number: str  # Business identifier
    supplier_id: str  # Internal reference
    total_amount: Decimal  # Business term
```

### 2. Incremental Synchronization

- Do not pull all data on every sync
- Track last synchronization timestamp per entity type
- Use Odoo's `write_date` field for incremental updates
- Support full re-sync for recovery scenarios

### 3. Idempotency

- Synchronization must be idempotent (safe to retry)
- Use internal IDs to prevent duplicate imports
- Handle Odoo record updates gracefully

### 4. No Direct Odoo Access

- Business modules must not import Odoo libraries
- All Odoo access goes through integration module
- Integration module provides application interfaces

## Integration Module Structure

```
modules/integrations/odoo/
├── api/
│   ├── routes.py          # Webhooks for Odoo callbacks
│   └── schemas.py         # API request/response schemas
├── application/
│   ├── services.py       # Orchestration of sync workflows
│   ├── commands.py       # Sync commands (trigger sync, re-sync)
│   └── queries.py        # Query sync status, errors
├── domain/
│   ├── entities.py       # Odoo connection config, sync state
│   ├── rules.py          # Sync rules (frequency, batching)
│   └── events.py         # OdooSyncCompleted, OdooSyncFailed
├── infrastructure/
│   ├── odoo_client.py    # Odoo XML-RPC/REST client
│   ├── transformers.py   # Odoo → Internal DTO mapping
│   ├── sync_job.py       # Background sync job
│   └── repository.py     # Sync state persistence
└── tests/
```

## Data Flow Examples

### Example 1: Purchase Order Synchronization

```python
# modules/integrations/odoo/infrastructure/transformers.py
class PurchaseOrderTransformer:
    def from_odoo(self, odoo_po: dict) -> PurchaseOrderDTO:
        """Transform Odoo purchase.order to internal DTO."""
        return PurchaseOrderDTO(
            po_number=odoo_po["name"],
            supplier_external_id=str(odoo_po["partner_id"][0]),
            supplier_name=odoo_po["partner_id"][1],
            total_amount=Decimal(str(odoo_po["amount_total"])),
            currency=odoo_po["currency_id"][1],
            order_date=datetime.fromisoformat(odoo_po["date_order"]),
            state=odoo_po["state"],
            line_items=[
                self._transform_line(line)
                for line in odoo_po["order_line"]
            ]
        )

    def _transform_line(self, odoo_line: dict) -> PurchaseOrderLineDTO:
        return PurchaseOrderLineDTO(
            product_external_id=str(odoo_line[2]),
            product_name=odoo_line[2],
            quantity=odoo_line[3],
            unit_price=Decimal(str(odoo_line[5])),
            subtotal=Decimal(str(odoo_line[6]))
        )
```

```python
# modules/integrations/odoo/application/services.py
class OdooSyncService:
    def __init__(
        self,
        odoo_client: OdooClient,
        transformer: PurchaseOrderTransformer,
        procurement_service: ProcurementImportService,
        sync_repository: SyncStateRepository,
        event_publisher: EventPublisher
    ):
        self.odoo_client = odoo_client
        self.transformer = transformer
        self.procurement_service = procurement_service
        self.sync_repository = sync_repository
        self.event_publisher = event_publisher

    def sync_purchase_orders(self, since: datetime | None = None):
        """Synchronize purchase orders from Odoo."""
        try:
            # Get updated POs from Odoo
            odoo_pos = self.odoo_client.search_read(
                model="purchase.order",
                domain=[
                    ("state", "=", "purchase"),
                    ("write_date", ">=", since) if since else []
                ],
                fields=["name", "partner_id", "amount_total", "date_order", "state", "order_line"]
            )

            imported_count = 0
            for odoo_po in odoo_pos:
                # Transform to internal DTO
                dto = self.transformer.from_odoo(odoo_po)

                # Import into procurement module
                self.procurement_service.import_purchase_order(dto)
                imported_count += 1

            # Update sync state
            self.sync_repository.update_last_sync(
                entity_type="purchase_order",
                last_sync=datetime.utcnow()
            )

            # Publish event
            self.event_publisher.publish(OdooSyncCompleted(
                entity_type="purchase_order",
                count=imported_count,
                timestamp=datetime.utcnow()
            ))

        except Exception as e:
            self.event_publisher.publish(OdooSyncFailed(
                entity_type="purchase_order",
                error=str(e),
                timestamp=datetime.utcnow()
            ))
            raise
```

### Example 2: Write-Back Workflow (Controlled)

We DO NOT write ML predictions directly to Odoo financial records. Instead:

```python
# Example: Anomaly review recommendation
class AnomalyReviewWorkflow:
    def __init__(
        self,
        procurement_service: ProcurementService,
        odoo_client: OdooClient
    ):
        self.procurement_service = procurement_service
        self.odoo_client = odoo_client

    def submit_review_decision(
        self,
        anomaly_id: str,
        decision: "approve" | "reject" | "investigate",
        reviewer_id: str
    ):
        """Human reviewer submits decision on anomaly."""
        anomaly = self.procurement_service.get_anomaly(anomaly_id)

        if decision == "approve":
            # Approve the purchase order in Odoo
            self.odoo_client.button_approve(
                model="purchase.order",
                record_id=anomaly.odoo_po_id
            )
            self.procurement_service.mark_anomaly_approved(anomaly_id)

        elif decision == "reject":
            # Cancel the purchase order in Odoo
            self.odoo_client.button_cancel(
                model="purchase.order",
                record_id=anomaly.odoo_po_id
            )
            self.procurement_service.mark_anomaly_rejected(anomaly_id)

        # Log decision for audit
        self.procurement_service.log_review_decision(
            anomaly_id, decision, reviewer_id
        )
```

## Odoo Client Implementation

```python
# modules/integrations/odoo/infrastructure/odoo_client.py
import xmlrpc.client
from typing import Any, Optional

class OdooClient:
    """Wrapper around Odoo XML-RPC API."""

    def __init__(
        self,
        url: str,
        db: str,
        username: str,
        password: str
    ):
        self.url = url
        self.db = db
        self.username = username
        self.password = password

        # Initialize XML-RPC clients
        self.common = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/common")
        self.models = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/object")

        self._uid: Optional[int] = None

    def authenticate(self) -> int:
        """Authenticate with Odoo and return user ID."""
        self._uid = self.common.authenticate(
            self.db,
            self.username,
            self.password,
            {}
        )
        if not self._uid:
            raise OdooAuthenticationError("Failed to authenticate")
        return self._uid

    def search_read(
        self,
        model: str,
        domain: list[list[Any]],
        fields: list[str],
        limit: int = 1000,
        offset: int = 0
    ) -> list[dict]:
        """Search and read records from Odoo."""
        if not self._uid:
            self.authenticate()

        record_ids = self.models.execute_kw(
            self.db,
            self._uid,
            self.password,
            model,
            "search",
            [domain],
            {"limit": limit, "offset": offset}
        )

        return self.models.execute_kw(
            self.db,
            self._uid,
            self.password,
            model,
            "read",
            [record_ids],
            {"fields": fields}
        )

    def button_approve(self, model: str, record_id: int):
        """Call a button method on an Odoo record."""
        if not self._uid:
            self.authenticate()

        self.models.execute_kw(
            self.db,
            self._uid,
            self.password,
            model,
            "button_approve",
            [[record_id]]
        )
```

## Synchronization Strategy

### Sync Frequency

| Entity Type | Frequency | Rationale |
|-------------|-----------|-----------|
| Purchase Orders | Every 15 minutes | Critical for procurement AI |
| Inventory | Every 30 minutes | Needed for demand forecasting |
| Projects | Every hour | Needed for cost forecasting |
| Accounting | Every 4 hours | Less time-sensitive |

### Error Handling

1. **Transient Errors**: Retry with exponential backoff
2. **Authentication Errors**: Alert admin, pause sync
3. **Data Validation Errors**: Log, skip record, continue sync
4. **Odoo Downtime**: Pause sync, auto-resume when available

### Reconciliation

- Track sync errors in `odoo_sync_errors` table
- Provide admin UI to review and retry failed syncs
- Support manual re-sync of specific date ranges

## Security Considerations

### Credentials

- Store Odoo credentials in environment variables or secret manager
- Never commit credentials to repository
- Use least-privilege Odoo user (read-only for most operations)

### Network

- Use HTTPS for all Odoo connections
- Validate SSL certificates
- Consider VPN or private network if Odoo is on-premises

### Access Control

- Integration module authenticates with Odoo using service account
- Service account has only necessary permissions
- Audit all write-back operations

## Development Strategy

### Phase 1: Mock Odoo Integration

- Use mock Odoo client with synthetic data
- Develop transformers and sync logic against mocks
- Test integration module independently

### Phase 2: Read-Only Integration

- Connect to test Odoo instance
- Implement read-only synchronization
- Validate data transformations

### Phase 3: Write-Back Integration

- Implement controlled write-back workflows
- Test with non-production data
- Human approval required for all writes

## Consequences

### Positive

- Clear separation between Odoo and business logic
- Business modules insulated from Odoo changes
- Centralized place to handle Odoo-specific concerns
- Easy to test with mocks
- Can support multiple Odoo instances if needed

### Negative

- Additional layer of indirection
- Must maintain transformers for each Odoo model
- Sync latency between Odoo and AI platform
- Need to handle Odoo upgrades carefully

### Mitigation

- Comprehensive mapping tests
- Version detection in Odoo client
- Alerting on sync failures
- Manual override capabilities

## References

- [Odoo API Documentation](https://www.odoo.com/documentation/16.0/developer/api/external_api.html)
- [Anti-Corruption Layer Pattern](https://martinfowler.com/bliki/AntiCorruptionLayer.html)
- [ADR-003: Module Communication Patterns](./003-module-communication.md)
