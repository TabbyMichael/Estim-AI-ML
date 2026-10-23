# Estim AI Platform - Module Boundaries Documentation

## 1. Module Overview

The Estim AI Platform uses a **modular monolith** architecture where all business domains live in one FastAPI application. Each module has strict boundaries and owns its database schema.

## 2. Module Inventory

### 2.1 Complete Module List

| Module | Type | Database Schema | Primary Responsibility |
|--------|------|-----------------|------------------------|
| **Identity** | Core | `identity` | Authentication, users, roles, companies |
| **Procurement** | AI Module | `procurement` | Procurement intelligence, invoices, suppliers |
| **Cost Forecasting** | AI Module | `cost_forecasting` | Budget forecasting, EAC, cost anomaly detection |
| **Inventory** | AI Module | `inventory` | Stock management, reorder optimization |
| **Maintenance** | AI Module | `maintenance` | Equipment monitoring, failure prediction |
| **Project Risk** | AI Module | `project_risk` | Schedule risk, milestone assessment |
| **Visual Inspection** | AI Module | `visual_inspection` | Computer vision, defect detection |
| **Document Intelligence** | AI Module | `document_intelligence` | RAG, document search, extraction |

## 3. Strict Module Boundaries

### 3.1 Boundary Rules

Each module must follow these rules to maintain clean separation:

| Rule | Description | Enforced By |
|------|-------------|-------------|

### 3.2 Internal Module Boundaries

Each module is structured into three layers following Clean Architecture:

```
module/
├── domain/           # Business logic, entities, rules
│   ├── entities.py   # Domain entities
│   ├── events.py     # Domain events
│   └── rules.py      # Business rules
├── infrastructure/   # External adapters, DB, external APIs
│   ├── repositories.py  # Data access implementations
│   ├── clients.py       # External API clients

## 4. Detailed Module Specifications

### 4.1 Identity Module

**Responsibilities:**
- User authentication (JWT)
- Role-based access control
- Company/organization management
- Audit logging

**API Endpoints:**
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh token
- `GET /users` - List users (admin)
- `PUT /users/{id}` - Update user (admin)

**Database Schema:**
- `users` table
- `auth_tokens` table
- `roles` table
- `role_permissions` table
- `audit_logs` table

**Events:**
- `UserCreated`

### 4.4 Inventory Module

**Responsibilities:**
- Stock management
- Reorder point optimization
- Stockout prevention
- ML: Demand forecasting

**API Endpoints:**
- `GET /inventory/items` - List items
- `POST /inventory/items` - Create item
- `POST /inventory/reorder-orders` - Create reorder

**Database Schema:**
- `items` table
- `stock_movements` table
- `reorder_points` table

**Events:**
- `InventoryReorderNeeded`

**Dependencies:**
- Depends on: Inventory (own schema), Identity

### 4.5 Maintenance Module

**Responsibilities:**
- Equipment tracking
- Maintenance plan management

## 5. Boundary Enforcement

### 5.1 Architectural Tests

CI pipeline enforces module boundaries with automated tests:

| Test | What It Checks | Failure Action |
|------|---------------|----------------|
| **Schema Ownership** | No cross-schema queries | CI failure |
| **Interface Contracts** | mypy strict checks | CI failure |
| **Domain Events** | Only allowed events published | CI failure |
| **Imports** | No direct model imports across modules | CI failure |

### 5.2 Module Collaboration Diagram

```text
                    ┌─────────────────────────┐
                    │     IDENTITY MODULE     │
                    │  users, roles, auth     │
                    └────────────┬────────────┘
                                 │

## 7. Module Boundaries Summary

| Module | Depends On | Provides To | Schema | Events |
|--------|------------|-------------|--------|--------|
| Identity | None | All | `identity` | UserCreated, UserUpdated |
| Procurement | Identity | Document Intelligence | `procurement` | InvoiceSynchronized |
| Cost Forecasting | Identity | Dashboard | `cost_forecasting` | ForecastUpdated, ModelDriftDetected |
| Inventory | Identity | Notifications | `inventory` | InventoryReorderNeeded |
| Maintenance | Identity | Notifications | `maintenance` | EquipmentFailurePredicted |
| Project Risk | Identity | Dashboard | `project_risk` | ProjectRiskFlagged |
| Visual Inspection | Identity | Search | `visual_inspection` | InspectionCompleted |
| Document Intelligence | Identity, Procurement | Search, Extraction | `document_intelligence` | DocumentIndexed |

## 8. Integration Guidelines

### 8.1 Adding a New Module

1. Create new directory in `apps/api/app/modules/`
2. Create module structure (domain, infrastructure, api)
3. Add new PostgreSQL schema to migrations
4. Implement domain entities and repositories
5. Add API routes and middleware
6. Add domain events as needed
7. Add module to documentation (this file)
8. Run architectural tests

### 8.2 Adding Cross-Module Communication

1. Define interface contract (Python Protocol)
2. Create domain event if asynchronous
3. Implement adapter in both modules
4. Add integration tests
5. Update module boundary documentation

## 9. Related Documentation

- [ADR-001: Modular Monolith vs Microservices](../adr/001-modular-monolith.md)
- [ADR-002: Database Schema Separation](../adr/002-database-schemas.md)
- [ADR-003: Module Communication Patterns](../adr/003-module-communication.md)
- [Data Flow](../architecture/04-data-flow.md)
- [Architecture Overview](../architecture/01-overview.md)

        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│ PROCUREMENT  │          │COST FORECAST │          │INVENTORY     │
│ (Fraud,      │          │(Budget,       │          │(Stock,        │
│  Dupes)      │          │  EAC)         │          │  Reorder)     │
└──────────────┘          └──────────────┘          └──────────────┘
        │                        │                        │
        └──────────┬─────────────┴────────────┬──────────┘
                   │ Events                   │ Events
        ┌──────────▼────────────┐   ┌──────────▼────────────┐
        │  DOCUMENT INTELLIGENCE │   │   MAINTENANCE MODULE   │
        │  (Search, Extract)    │   │   (Equipment,         │
        └───────────────────────┘   │    Predictions)       │
                                      └──────────────────────┘
```

## 6. Cross-Module Communication Reference

### 6.1 Synchronous Communication

| Caller | Callee | Method | Endpoint |
|--------|--------|--------|----------|
| Any module | Identity | HTTP REST | `/auth/*`, `/users/*` |
| Procurement | Document Intelligence | HTTP REST | `/document-intelligence/*` |
| Cost Forecasting | MLflow | REST API | `/mlflow/experiments/*` |

### 6.2 Asynchronous Communication (Events)

| Source | Event | Target | Action |
|--------|-------|--------|--------|
| Procurement | `InvoiceSynchronized` | Cost Forecasting | Update budget baseline |
| Procurement | `InvoiceSynchronized` | Document Intelligence | Index extracted data |
| Cost Forecasting | `ForecastUpdated` | Dashboard UI | Refresh displayed forecasts |
| Inventory | `InventoryReorderNeeded` | Notifications | Send reorder alert |
| Maintenance | `EquipmentFailurePredicted` | Notifications | Create work order |
| Project Risk | `ProjectRiskFlagged` | Dashboard UI | Flag at-risk milestone |
| Document Intelligence | `DocumentIndexed` | Search UI | Update search index |
| Cost Forecasting | `ModelDriftDetected` | ML Training | Trigger retraining |
| Any | `TaskCompleted` | Dashboard UI | Update task status |

- Work order generation
- ML: Predictive failure detection

**API Endpoints:**
- `GET /maintenance/equipment` - List equipment
- `POST /maintenance/work-orders` - Create work order
- `GET /maintenance/predictions` - Get failure predictions

**Database Schema:**
- `equipment` table
- `maintenance_plans` table
- `work_orders` table

**Events:**
- `EquipmentFailurePredicted`

**Dependencies:**
- Depends on: Maintenance (own schema), Identity

### 4.6 Project Risk Module

**Responsibilities:**
- Risk identification and tracking
- Mitigation plan management
- Schedule delay prediction
- ML: Risk scoring

**API Endpoints:**
- `GET /project-risk/risks` - List risks
- `POST /project-risk/risks` - Create risk
- `GET /project-risk/assessments` - Get risk assessments

**Database Schema:**
- `projects` table
- `risks` table
- `mitigation_plans` table

**Events:**
- `ProjectRiskFlagged`

**Dependencies:**
- Depends on: Project Risk (own schema), Identity

### 4.7 Visual Inspection Module

**Responsibilities:**
- Computer vision processing
- Defect detection and classification
- Inspection management
- Image storage

**API Endpoints:**
- `POST /visual-inspection/inspections` - Create inspection
- `GET /visual-inspection/defects` - List defects
- `GET /visual-inspection/classifications` - Get classifications

**Database Schema:**
- `inspections` table
- `defect_segments` table
- `classification_results` table
- `images` table

**Events:**
- `InspectionCompleted`

**Dependencies:**
- Depends on: Visual Inspection (own schema), Identity
- External ML models (computer vision)

### 4.8 Document Intelligence Module

**Responsibilities:**
- Document ingestion and indexing
- RAG (Retrieval-Augmented Generation) search
- Document extraction
- Embedding storage

**API Endpoints:**
- `POST /document-intelligence/documents` - Upload document
- `GET /document-intelligence/search` - Search documents
- `POST /document-intelligence/extract` - Extract structured data

**Database Schema:**
- `documents` table
- `chunks` table
- `embeddings` table
- `search_queries` table

**Events:**
- `DocumentIndexed`

**Dependencies:**
- Depends on: Document Intelligence (own schema), Identity
- MLflow integration (external)

- `UserUpdated`
- `UserDeleted`

**Dependencies:**
- None (leaf module)

### 4.2 Procurement Module

**Responsibilities:**
- Invoice management and synchronization
- Supplier contact management
- Purchase order tracking
- AI: Fraud detection, duplicate detection, price anomaly detection

**API Endpoints:**
- `POST /procurement/invoices/sync` - Sync with Odoo
- `GET /procurement/invoices` - List invoices
- `POST /procurement/invoices/annotate` - Annotate for ML

**Database Schema:**
- `invoices` table
- `supplier_contacts` table
- `purchase_orders` table
- `invoice_annotations` table

**Events:**
- `InvoiceSynchronized`

**Dependencies:**
- Depends on: Identity (users), Document Intelligence (annotations)
- Odoo integration (external)

### 4.3 Cost Forecasting Module

**Responsibilities:**
- Budget tracking and forecasting
- EAC (Estimate at Completion) calculation
- Cost anomaly detection
- ML: Drift detection, model retraining

**API Endpoints:**
- `POST /cost-forecasting/forecasts` - Create forecast
- `GET /cost-forecasting/forecasts/{id}` - Get forecast
- `POST /cost-forecasting/tasks` - Create forecast task

**Database Schema:**
- `projects` table
- `budget_lines` table
- `forecasts` table
- `forecast_results` table

**Events:**
- `ForecastUpdated`
- `ModelDriftDetected`

**Dependencies:**
- Depends on: Identity
- MLflow integration (external)

│   └── transformers.py  # Data transformation
└── api/              # Public interface (FastAPI routes)
    └── routes.py
```

### 3.3 Cross-Module Communication Patterns

```text
Synchronous (HTTP):
┌──────────────┐     HTTP/REST      ┌──────────────┐
│    Module A   │ ─────────────────► │    Module B   │
│  (Own Schema) │                    │  (Own Schema) │
└──────────────┘                    └──────────────┘

Asynchronous (Events):
┌──────────────┐     Events         ┌──────────────┐
│    Module C   │ ────────────────► │    Module D   │
│  (Own Schema) │    (Redis)         │  (Own Schema) │
└──────────────┘                    └──────────────┘
```

| **Schema Isolation** | Each module owns exactly one PostgreSQL schema | Database migrations, access controls |
| **Interface Contracts** | Modules expose functionality through Python Protocols/Interfaces | Type checking (mypy) |
| **No Direct Model Access** | Cross-module communication via API or events, not direct model access | Architecture tests |
| **Domain Events** | Asynchronous communication via domain events | Redis Pub/Sub |
| **Own Migrations** | Each module has its own alembic migrations | CI pipeline |
