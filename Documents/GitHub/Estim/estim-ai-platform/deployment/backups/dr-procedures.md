# Estim AI Platform - Disaster Recovery Procedures

## 1. Region Failover Procedure

When a region-wide outage occurs, follow these steps to failover to the DR region:

### Step 1: Assess and Declare (0-30 minutes)

```bash
# Check primary region status
kubectl get nodes
kubectl get pods -n estim-production
aws rds describe-db-instances --db-instance-identifier prod-estim-db

# Declare disaster if criteria are met
# Notify Incident Commander
```

### Step 2: Provision DR Infrastructure (30-60 minutes)

```bash
cd deployment/terraform

# Set DR region
export AWS_REGION=us-west-2
export TF_VAR_db_password="${DB_PASSWORD}"
export TF_VAR_redis_password="${REDIS_PASSWORD}"

# Apply Terraform in DR region
terraform init
terraform apply -var region=us-west-2 -var environment=dr

# Get outputs
DR_RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
DR_REDIS_ENDPOINT=$(terraform output -raw redis_endpoint)
```

### Step 3: Restore Database (60-90 minutes)

```bash
# Restore from latest DR snapshot
aws rds restore-db-instance-from-db-snapshot \
    --db-instance-identifier estim-dr \
    --db-snapshot-identifier estim-db-snapshot-latest-dr \
    --db-instance-class db.r5.large \
    --region us-west-2

# Wait for instance to be available
aws rds wait db-instance-available \
    --db-instance-identifier estim-dr \
    --region us-west-2
```

### Step 4: Restore Object Storage (90-120 minutes)

```bash
# Verify S3 cross-region replication
aws s3api get-bucket-replication \
    --bucket estim-production-data \
    --region us-west-2

# If replication lag exists, force sync
aws s3 sync s3://estim-production-data/ s3://estim-production-dr-data/ \
    --region us-west-2
```

### Step 5: Deploy Application (120-150 minutes)

```bash
# Apply Kubernetes manifests in DR cluster
kubectl config use-context us-west-2

kubectl apply -f deployment/production/kubernetes/namespace.yaml
kubectl apply -f deployment/production/kubernetes/secrets.yaml
kubectl apply -f deployment/production/kubernetes/configmap.yaml
kubectl apply -f deployment/production/kubernetes/postgres.yaml
kubectl apply -f deployment/production/kubernetes/redis.yaml
kubectl apply -f deployment/production/kubernetes/api.yaml
kubectl apply -f deployment/production/kubernetes/worker.yaml
kubectl apply -f deployment/production/kubernetes/web.yaml

# Wait for deployments
kubectl rollout status deployment/estim-api -n estim-production --timeout=300s
```

### Step 6: Update DNS (150-180 minutes)

```bash
# Update Route53 to point to DR region
aws route53 change-resource-record-sets \
    --hosted-zone-id ZHOSTEDZONEID \
    --change-batch file://dns-failover.json

# Wait for DNS propagation
sleep 300
```

### Step 7: Verify (180+ minutes)

```bash
# Run smoke tests
bash deployment/production/smoke-tests.sh

# Verify data integrity
psql -h "${DR_RDS_ENDPOINT}" -U estim -d estim_ai -c "SELECT count(*) FROM users;"
```

---

## 2. Point-in-Time Recovery Procedure

Use this procedure when data corruption is detected:

### Step 1: Identify Recovery Time

```bash
# Determine the point just before corruption
RESTORE_TIME="2026-10-19T14:00:00Z"
```

### Step 2: Restore to New Instance

```bash
aws rds restore-db-instance-to-point-in-time \
    --source-db-instance-identifier prod-estim-db \
    --target-db-instance-identifier estim-pitr \
    --restore-time "${RESTORE_TIME}" \
    --db-instance-class db.r5.large \
    --region us-east-1
```

### Step 3: Verify Data

```bash
# Connect to restored instance
psql -h estim-pitr.****.rds.amazonaws.com -U estim -d estim_ai

# Verify critical tables
SELECT count(*) FROM invoices;
SELECT count(*) FROM forecasts;
SELECT count(*) FROM users;
```

### Step 4: Switch Application

```bash
# Update DATABASE_URL to point to restored instance
kubectl patch secret estim-production-secrets -n estim-production \
    --type merge \
    -p '{"stringData":{"DATABASE_URL":"postgresql://estim:****@estim-pitr.****.rds.amazonaws.com:5432/estim_ai"}}'

# Restart API to pick up new secrets
kubectl rollout restart deployment/estim-api -n estim-production
```

---

## 3. Backup Restoration Procedure

### Step 1: Locate Backup

```bash
# List available backups
aws s3 ls s3://estim-production-backups/database/ --region us-west-2

# Download specific backup
aws s3 cp s3://estim-production-backups/database/estim_db_20261019_140000.dump ./backup.dump
```

### Step 2: Restore Database

```bash
bash deployment/backups/restore-backup.sh ./backup.dump
```

### Step 3: Verify Restoration

```bash
# Check row counts match expected values
psql -h localhost -U estim -d estim_ai -c "
    SELECT 'users' as table_name, count(*) FROM users
    UNION ALL
    SELECT 'invoices', count(*) FROM invoices
    UNION ALL
    SELECT 'forecasts', count(*) FROM forecasts;
"
```

---

## 4. Emergency Contacts

| Role | Name | Slack | Phone | Email |
|------|------|-------|-------|-------|
| Incident Commander | Platform Lead | @platform-lead | +1-XXX-XXX-XXXX | platform@estim.ai |
| DevOps Lead | DevOps Lead | @devops-lead | +1-XXX-XXX-XXXX | devops@estim.ai |
| Database Admin | DB Admin | @db-admin | +1-XXX-XXX-XXXX | db@estim.ai |
| Security Officer | Security Lead | @security | +1-XXX-XXX-XXXX | security@estim.ai |
| Support Lead | Support Lead | @support-lead | +1-XXX-XXX-XXXX | support@estim.ai |

---

## 5. Post-Recovery Checklist

- [ ] All services are running in DR region
- [ ] DNS has been updated to point to DR
- [ ] Smoke tests pass
- [ ] Data integrity verified
- [ ] Users can log in and access data
- [ ] Monitoring and alerts are active
- [ ] Stakeholders notified of recovery
- [ ] Post-mortem scheduled within 48 hours
- [ ] Plan for failback to primary region documented
