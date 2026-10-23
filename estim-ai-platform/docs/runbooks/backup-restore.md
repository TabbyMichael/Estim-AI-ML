# Estim AI Platform - Backup and Restore Runbook

## 1. Backup Overview

This runbook defines the backup and restore procedures for the Estim AI Platform.

## 2. Backup Strategy

### 2.1 Backup Types

| Backup Type | Frequency | Retention | Scope |
|-------------|-----------|-----------|-------|
| **Database** | 4-hourly snapshots | 30 days | Full PostgreSQL database |
| **Schema** | Daily | 90 days | Database schema only |
| **Object Storage** | Daily | 90 days | S3/MinIO buckets |
| **MLflow** | Daily | 90 days | Experiments and models |
| **Logs** | Real-time | 30 days | Elasticsearch |
| **Configuration** | On change | Indefinite | Docker compose, env files |

## 3. Backup Locations

| Data | Primary | Secondary |
|------|---------|-----------|
| PostgreSQL | Primary DB server | S3 backup |
| Object Storage | MinIO | S3 (cross-region) |
| MLflow | Local + S3 | S3 cross-region |
| Logs | Elasticsearch | S3 compressed |

## 4. Backup Procedures

### 4.1 PostgreSQL Backup

```bash
#!/bin/bash
# backup_db.sh

DATABASE_URL="${DATABASE_URL:-postgresql://estim:password@localhost:5432/estim}"
BACKUP_DIR="/backups/postgresql"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Perform pg_dump
pg_dump "$DATABASE_URL" -F c -f "$BACKUP_DIR/estim_${TIMESTAMP}.dump"

# Compress
gzip "$BACKUP_DIR/estim_${TIMESTAMP}.dump"

# Remove old backups
find $BACKUP_DIR -name "*.dump.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $BACKUP_DIR/estim_${TIMESTAMP}.dump.gz"
```

### 4.2 Object Storage Backup

```bash
#!/bin/bash
# backup_minio.sh

BUCKET_NAME="estim-data"
BACKUP_DIR="/backups/minio"
RETENTION_DAYS=90
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup
mc mirror --overwrite ./minio/export/ "s3://estim-backup/$TIMESTAMP"

# Remove old backups
mc rm --recursive --force "s3://estim-backup" --older-than $RETENTION_DAYS

echo "Backup completed at s3://estim-backup/$TIMESTAMP"
```

### 4.3 MLflow Backup

```bash
#!/bin/bash
# backup_mlflow.sh

MLFLOW_Uri="${MLFLOW_URI:-http://localhost:5000}"
BACKUP_DIR="/backups/mlflow"
RETENTION_DAYS=90

# Export MLflow artifacts
mlflow artifacts download --run_id $(curl -s $MLFLOW_URI/api/2.0/mlflow/runs/search -X POST -d '{}' | jq -r '.runs[0].run_id') --destination $BACKUP_DIR

# Backup models
curl $MLFLOW_URI/api/2.0/mlflow/mlmodels/list | jq '.models[].name' | while read model; do
    mlflow models download --name $model --destination $BACKUP_DIR/$model
done

echo "MLflow backup completed"
```

## 5. Restore Procedures

### 5.1 Database Restore

```bash
#!/bin/bash
# restore_db.sh

BACKUP_FILE="$1"
DATABASE_URL="${DATABASE_URL:-postgresql://estim:password@localhost:5432/estim}"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.dump.gz>"
    exit 1
fi

echo "Restoring database from $BACKUP_FILE"

# Stop application
docker compose stop estim-api

# Restore database
gunzip -c "$BACKUP_FILE" | pg_restore --no-owner --no-privileges -d "$DATABASE_URL"

# Start application
docker compose start estim-api

echo "Database restored successfully"
```

### 5.2 Object Storage Restore

```bash
#!/bin/bash
# restore_minio.sh

BACKUP_DIR="$1"
BUCKET_NAME="estim-data"

if [ -z "$BACKUP_DIR" ]; then
    echo "Usage: $0 <backup_dir>"
    exit 1
fi

echo "Restoring object storage from $BACKUP_DIR"

# Restore
mc mirror "$BACKUP_DIR" "s3://$BUCKET_NAME"

echo "Object storage restored"
```

### 5.3 Full System Restore

For disaster recovery:

1. **Restore PostgreSQL**
   ```bash
   ./backup_db.sh --restore <timestamp>
   ```

2. **Restore Object Storage**
   ```bash
   ./backup_minio.sh --restore <timestamp>
   ```

3. **Restore MLflow**
   ```bash
   ./backup_mlflow.sh --restore
   ```

4. **Restart Services**
   ```bash
   docker compose up -d
   ```

5. **Verify**
   - Check API health
   - Verify data integrity
   - Monitor application

## 6. Backup Monitoring

### 6.1 Success Metrics

| Metric | Target |
|--------|--------|
| Backup success rate | > 99% |
| Backup duration | < 1 hour |
| Backup integrity | Tested weekly |
| Restore time (DB) | < 30 minutes |

### 6.2 Alert Thresholds

| Metric | Alert Level | Action |
|--------|-------------|--------|
| Backup failure | Critical | Immediate investigation |
| Backup age > 24 hours | Warning | Escalate after 48 hours |
| Restore failure | Warning | Full review |

## 7. Disaster Recovery Plan

### 7.1 Recovery Time Objectives (RTO)

| System | RTO |
|--------|-----|
| PostgreSQL | 2 hours |
| Object Storage | 4 hours |
| MLflow | 24 hours |
| Complete Platform | 24 hours |

### 7.2 Recovery Point Objectives (RPO)

| System | RPO |
|--------|-----|
| PostgreSQL | 4 hours |
| Object Storage | 24 hours |
| MLflow | 24 hours |
| Logs | 0 (real-time) |

### 7.3 Disaster Recovery Steps

1. **Assess** - Determine scope of disaster
2. **Notify** - Alert stakeholders
3. **Restore** - Begin restoration from backups
4. **Verify** - Validate data integrity
5. **Resume** - Bring services online
6. **Post-mortem** - Document lessons learned

## 8. Related Documentation

- [Deployment Runbook](../runbooks/deployment.md)
- [Incident Response Runbook](../runbooks/incident-response.md)
- [On-Call Rotation](../runbooks/on-call-rotation.md)
