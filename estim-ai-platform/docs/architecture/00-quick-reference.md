# Estim AI Platform - Quick Reference

## Project Overview

The Estim AI Platform is a **modular monolith** construction intelligence system that integrates with Odoo ERP to provide AI-powered insights across seven business domains.

## Key Architecture Decisions

1. **Modular Monolith**: One application, multiple modules, single deployment
2. **Database Schema Separation**: Each module owns its PostgreSQL schema
3. **Module Communication**: Direct interfaces for sync, domain events for async
4. **Four-Layer Architecture**: API → Application → Domain → Infrastructure
5. **Anti-Corruption Layer**: Odoo integration adapter translates external data

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14+, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.12+, SQLAlchemy 2.x |
| Database | PostgreSQL 16+ with pgvector |
| Cache/Queue | Redis 7+, Celery |
| ML | scikit-learn, LightGBM, XGBoost, PyTorch |
| Tracking | MLflow |
| Storage | S3-compatible (MinIO) |
| Monitoring | Prometheus + Grafana |

## Module Structure

```
modules/{module_name}/
├── api/                    # HTTP endpoints, Pydantic schemas
├── application/           # Use cases, services, ports, handlers
├── domain/                # Entities, rules, events
├── infrastructure/        # SQLAlchemy models, repositories
├── ml/                    # Features, inference, evaluation
└── tests/                 # Unit, integration, infrastructure tests
```

## Seven Business Modules

1. **Procurement Intelligence**: Fraud detection, price anomalies
2. **Cost Forecasting**: Budget overrun prediction
3. **Inventory Intelligence**: Demand forecasting
4. **Predictive Maintenance**: Equipment failure prediction
5. **Project Risk Intelligence**: Schedule delay prediction
6. **Visual Quality Inspection**: Computer vision for defects
7. **Document Intelligence**: RAG-powered document search

## File Size Guidelines

| File Type | Recommended | Maximum |
|-----------|-------------|----------|
| Function | 10-50 lines | 100 lines |
| Class | 100-300 lines | 500 lines |
| Module file | 100-400 lines | 800 lines |
| Test file | 100-500 lines | 1000 lines |

## Code Style

- **Line length**: 100 characters maximum
- **Python**: Black formatter, Ruff linter, mypy type checker
- **TypeScript**: Prettier formatter, ESLint linter
- **Naming**: `snake_case` for files/functions, `PascalCase` for classes

## Quick Commands

### Development

```bash
# Start all services (Docker)
docker compose up -d

# Backend only (native)
cd apps/api
uvicorn app.main:app --reload

# Frontend only (native)
cd apps/web
npm run dev
```

### Database

```bash
# Create migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Testing

```bash
# Backend tests
pytest

# Frontend tests
npm test

# E2E tests
npx playwright test
```

### Code Quality

```bash
# Format code
black .
ruff check --fix .

# Type check
mypy app/

# Lint TypeScript
npm run lint
npm run type-check
```

## Documentation

- [Architecture Overview](01-overview.md)
- [Module Implementation Guide](02-module-implementation.md)
- [Code Structure Guidelines](03-code-structure.md)
- [Build Checklist](../../BUILD_CHECKLIST.md)

## ADRs (Architecture Decision Records)

- [ADR-001: Modular Monolith vs Microservices](../adr/001-modular-monolith.md)
- [ADR-002: Database Schema Separation](../adr/002-database-schemas.md)
- [ADR-003: Module Communication Patterns](../adr/003-module-communication.md)
- [ADR-004: Odoo Integration Strategy](../adr/004-odoo-integration.md)

## Database Schemas

```
estim_ai
├── identity          # Users, roles, permissions
├── procurement       # Purchase orders, anomalies
├── cost_forecasting  # Project costs, forecasts
├── inventory         # Stock snapshots, demand forecasts
├── maintenance       # Equipment, maintenance records
├── project_risk      # Milestones, risk predictions
├── visual_inspection # Inspections, image assets
├── document_intelligence # Documents, chunks, embeddings
└── platform          # Outbox events, audit logs, model versions
```

## Environment Variables

Key variables (see `.env.example` for complete list):

```bash
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379/0
SECRET_KEY=your-secret-key
ODOO_URL=https://odoo.example.com
MLFLOW_TRACKING_URI=http://localhost:5000
S3_ENDPOINT=http://localhost:9000
```

## Service URLs (Local Development)

| Service | URL |
|---------|-----|
| API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| Frontend | http://localhost:3000 |
| MLflow | http://localhost:5000 |
| Grafana | http://localhost:3001 |
| MinIO Console | http://localhost:9001 |

## Module Communication

### Synchronous (Direct Interfaces)
```python
# Define interface in consuming module
class InventoryQueryService(Protocol):
    def get_available_stock(self, material_id: str) -> StockLevel:
        ...

# Implement in owning module
class InventoryQueryServiceImpl:
    def get_available_stock(self, material_id: str) -> StockLevel:
        # Implementation
        pass
```

### Asynchronous (Domain Events)
```python
# Define event
class PurchaseOrderImported(DomainEvent):
    order_id: str
    supplier_id: str
    # ...

# Publish from application layer
event_publisher.publish(PurchaseOrderImported(...))

# Handle in background worker
class PurchaseOrderImportedHandler:
    def handle(self, payload: dict):
        # Process event
        pass
```

## ML Integration

### Training
```bash
cd ml/training/procurement
python train_anomaly_detection.py
```

### Inference
```python
# In module/ml/inference.py
class IsolationForestRiskScorer:
    def score(self, order: PurchaseOrder) -> float:
        features = self._extract_features(order)
        return float(-self.model.score_samples([features])[0])
```

## Build Checklist Summary

### Minimum Viable Platform (for interview demo)
- [ ] Phase 1: Project Setup
- [ ] Phase 2: Core Infrastructure
- [ ] Phase 3: Identity Module
- [ ] Phase 4: Procurement Module (first AI)
- [ ] Basic testing
- [ ] Basic documentation

### Full Platform
- [ ] All 12 phases
- [ ] All seven AI modules
- [ ] Complete testing coverage
- [ ] Production deployment

## Common Patterns

### Creating a New Module

1. Create folder structure: `modules/{module}/{api,application,domain,infrastructure,ml,tests}`
2. Define domain entities in `domain/entities.py`
3. Define business rules in `domain/rules.py`
4. Create SQLAlchemy models in `infrastructure/models.py`
5. Implement repository in `infrastructure/repository.py`
6. Create migration: `alembic revision --autogenerate -m "Module"`
7. Implement application services in `application/services.py`
8. Define ports in `application/ports.py`
9. Create API routes in `api/routes.py`
10. Create Pydantic schemas in `api/schemas.py`
11. Register router in `main.py`
12. Write tests

### Adding a New API Endpoint

1. Add Pydantic schema in `api/schemas.py`
2. Add route handler in `api/routes.py`
3. Implement use case in `application/services.py`
4. Write tests

### Adding a New ML Model

1. Create training script in `ml/training/{module}/`
2. Train and log model with MLflow
3. Create inference adapter in `module/ml/inference.py`
4. Register model in dependency injection
5. Test inference

## Troubleshooting

### Database Connection Issues
- Check DATABASE_URL in `.env`
- Verify PostgreSQL is running: `docker compose ps postgres`
- Check logs: `docker compose logs postgres`

### Redis Connection Issues
- Check REDIS_URL in `.env`
- Verify Redis is running: `docker compose ps redis`
- Test connection: `redis-cli ping`

### Module Import Errors
- Ensure PYTHONPATH includes `apps/api`
- Check for circular imports
- Verify module structure matches architecture

### Migration Issues
- Check migration files in `migrations/versions/`
- Verify database connection
- Check current migration: `alembic current`
- Force stamp: `alembic stamp head`

## Support

For detailed information, see:
- [README.md](../../README.md)
- [BUILD_CHECKLIST.md](../../BUILD_CHECKLIST.md)
- Architecture docs in `docs/architecture/`
- ADRs in `docs/adr/`
