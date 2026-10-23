# Estim AI Platform - Development Setup Guide

## 1. Prerequisites

| Requirement | Version | Installation |
|-------------|---------|--------------|
| Python | 3.12+ | `https://python.org` |
| Node.js | 18+ | `https://nodejs.org` |
| Docker | Latest | `https://docker.com` |
| Docker Compose | Latest | Included with Docker |
| Git | Latest | `https://git-scm.com` |

## 2. Initial Setup

### 2.1 Clone Repository

```bash
git clone git@github.com:TabbyMichael/Estim-AI-ML.git
cd Estim-AI-ML
```

### 2.2 Environment Setup

```bash
# Create Python virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -e .

# Install Node.js dependencies
cd apps/web
npm install
cd ..

# Copy environment files
cp .env.example .env
cp .env.example .env.test  # For testing
```

## 3. Start Development Environment

### 3.1 Docker Compose

```bash
docker compose up -d
```

This starts all required services:

| Service | Port | Purpose |
|---------|------|---------|
| estim-api | 8000 | FastAPI backend |
| estim-web | 3000 | Next.js frontend |
| estim-worker | 8001 | Celery worker |
| postgres | 5432 | PostgreSQL + pgvector |
| redis | 6379 | Cache + message broker |
| minio | 9000 | S3-compatible storage |
| mlflow | 5000 | ML experiment tracking |
| prometheus | 9090 | Metrics collection |
| grafana | 3001 | Metrics dashboards |
| kibana | 5601 | Log aggregation |
| jaeger | 16686 | Distributed tracing |

### 3.2 Verify Services

```bash
# Check all containers are running
docker compose ps

# View logs
docker compose logs -f estim-api

# View specific service logs
docker compose logs -f postgres
```

## 4. Database Setup

### 4.1 Run Migrations

```bash
# Apply migrations
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "Description"
```

### 4.2 Seed Database

```bash
# Run seed scripts
python -m scripts.seed_database
```

## 5. Running Services Locally

### 5.1 API Service

```bash
uvicorn app.main:app --reload --port 8000
```

### 5.2 Frontend Development

```bash
cd apps/web
npm run dev
```

### 5.3 Worker (Background Tasks)

```bash
celery -A app.worker.celery_app worker -l info
```

## 6. Testing

### 6.1 Run All Tests

```bash
# API tests
pytest apps/api/tests/

# Web tests
cd apps/web && npm test

# Architecture tests
pytest tests/architecture/
```

### 6.2 Run Specific Test Suite

```bash
# Unit tests only
pytest apps/api/tests/unit/

# Integration tests only
pytest apps/api/tests/integration/

# With coverage
pytest apps/api/tests/ --cov=app --cov-report=html
```

### 6.3 Test Database

```bash
# Use test database
export DATABASE_URL=postgresql://user:pass@localhost:5432/estim_test
pytest apps/api/tests/
```

## 7. Code Quality

### 7.1 Linting

```bash
# Using ruff
ruff check apps/api/

# Using eslint
cd apps/web && npm run lint
```

### 7.2 Formatting

```bash
# Python
black apps/api/

# TypeScript
cd apps/web && npm run format
```

### 7.3 Type Checking

```bash
# Python
mypy apps/api/

# TypeScript
cd apps/web && npx tsc --noEmit
```

## 8. Production Build

### 8.1 Build Docker Images

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
```

### 8.2 Run Production

```bash
docker compose -f docker-compose.prod.yml up -d
```

## 9. Troubleshooting

| Issue | Solution |
|-------|----------|
| Python imports fail | Activate venv: `source venv/bin/activate` |
| Docker compose not found | Install Docker Desktop or add to PATH |
| Port already in use | Kill process or use different port |
| Database connection error | Check DATABASE_URL in .env |
| Tests fail | Run `docker compose exec postgres psql` for debugging |

## 10. Additional Resources

- [Module Implementation Guide](00-module-implementation-guide.md)
- [Contribution Guide](02-contribution-guide.md)
- [Troubleshooting Guide](03-troubleshooting-guide.md)
