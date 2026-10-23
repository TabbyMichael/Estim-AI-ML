# Estim AI Platform

A unified construction intelligence platform that integrates with Odoo ERP to provide AI-powered insights across procurement, cost forecasting, inventory, maintenance, project risk, visual inspection, and document intelligence.

## Architecture

This project uses a **modular monolith architecture** with clear module boundaries:

- **One Application**: Single FastAPI backend with seven business modules
- **Strict Boundaries**: Modules communicate through defined interfaces and domain events
- **Database Separation**: Each module owns its PostgreSQL schema
- **Shared Infrastructure**: Common services for auth, logging, monitoring, and ML

### Modules

1. **Procurement Intelligence**: Fraud detection, price anomalies, duplicate invoice detection
2. **Cost Forecasting**: Budget overrun prediction, Estimate at Completion (EAC) forecasting
3. **Inventory Intelligence**: Demand forecasting, reorder point optimization
4. **Predictive Maintenance**: Equipment failure prediction, maintenance scheduling
5. **Project Risk Intelligence**: Schedule delay prediction, milestone risk assessment
6. **Visual Quality Inspection**: Computer vision for concrete defects, crack detection
7. **Document Intelligence**: RAG-powered search for contracts, drawings, specifications

## Technology Stack

### Backend
- **Framework**: FastAPI 0.110+
- **Language**: Python 3.12+
- **ORM**: SQLAlchemy 2.x
- **Database**: PostgreSQL 16+ with pgvector
- **Cache/Queue**: Redis 7+
- **Background Jobs**: Celery
- **ML**: scikit-learn, LightGBM, XGBoost, PyTorch
- **Experiment Tracking**: MLflow

### Frontend
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript 5+
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query

### Infrastructure
- **Containerization**: Docker Compose
- **Object Storage**: MinIO (S3-compatible)
- **Monitoring**: Prometheus + Grafana
- **CI/CD**: GitHub Actions

## Project Structure

```
Estim-AI-ML/
├── apps/
│   ├── api/                         # FastAPI backend
│   │   ├── app/
│   │   │   ├── main.py             # FastAPI app entry point
│   │   │   ├── bootstrap.py        # Dependency injection
│   │   │   ├── core/               # Shared infrastructure
│   │   │   └── modules/            # Business modules
│   │   │       ├── identity/       # Authentication & authorization
│   │   │       ├── procurement/    # Procurement AI
│   │   │       ├── cost_forecasting/
│   │   │       ├── inventory/
│   │   │       ├── maintenance/
│   │   │       ├── project_risk/
│   │   │       ├── visual_inspection/
│   │   │       ├── document_intelligence/
│   │   │       └── integrations/   # Odoo integration
│   │   ├── migrations/             # Alembic migrations
│   │   └── tests/                  # Backend tests
│   ├── web/                         # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/                # Next.js app router
│   │   │   ├── components/         # React components
│   │   │   └── features/           # Feature modules
│   └── worker/                      # Celery background worker
├── ml/                              # ML training scripts
│   ├── training/                    # Module-specific training
│   ├── experiments/                # ML experiments
│   └── model_configs/              # Model configurations
├── infrastructure/                  # Infrastructure configs
│   ├── docker/
│   ├── monitoring/                 # Prometheus/Grafana configs
│   └── deployment/                 # Deployment scripts
├── docs/                            # Documentation
│   ├── architecture/               # Architecture docs
│   ├── adr/                        # Architecture Decision Records
│   ├── api/                        # API documentation
│   └── runbooks/                   # Operational runbooks
├── scripts/                         # Utility scripts
├── docker-compose.yml               # Local development
├── .env.example                    # Environment template
└── README.md
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Python 3.12+ (for local development)
- Node.js 18+ (for local development)

### Local Development with Docker

1. Clone the repository:
```bash
git clone <repository-url>
cd Estim-AI-ML
```

2. Copy environment template:
```bash
cp .env.example .env
```

3. Start all services:
```bash
docker compose up -d
```

4. Access services:
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Frontend: http://localhost:3000
- MLflow: http://localhost:5000
- Grafana: http://localhost:3001 (admin/admin)
- MinIO Console: http://localhost:9001

### Local Development (Native)

#### Backend Setup

1. Create virtual environment:
```bash
cd apps/api
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -e .
```

3. Set up environment:
```bash
cp ../../.env.example ../../.env
# Edit .env with your configuration
```

4. Run migrations:
```bash
alembic upgrade head
```

5. Start API server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Setup

1. Install dependencies:
```bash
cd apps/web
npm install
```

2. Start development server:
```bash
npm run dev
```

## Development

### Module Structure

Each business module follows a four-layer architecture:

```
modules/{module_name}/
├── api/                    # HTTP API layer
│   ├── routes.py          # FastAPI routes
│   └── schemas.py         # Pydantic models
├── application/           # Use case orchestration
│   ├── services.py        # Business workflows
│   ├── commands.py        # Command objects
│   ├── queries.py         # Query objects
│   ├── ports.py           # Interface definitions
│   └── handlers.py        # Event handlers
├── domain/                # Business logic
│   ├── entities.py        # Domain entities
│   ├── rules.py           # Business rules
│   └── events.py          # Domain events
├── infrastructure/        # Persistence
│   ├── models.py          # SQLAlchemy models
│   └── repository.py      # Repository implementations
├── ml/                    # ML inference
│   ├── features.py        # Feature engineering
│   └── inference.py       # Model adapters
└── tests/                 # Module tests
```

### Code Style

- **Python**: Black formatter, Ruff linter, mypy type checker
- **TypeScript**: Prettier formatter, ESLint linter
- **Line length**: Maximum 100 characters
- **File size**: See [Code Structure Guidelines](docs/architecture/03-code-structure.md)

### Testing

```bash
# Backend tests
cd apps/api
pytest

# Frontend tests
cd apps/web
npm test

# E2E tests
npx playwright test
```

### Running Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

## Documentation

- [Architecture Overview](docs/architecture/01-overview.md)
- [Module Implementation Guide](docs/architecture/02-module-implementation.md)
- [Code Structure Guidelines](docs/architecture/03-code-structure.md)
- [ADR-001: Modular Monolith vs Microservices](docs/adr/001-modular-monolith.md)
- [ADR-002: Database Schema Separation](docs/adr/002-database-schemas.md)
- [ADR-003: Module Communication Patterns](docs/adr/003-module-communication.md)
- [ADR-004: Odoo Integration Strategy](docs/adr/004-odoo-integration.md)
- [Build Checklist](BUILD_CHECKLIST.md)

## Build Process

See [BUILD_CHECKLIST.md](BUILD_CHECKLIST.md) for a comprehensive step-by-step guide to building the platform.

### Quick Start Checklist (Minimum Viable Platform)

- [ ] Phase 1: Project Setup and Infrastructure
- [ ] Phase 2: Core Platform Infrastructure
- [ ] Phase 3: Identity Module
- [ ] Phase 4: Procurement Module (first AI module)
- [ ] Phase 8: Testing and Quality Assurance (basic)
- [ ] Phase 10: Documentation (basic)

## Deployment

### Staging

```bash
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d
```

### Production

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

For production deployment, consider:
- Kubernetes orchestration
- Managed PostgreSQL (RDS, Cloud SQL)
- Managed Redis (ElastiCache)
- Managed object storage (S3)
- Dedicated MLflow server
- CI/CD pipeline with GitHub Actions

## Contributing

1. Read the [Module Implementation Guide](docs/architecture/02-module-implementation.md)
2. Follow the [Code Structure Guidelines](docs/architecture/03-code-structure.md)
3. Write tests for all changes
4. Ensure all tests pass before submitting PR
5. Follow the architectural rules defined in ADRs

## License

Proprietary - Estim Construction Tanzania

## Support

For technical support, contact the development team or consult the documentation in the `docs/` directory.
