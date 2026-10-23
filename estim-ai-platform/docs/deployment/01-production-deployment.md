# Estim AI Platform - Production Deployment Guide

## 1. Overview

This document covers the production environment setup and deployment process. Production is the live environment serving real users and data.

## 2. Production Environment Architecture

| Component | Type | URL | Purpose |
|-----------|------|-----|---------|
| Production API | Kubernetes Deployment | https://api.estim.ai | Backend API service |
| Production Web | Kubernetes Deployment | https://app.estim.ai | Frontend application |
| Production PostgreSQL | Managed (RDS/Cloud SQL) | Internal | Primary database |
| Production Redis | Managed (ElastiCache) | Internal | Cache + message broker |
| Production S3 | Managed (S3/GCS) | Internal | Object storage |
| Production MLflow | Dedicated VM | https://mlflow.estim.ai | ML tracking |
| Production Prometheus | Managed | https://prometheus.estim.ai | Metrics |
| Production Grafana | Managed | https://grafana.estim.ai | Dashboards |

## 3. Prerequisites

### 3.1 Infrastructure

- Production VPC with private subnets
- Managed PostgreSQL (RDS/Cloud SQL)
- Managed Redis (ElastiCache/Memorystore)
- S3-compatible object storage bucket
- SSL certificates (ACM or Let's Encrypt)

## 4. Production Setup Steps

### 4.1 Provision Infrastructure

```bash
# Create Kubernetes cluster
eksctl create cluster \
    --name estim-production \
    --region us-east-1 \
    --nodegroup-name standard-workers \
    --node-type m5.large \
    --nodes 3 \
    --nodes-min 2 \
    --nodes-max 6 \
    --managed

# Create production database
aws rds create-db-instance \
    --db-instance-identifier prod-estim-db \
    --db-instance-class db.r5.large \
    --engine postgres \
    --master-username estim \
    --allocated-storage 500 \
    --multi-az \
    --backup-retention-period 30

### 4.4 Production Deployment Pipeline

| Stage | Action | Approval Required |
|-------|--------|-------------------|
| Build | Docker image build | No |
| Test | Unit + integration tests | No |
| Staging | Deploy to staging | No |
| Production | Deploy to production | Yes (manual) |
| Post-deploy | Smoke tests + monitoring | No |

## 5. Production Smoke Tests

| Test | Command | Expected Result |
|------|---------|-----------------|
| API Health | `curl https://api.estim.ai/health` | `{"status": "healthy"}` |
| Auth Endpoint | `POST https://api.estim.ai/auth/login` | Returns JWT (200 OK) |
| Database | `kubectl exec -n estim-production db -- psql` | Connection successful |
| Frontend | `curl https://app.estim.ai` | Returns HTML (200 OK) |
| SSL | `openssl s_client -connect api.estim.ai:443` | Valid certificate |

## 6. Post-Deployment Monitoring


## 7. Rollback Procedure

### 7.1 Application Rollback

```bash
# Identify previous stable version
kubectl rollout history deployment/estim-api -n estim-production

# Rollback to previous revision
kubectl rollout undo deployment/estim-api -n estim-production --to-revision=2

# Verify rollback
kubectl rollout status deployment/estim-api -n estim-production
curl -f https://api.estim.ai/health
```

### 7.2 Database Rollback

If migration caused issues:

```bash
# Rollback migration
kubectl exec -n estim-production deploy/estim-api -- alembic downgrade -1

# Verify schema
kubectl exec -n estim-production deploy/estim-api -- psql -c "\dt"
```

### 7.3 Full Environment Rollback

If entire platform is affected:

1. Activate disaster recovery environment
2. Update DNS to point to DR environment
3. Notify stakeholders via `#estim-incidents`
4. Begin root cause analysis

## 8. Production Maintenance Windows

| Activity | Frequency | Window | Notification |
|----------|-----------|--------|--------------|
| Security patches | Monthly | 02:00-04:00 UTC | 48 hours |
| Database maintenance | Quarterly | 02:00-06:00 UTC | 1 week |
| Dependency updates | Monthly | 02:00-04:00 UTC | 24 hours |
| Major releases | As needed | Scheduled | 2 weeks |

## 9. Related Documentation

- [Staging Deployment](00-staging-deployment.md)
- [Backup and Disaster Recovery](02-backup-disaster-recovery.md)
- [Deployment Runbook](../runbooks/deployment.md)
- [Incident Response Runbook](../runbooks/incident-response.md)

### 6.1 Key Metrics to Watch

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Error Rate | < 0.1% | > 1% for 5 min |
| Latency (p95) | < 500ms | > 1s for 5 min |
| CPU Usage | < 70% | > 85% for 5 min |
| Memory Usage | < 80% | > 90% for 5 min |
| Disk Usage | < 80% | > 85% |

### 6.2 Dashboards

- **Production Overview**: https://grafana.estim.ai/d/production-overview
- **API Performance**: https://grafana.estim.ai/d/api-performance
- **Database Health**: https://grafana.estim.ai/d/database-health

### 6.3 Alerts

Critical alerts route to:
- Slack: `#estim-alerts`
- PagerDuty: Estim Production Service
- Email: `devops@estim.ai`


# Create Redis cluster
aws elasticache create-replication-group \
    --replication-group-id prod-estim-redis \
    --replication-group-description "Production Redis" \
    --cache-node-type cache.r5.large \
    --num-cache-clusters 2 \
    --automatic-failover-enabled
```

### 4.2 Configure Kubernetes

```bash
# Create namespace
kubectl create namespace estim-production

# Create secrets
kubectl create secret generic estim-secrets \
    --from-literal=database-url="****" \
    --from-literal=jwt-secret="****" \
    --from-literal=s3-access-key="****" \
    --from-literal=s3-secret-key="****" \
    -n estim-production

# Apply deployments
kubectl apply -f k8s/ -n estim-production
```

### 4.3 Deploy to Production

```bash
# Tag release
git tag -a v1.0.0 -m "Production release v1.0.0"
git push origin v1.0.0

# CI/CD pipeline triggers automatically:
# 1. Build Docker images
# 2. Push to container registry
# 3. Deploy to Kubernetes
# 4. Run smoke tests
# 5. Monitor for issues
```

- Load balancer (ALB/Nginx Ingress)
- Kubernetes cluster (EKS/GKE/AKS)

### 3.2 Secrets Management

| Secret | Management Tool |
|--------|-----------------|
| DATABASE_URL | AWS Secrets Manager / HashiCorp Vault |
| JWT_SECRET_KEY | AWS Secrets Manager / HashiCorp Vault |
| S3_ACCESS_KEY / SECRET_KEY | AWS Secrets Manager / HashiCorp Vault |
| ODOO_CREDENTIALS | AWS Secrets Manager / HashiCorp Vault |
| SSL_CERTIFICATES | AWS Certificate Manager |
