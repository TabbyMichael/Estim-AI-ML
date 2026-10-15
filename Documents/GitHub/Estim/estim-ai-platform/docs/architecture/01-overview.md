# Estim AI Platform - Architecture Overview

## 1. System Purpose

The Estim AI Platform is a unified construction intelligence system that integrates with Odoo ERP to provide AI-powered insights across seven business domains:

- **Procurement Intelligence**: Fraud detection, price anomalies, duplicate invoice detection
- **Cost Forecasting**: Budget overrun prediction, Estimate at Completion (EAC) forecasting
- **Inventory Intelligence**: Demand forecasting, reorder point optimization, stockout prevention
- **Predictive Maintenance**: Equipment failure prediction, maintenance scheduling
- **Project Risk Intelligence**: Schedule delay prediction, milestone risk assessment
- **Visual Quality Inspection**: Computer vision for concrete defects, crack detection
- **Document Intelligence**: RAG-powered search for contracts, drawings, specifications

## 2. Architectural Style: Modular Monolith

We use a **modular monolith** architecture rather than microservices for the following reasons:

### 2.1 Why Modular Monolith

| Aspect | Modular Monolith | Microservices |
|--------|------------------|---------------|
| Deployment | Single coordinated release | Multiple independent deployments |
| Communication | In-process function calls | Network calls (HTTP/gRPC) |
| Database | Single PostgreSQL instance with schemas | Often separate databases per service |
| Development | Easier local development | Higher infrastructure overhead |
| Debugging | Direct debugging possible | Distributed tracing required |
| Operational Complexity | Lower initially | Higher from the start |
| Transaction Management | ACID transactions across modules | Distributed transactions required |

### 2.2 Key Architectural Principles

1. **One Application, Multiple Modules**: All business domains live in one FastAPI application
2. **Strict Module Boundaries**: Modules communicate through defined interfaces, not direct model access
3. **Domain-Driven Design**: Each module has clear domain entities, rules, and bounded contexts
4. **Shared Infrastructure**: Common services (auth, logging, monitoring) are truly shared
5. **Database Schema Separation**: Each module owns its PostgreSQL schema
6. **Event-Driven Communication**: Modules use domain events for asynchronous workflows

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│                   Next.js + TypeScript                       │
│  Dashboards, Charts, Reports, Forms, Document Search UI      │
└────────────────────────┬────────────────────────────────────┘
                           │ HTTPS/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                           │
│                     FastAPI Modular Monolith                  │
├─────────────────────────────────────────────────────────────┤
│  Auth  │  Routes  │  Middleware  │  Request Validation       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │Identity  │ │Procurement│ │Cost Forecast│ │Inventory │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │Maintenance│ │Project Risk│ │Visual Inspec.│ │Document  │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │Odoo Int. │ │Notifications│ │Reporting  │ │Audit     │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
└────────────────────────┬────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────────┐
│                Data and ML Infrastructure                    │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL │ pgvector │ Redis │ S3 Object Storage           │
├─────────────────────────────────────────────────────────────┤
│  ML Models: LightGBM, XGBoost, Isolation Forest, PyTorch    │
├─────────────────────────────────────────────────────────────┤
│  Experiment Tracking: MLflow │ Model Registry                │
└────────────────────────┬────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────────┐
│                   External Integrations                       │
│  Odoo ERP │ Document Sources │ Equipment Telemetry │ Email   │
└─────────────────────────────────────────────────────────────┘
```

## 4. Technology Stack

### 4.1 Frontend
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript 5+
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Charts**: Recharts or Chart.js
- **Forms**: React Hook Form + Zod validation

### 4.2 Backend
- **Framework**: FastAPI 0.110+
- **Language**: Python 3.12+
- **ORM**: SQLAlchemy 2.x
- **Migrations**: Alembic
- **Validation**: Pydantic v2
- **Async**: asyncio (where appropriate)

### 4.3 Data & Storage
- **Primary Database**: PostgreSQL 16+
- **Vector Search**: pgvector extension
- **Cache**: Redis 7+
- **Object Storage**: S3-compatible (MinIO for local, AWS S3 for production)
- **Message Queue**: Celery + Redis (background jobs)

### 4.4 Machine Learning
- **Traditional ML**: scikit-learn, LightGBM, XGBoost
- **Deep Learning**: PyTorch 2.x
- **Computer Vision**: YOLO (Ultralytics), U-Net (segmentation)
- **RAG**: LlamaIndex or custom retrieval layer
- **Experiment Tracking**: MLflow
- **Feature Store**: Featuretools (optional)

### 4.5 Integration & DevOps
- **Authentication**: OIDC/SSO or secure JWT-based auth
- **API Documentation**: OpenAPI (FastAPI auto-generated)
- **Testing**: pytest (backend), Playwright (E2E)
- **Deployment**: Docker Compose (initial), Kubernetes (production)
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana + OpenTelemetry
- **Logging**: Structured JSON logs with correlation IDs

## 5. Module Communication Patterns

### 5.1 Synchronous: Direct Application Interfaces

Use when an immediate response is required.

```python
# Example: Project Risk module needs inventory availability
class InventoryQueryService(Protocol):
    def get_available_stock(self, material_id: str, project_id: str) -> StockLevel:
        ...

# Implemented by inventory module
class InventoryQueryServiceImpl:
    def get_available_stock(self, material_id: str, project_id: str) -> StockLevel:
        # Implementation
        pass
```

### 5.2 Asynchronous: Domain Events

Use when immediate response is not required.

```python
# Event published by procurement module
class PurchaseOrderImported(DomainEvent):
    order_id: str
    supplier_id: str
    total_amount: Decimal
    timestamp: datetime

# Consumed by inventory module (update expected supply)
# Consumed by cost forecasting module (update cost baseline)
# Consumed by notifications module (alert if unusual)
```

**Event Flow**:
1. Module publishes event to transactional outbox
2. Background worker reads from outbox
3. Worker dispatches to event handlers
4. Handlers process idempotently
5. Worker marks event as processed

## 6. Database Organization

### 6.1 Schema Structure

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

### 6.2 Data Ownership Rules

- Each module owns its schema tables
- Cross-module access only through application interfaces
- No direct SELECT/INSERT/UPDATE across schemas
- Reference by ID only, never by foreign key across schemas

## 7. Security Architecture

### 7.1 Authentication & Authorization

- **Authentication**: OIDC (Keycloak, Auth0, or corporate SSO)
- **Authorization**: Role-Based Access Control (RBAC)
- **Project-Level Access**: Users can only access projects they're assigned to
- **Audit Logging**: All write operations logged with user, timestamp, and changes

### 7.2 Data Protection

- **Encryption at Rest**: PostgreSQL encryption, encrypted object storage
- **Encryption in Transit**: TLS 1.3 for all connections
- **PII Handling**: Document-level access controls for contracts/personal data
- **Secrets Management**: Environment variables or secret manager (no secrets in code)

## 8. Deployment Architecture

### 8.1 Development (Docker Compose)

```
┌─────────────────────────────────────┐
│         Docker Compose               │
├─────────────────────────────────────┤
│  estim-api (FastAPI)                │
│  estim-web (Next.js)                │
│  estim-worker (Celery)              │
│  postgres (PostgreSQL + pgvector)   │
│  redis (Cache + Queue)              │
│  minio (S3-compatible storage)      │
│  mlflow (Experiment tracking)       │
│  prometheus (Metrics)               │
│  grafana (Dashboards)               │
└─────────────────────────────────────┘
```

### 8.2 Production (Kubernetes - Future)

```
┌─────────────────────────────────────┐
│         Kubernetes Cluster           │
├─────────────────────────────────────┤
│  Ingress Controller (TLS)           │
│  ├── estim-api (replicas: 3)        │
│  ├── estim-web (replicas: 2)        │
│  └── estim-worker (replicas: 5)     │
│                                     │
│  Managed PostgreSQL (RDS/Cloud SQL) │
│  Managed Redis (ElastiCache)        │
│  Managed S3 (object storage)        │
│  MLflow Server (dedicated)          │
│  Prometheus + Grafana               │
└─────────────────────────────────────┘
```

## 9. Scalability Strategy

### 9.1 Vertical Scaling First

- Increase CPU/memory for API and worker containers
- Optimize database queries and indexing
- Cache frequently accessed data in Redis

### 9.2 Horizontal Scaling When Needed

- Scale API replicas based on request load
- Scale worker replicas based on queue length
- Read replicas for PostgreSQL (if needed)

### 9.3 When to Split Services

Only consider microservices when:
- A module requires significantly different scaling characteristics
- A module has independent deployment cycles
- A module has different team ownership
- Clear bounded context with minimal coupling

**Never split services prematurely.**

## 10. Observability

### 10.1 Metrics

- **Application Metrics**: Request latency, error rates, throughput
- **Business Metrics**: Alerts generated, forecasts accuracy, model performance
- **Infrastructure Metrics**: CPU, memory, disk, network
- **ML Metrics**: Prediction latency, model drift, data freshness

### 10.2 Logging

- **Structured Logs**: JSON format with timestamp, level, correlation_id
- **Log Levels**: DEBUG, INFO, WARNING, ERROR, CRITICAL
- **Context**: User ID, module, action, duration

### 10.3 Tracing

- **Distributed Tracing**: OpenTelemetry with Jaeger or Tempo
- **Request Tracing**: Trace ID flows through API, workers, database
- **Module Boundaries**: Trace across module calls (in-process initially)

## 11. Development Workflow

### 11.1 Local Development

1. Clone repository
2. Copy `.env.example` to `.env`
3. Run `docker compose up` (all services)
4. API runs on `http://localhost:8000`
5. Web runs on `http://localhost:3000`
6. MLflow UI on `http://localhost:5000`

### 11.2 Testing Strategy

- **Unit Tests**: pytest for business logic (domain layer)
- **Integration Tests**: pytest with test database (application layer)
- **Contract Tests**: Verify module interfaces
- **Architecture Tests**: Verify module boundaries (no cross-schema access)
- **E2E Tests**: Playwright for critical user flows

### 11.3 CI/CD Pipeline

1. **On PR**: Lint, type check, unit tests, integration tests
2. **On Merge to Main**: Build Docker images, run E2E tests
3. **On Tag**: Deploy to staging, run smoke tests
4. **Manual Approval**: Deploy to production

## 12. Documentation Standards

- **Architecture Decisions**: ADRs in `docs/adr/`
- **API Documentation**: Auto-generated OpenAPI docs
- **Runbooks**: Operational procedures in `docs/runbooks/`
- **Code Comments**: Only explain "why", not "what"
- **README**: Quick start and module overview in each module

## 13. Related Architecture Documents

- [ADR-001: Modular Monolith vs Microservices](../adr/001-modular-monolith.md)
- [ADR-002: Database Schema Separation](../adr/002-database-schemas.md)
- [ADR-003: Module Communication Patterns](../adr/003-module-communication.md)
- [ADR-004: Odoo Integration Strategy](../adr/004-odoo-integration.md)
- [ADR-005: ML Model Lifecycle](../adr/005-ml-lifecycle.md)
- [Module Implementation Guide](../architecture/02-module-implementation.md)
- [Code Structure Guidelines](../architecture/03-code-structure.md)
