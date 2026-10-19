# Estim AI Platform - Backup and Disaster Recovery Plan

## 1. Overview

This document defines the backup strategy and disaster recovery procedures for the Estim AI Platform production environment.

## 2. Backup Strategy

### 2.1 Backup Types and Frequency

| Backup Type | Frequency | Retention | Location | Scope |
|-------------|-----------|-----------|----------|-------|
| PostgreSQL Snapshot | 4-hourly | 30 days | AWS EBS Snapshots | Full database |
| PostgreSQL Dump | Daily | 90 days | S3 (cross-region) | Logical backup |
| Object Storage | Daily | 90 days | S3 cross-region replication | All buckets |
| MLflow Artifacts | Daily | 90 days | S3 cross-region | Models, experiments |
| Application Logs | Real-time | 30 days | CloudWatch / Elasticsearch | All service logs |
| Kubernetes Config | On change | Indefinite | Git repository | Helm charts, K8s manifests |
| SSL Certificates | On renewal | Valid period | ACM / Vault | TLS certificates |

### 2.2 Backup Locations

| Data | Primary Location | Secondary Location |
|------|-----------------|-------------------|

## 3. Backup Procedures

### 3.1 Automated Database Backups

RDS automated backups are configured with:
- Backup retention: 30 days
- Backup window: 02:00-03:00 UTC
- Multi-AZ: Enabled
- Cross-region snapshots: Daily to us-west-2

Manual backup script:

```bash
#!/bin/bash
# backup-production-db.sh

DB_IDENTIFIER="prod-estim-db"
SNAPSHOT_NAME="estim-db-snapshot-$(date +%Y%m%d-%H%M%S)"
REGION="us-east-1"
DR_REGION="us-west-2"

# Create snapshot
aws rds create-db-snapshot \
    --db-instance-identifier $DB_IDENTIFIER \
    --db-snapshot-identifier $SNAPSHOT_NAME \

## 4. Disaster Recovery Plan

### 4.1 Recovery Objectives

| System | RTO (Recovery Time Objective) | RPO (Recovery Point Objective) |
|--------|------------------------------|-------------------------------|
| PostgreSQL | 2 hours | 4 hours |
| Object Storage | 4 hours | 24 hours |
| MLflow | 24 hours | 24 hours |
| Complete Platform | 24 hours | 24 hours |
| Logs | 0 (real-time) | 0 |

### 4.2 Disaster Scenarios and Response

| Scenario | Detection | Response | Recovery |
|----------|-----------|----------|----------|
| Single AZ failure | CloudWatch alerts | Failover to standby AZ | Automatic (Multi-AZ) |
| Region-wide outage | Monitoring + user reports | Activate DR region | Manual failover |
| Data corruption | Application errors | Point-in-time restore | Restore from snapshot |
| Security breach | Security alerts | Isolate affected systems | Restore from clean backup |

### 4.3 Disaster Recovery Steps

#### Step 1: Assess (0-30 minutes)

1. Determine scope of disaster
2. Identify affected systems

## 5. Disaster Recovery Runbook

### 5.1 Region Failover Procedure

```bash
# 1. Provision DR infrastructure
terraform apply -var region=us-west-2 -var environment=dr

# 2. Restore database from DR snapshot
aws rds restore-db-instance-from-db-snapshot \
    --db-instance-identifier estim-dr \
    --db-snapshot-identifier estim-db-snapshot-20261019-dr \
    --db-instance-class db.r5.large \
    --region us-west-2

# 3. Deploy application

## 7. Testing Schedule

| Test | Frequency | Owner | Last Run |
|------|-----------|-------|----------|
| Backup integrity check | Weekly | DevOps | - |
| S3 replication verification | Daily | DevOps | - |
| Partial restore test | Monthly | DevOps | - |
| Full DR failover test | Quarterly | DevOps + Platform | - |
| Data corruption scenario | Semi-annually | DevOps + Security | - |

## 8. Documentation and Training

### 8.1 Runbooks Maintained

- [x] Backup procedures (this document)
- [x] Deployment runbook (`docs/runbooks/deployment.md`)
- [x] Incident response (`docs/runbooks/incident-response.md`)
- [x] Migration runbook (`docs/runbooks/migration.md`)
- [x] On-call rotation (`docs/runbooks/on-call-rotation.md`)

### 8.2 Team Training

| Role | Training | Frequency |
|------|----------|-----------|
| DevOps | Backup/restore procedures | Quarterly |
| Platform | DR failover drills | Quarterly |
| Developers | Backup verification | Semi-annually |
| All | Incident response | Annually |

## 9. Related Documentation

- [Staging Deployment](00-staging-deployment.md)
- [Production Deployment](01-production-deployment.md)
- [Deployment Runbook](../runbooks/deployment.md)
- [Backup and Restore Runbook](../runbooks/backup-restore.md)
- [Incident Response Runbook](../runbooks/incident-response.md)
- [On-Call Rotation Runbook](../runbooks/on-call-rotation.md)

kubectl apply -f k8s/ --context us-west-2

# 4. Update DNS
aws route53 change-resource-record-sets \
    --hosted-zone-id Z**** \
    --change-batch file://dns-failover.json

# 5. Verify
curl -f https://api.estim.ai/health
```

### 5.2 Point-in-Time Recovery

```bash
# Identify restore time
# Format: YYYY-MM-DDTHH:MM:SSZ
RESTORE_TIME="2026-10-19T14:00:00Z"

# Restore to new instance
aws rds restore-db-instance-to-point-in-time \
    --source-db-instance-identifier prod-estim-db \
    --target-db-instance-identifier estim-pitr \
    --restore-time $RESTORE_TIME \
    --db-instance-class db.r5.large \
    --region us-east-1
```

## 6. Monitoring and Alerts

### 6.1 Backup Monitoring

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| Backup Failure | Snapshot creation failed | Critical | Immediate investigation |
| Backup Age > 24h | No successful backup in 24h | Warning | Check backup jobs |
| Replication Lag | S3 cross-region lag > 1h | Warning | Check replication status |
| Restore Failure | Test restore failed | Critical | Fix and retest |

### 6.2 DR Monitoring

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| DR Environment Down | DR health check fails | Warning | Investigate DR status |
| DNS Not Updated | DNS still points to primary | Critical | Manual DNS update |
| Data Sync Lag | DR data > RPO behind | Warning | Force sync |

3. Declare disaster severity (P1-P3)
4. Notify incident commander

#### Step 2: Activate DR (30-120 minutes)

1. Provision infrastructure in DR region
2. Restore database from latest snapshot
3. Restore object storage from S3 DR bucket
4. Deploy application to DR region
5. Update DNS to point to DR

#### Step 3: Verify (120-180 minutes)

1. Run smoke tests in DR region
2. Verify data integrity
3. Confirm user access
4. Monitor for issues

#### Step 4: Failback (When primary is restored)

1. Fix root cause in primary region
2. Sync data from DR to primary
3. Switch DNS back to primary
4. Decommission DR environment

    --region $REGION

# Copy to DR region
aws rds copy-db-snapshot \
    --source-db-snapshot-identifier $SNAPSHOT_NAME \
    --target-db-snapshot-identifier "$SNAPSHOT_NAME-dr" \
    --source-region $REGION \
    --region $DR_REGION

echo "Backup completed: $SNAPSHOT_NAME"
```

### 3.2 Automated Object Storage Backups

S3 cross-region replication is configured:
- Source: `s3://estim-production-data` (us-east-1)
- Destination: `s3://estim-production-dr-data` (us-west-2)
- Replication: Real-time (same day)

### 3.3 Backup Verification

| Verification | Frequency | Method |
|--------------|-----------|--------|
| Snapshot integrity | Weekly | Restore to test instance |
| S3 replication lag | Daily | Check replication status |
| Restore test | Monthly | Full restore to staging |
| DR failover test | Quarterly | Failover to DR region |

| PostgreSQL | Production RDS (us-east-1) | S3 (us-west-2) |
| Object Storage | Production S3 (us-east-1) | S3 (us-west-2) |
| MLflow | Production VM (us-east-1) | S3 (us-west-2) |
| Logs | CloudWatch (us-east-1) | S3 (us-west-2) |
| Config | GitHub (main branch) | Local backups |
