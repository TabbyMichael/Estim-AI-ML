# ADR-002: Database Schema Separation

## Status

Accepted

## Context

The Estim AI Platform has seven business modules (procurement, cost forecasting, inventory, maintenance, project risk, visual inspection, document intelligence) plus shared platform services (identity, notifications, reporting, audit).

We need to organize the PostgreSQL database to support:
- Clear module boundaries
- Data ownership and access control
- Independent module evolution
- Audit and compliance requirements

## Decision

We use **one PostgreSQL instance with module-owned schemas**.

Each module has its own schema (e.g., `procurement`, `cost_forecasting`, `inventory`). A shared `platform` schema contains cross-cutting concerns (outbox events, audit logs, model versions).

## Schema Structure

```sql
estim_ai
├── identity
│   ├── users
│   ├── roles
│   └── permissions
├── procurement
│   ├── purchase_orders
│   ├── purchase_order_lines
│   ├── supplier_snapshots
│   ├── anomaly_predictions
│   └── reviews
├── cost_forecasting
│   ├── project_cost_snapshots
│   ├── forecasts
│   └── forecast_evaluations
├── inventory
│   ├── stock_snapshots
│   ├── demand_forecasts
│   └── reorder_recommendations
├── maintenance
│   ├── equipment
│   ├── maintenance_records
│   └── failure_predictions
├── project_risk
│   ├── milestones
│   ├── risk_predictions
│   └── risk_reviews
├── visual_inspection
│   ├── inspections
│   ├── image_assets
│   └── defect_detections
├── document_intelligence
│   ├── documents
│   ├── document_chunks
│   ├── embeddings
│   └── retrieval_audit
└── platform
    ├── outbox_events
    ├── job_runs
    ├── model_versions
    └── audit_logs
```

## Data Ownership Rules

### 1. Schema Ownership

- Each module owns its schema tables
- Only the module's infrastructure layer can modify its tables
- Other modules access data through application interfaces only

### 2. Cross-Module References

- **DO NOT**: Foreign keys across schemas
- **DO NOT**: Direct SELECT/INSERT/UPDATE across schemas
- **DO**: Reference by ID only (string or integer identifiers)
- **DO**: Access through application interfaces (service methods)

Example of CORRECT pattern:
```python
# procurement module needs supplier info from integrations
class SupplierInfoService(Protocol):
    def get_supplier_snapshot(self, supplier_id: str) -> SupplierSnapshot:
        ...

# procurement calls through interface
supplier = supplier_info_service.get_supplier_snapshot(supplier_id)
```

Example of INCORRECT pattern:
```python
# WRONG: Direct database access across schemas
db.execute(
    "SELECT * FROM integrations.suppliers WHERE id = ?",
    supplier_id
)
```

### 3. Shared Platform Schema

The `platform` schema contains:
- `outbox_events`: Transactional outbox for domain events
- `job_runs`: Background job execution history
- `model_versions`: ML model registry and deployment tracking
- `audit_logs`: Cross-module audit trail

These are accessible by all modules through shared services.

## Migration Strategy

### Alembic Configuration

Each module has its own migration files, organized by schema:

```
apps/api/migrations/
├── versions/
│   ├── 001_initial_identity_schema.py
│   ├── 002_initial_procurement_schema.py
│   ├── 003_initial_cost_forecasting_schema.py
│   ├── 004_initial_inventory_schema.py
│   ├── 005_initial_maintenance_schema.py
│   ├── 006_initial_project_risk_schema.py
│   ├── 007_initial_visual_inspection_schema.py
│   ├── 008_initial_document_intelligence_schema.py
│   ├── 009_initial_platform_schema.py
│   └── 010_initial_odoo_integration_schema.py
└── env.py
```

### Schema Creation in Migrations

```python
def upgrade():
    # Create procurement schema
    op.execute("CREATE SCHEMA IF NOT EXISTS procurement")

    # Create tables in procurement schema
    op.create_table(
        "purchase_orders",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("po_number", sa.String(50), unique=True),
        sa.Column("supplier_id", sa.String(100)),
        sa.Column("total_amount", sa.Numeric(20, 2)),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True)),
        schema="procurement"
    )
```

## Access Control

### Database User Permissions

In production, create separate database users for each module:

```sql
-- User for procurement module
CREATE USER estim_procurement WITH PASSWORD 'secure_password';
GRANT USAGE ON SCHEMA procurement TO estim_procurement;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA procurement TO estim_procurement;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA procurement TO estim_procurement;

-- User for cost forecasting module
CREATE USER estim_cost_forecasting WITH PASSWORD 'secure_password';
GRANT USAGE ON SCHEMA cost_forecasting TO estim_cost_forecasting;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA cost_forecasting TO estim_cost_forecasting;
```

### Application-Level Enforcement

Even with database permissions, enforce boundaries in code:

```python
# Architectural test to prevent cross-schema access
def test_no_cross_schema_access():
    for python_file in all_python_files:
        if python_file.module == "procurement":
            assert "cost_forecasting" not in python_file.content
            assert "inventory" not in python_file.content
            # etc.
```

## When to Violate This Rule

Cross-schema access is ONLY allowed for:
1. **Read-only analytical queries** in reporting module (denormalized views)
2. **Database migrations** that span schemas (rare, carefully reviewed)
3. **Platform schema access** (outbox, audit logs are intentionally shared)

All violations must be:
- Documented in code comments
- Reviewed in architecture review
- Tested in architectural tests

## Consequences

### Positive

- Clear data ownership
- Easier to reason about data flow
- Can extract schemas to separate databases later if needed
- Enforces module boundaries at infrastructure level

### Negative

- More complex joins require application-level coordination
- Reporting requires data movement or application interfaces
- Schema management requires discipline

### Mitigation

- Application interfaces for cross-module data access
- Denormalized tables in platform schema for reporting
- Materialized views for read-only cross-schema queries
- Architectural tests to enforce boundaries

## References

- [ADR-001: Modular Monolith vs Microservices](./001-modular-monolith.md)
- [PostgreSQL Schema Documentation](https://www.postgresql.org/docs/current/ddl-schemas.html)
