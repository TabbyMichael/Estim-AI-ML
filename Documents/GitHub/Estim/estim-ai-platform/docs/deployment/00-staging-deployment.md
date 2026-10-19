# Estim AI Platform - Staging Deployment Guide

## 1. Overview

This document covers the staging environment setup and deployment process. Staging is a pre-production environment that mirrors production as closely as possible for testing before release.

## 2. Staging Environment Architecture

| Component | Type | URL | Purpose |
|-----------|------|-----|---------|
| Staging API | Docker Container | https://staging-api.estim.ai | Backend API service |
| Staging Web | Docker Container | https://staging.estim.ai | Frontend application |
| Staging PostgreSQL | Docker Container | Internal | Database instance |
| Staging Redis | Docker Container | Internal | Cache + message broker |
| Staging MinIO | Docker Container | https://minio.staging.estim.ai | Object storage |
| Staging MLflow | Docker Container | https://mlflow.staging.estim.ai | ML tracking |
| Staging Prometheus | Docker Container | https://prometheus.staging.estim.ai | Metrics |
| Staging Grafana | Docker Container | https://grafana.staging.estim.ai | Dashboards |

## 3. Prerequisites

### 3.1 Infrastructure

- AWS/GCP account with VPC and subnets
- Docker installed on deployment machine
- kubectl configured (if using Kubernetes)
- Access to staging SSL certificates
- Domain DNS configured for `staging.estim.ai`

### 3.2 Credentials

| Secret | Source |
|--------|--------|
| STAGING_DATABASE_URL | AWS Secrets Manager / Vault |
| STAGING_REDIS_URL | AWS Secrets Manager / Vault |
| STAGING_JWT_SECRET_KEY | AWS Secrets Manager / Vault |
| STAGING_S3_ACCESS_KEY | AWS Secrets Manager / Vault |
| STAGING_S3_SECRET_KEY | AWS Secrets Manager / Vault |

## 4. Staging Setup Steps

### 4.1 Provision Infrastructure

```bash
# Create VPC and networking
terraform apply -var environment=staging

# Create database
aws rds create-db-instance \
    --db-instance-identifier staging-estim-db \
    --db-instance-class db.t3.medium \
    --engine postgres \
    --master-username estim \
    --allocated-storage 100

# Create Redis cluster
aws elasticache create-cache-cluster \
    --cache-cluster-id staging-estim-redis \
    --cache-node-type cache.t3.micro \
    --engine redis
```

### 4.2 Configure Environment Variables

Create `.env.staging`:

```bash
APP_NAME=Estim AI Platform (Staging)
DEBUG=false
DATABASE_URL=postgresql://estim:****@staging-estim-db.****.rds.amazonaws.com:5432/estim
REDIS_URL=redis://staging-estim-redis.****.0001.use1.cache.amazonaws.com:6379
SECRET_KEY=******
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=15
CORS_ORIGINS=https://staging.estim.ai
S3_ENDPOINT=https://minio.staging.estim.ai
S3_ACCESS_KEY=******
S3_SECRET_KEY=******
MLFLOW_TRACKING_URI=https://mlflow.staging.estim.ai
ODOO_URL=https://odoo.staging.estim.ai
ODOO_DB=estim_staging
```

### 4.3 Deploy to Staging

```bash
# Clone repository
git clone git@github.com:TabbyMichael/Estim-AI-ML.git
cd Estim-AI-ML/estim-ai-platform

# Copy staging environment
cp .env.staging .env

# Build and start services
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d

# Run database migrations
docker compose exec estim-api alembic upgrade head

# Verify deployment
curl -f https://staging-api.estim.ai/health
```

## 5. Staging Smoke Tests

| Test | Command | Expected Result |
|------|---------|-----------------|
| API Health | `curl https://staging-api.estim.ai/health` | `{"status": "healthy"}` |
| Auth Login | `POST /auth/login` | Returns JWT tokens |
| Database Connection | `alembic current` | Shows migration version |
| Frontend Load | `curl https://staging.estim.ai` | Returns HTML |

## 6. User Acceptance Testing (UAT)

### 6.1 Test Scenarios

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| User Login | Navigate to login, enter credentials | Dashboard loads |
| Create Invoice | Procurement → Create Invoice | Invoice saved |
| Run Forecast | Cost Forecasting → Create Forecast | Forecast generated |
| Search Documents | Documents → Upload & Search | Search results returned |

### 6.2 UAT Sign-off

- [ ] All critical paths tested
- [ ] No P1/P2 bugs found
- [ ] Performance within acceptable limits
- [ ] Stakeholder sign-off obtained

## 7. Rollback Procedure

If issues are found during UAT:

```bash
# Stop current deployment
docker compose -f docker-compose.staging.yml down

# Restore previous version
docker compose -f docker-compose.staging.yml up -d --scale estim-api=2

# Verify rollback
curl -f https://staging-api.estim.ai/health
```

## 8. Related Documentation

- [Production Deployment](01-production-deployment.md)
- [Backup and Disaster Recovery](02-backup-disaster-recovery.md)
- [Deployment Runbook](../runbooks/deployment.md)
