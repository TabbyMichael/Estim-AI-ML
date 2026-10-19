# Estim AI Platform - Incident Response Runbook

## 1. Incident Response Overview

This runbook defines the process for responding to and resolving incidents in the Estim AI Platform.

## 2. Incident Classification

### 2.1 Severity Levels

| Severity | Name | Examples | Response Time | Resolution Target |
|----------|------|----------|---------------|-------------------|
| **P1** | Critical | Platform down, data loss, security breach | 5 minutes | 30 minutes |
| **P2** | Warning | Major feature unavailable, significant performance degradation | 30 minutes | 2 hours |
| **P3** | Info | Minor issues, non-critical feature failures | Next business day | 24 hours |

## 3. Incident Response Flow

### 3.1 Initial Response (0-5 minutes)

1. **Detect**
   - Monitoring alerts trigger
   - User reports reached via Slack, email, or support

2. **Assess**
   - Verify alert is real (not false positive)
   - Determine scope (all users, single component, endpoint)
   - Identify affected system

3. **Acknowledge**
   - Post in #estim-incidents Slack channel
   - Assign incident commander
   - Create incident ticket

### 3.2 Triage (5-30 minutes)

1. **Gather Information**
   - Check dashboards (Grafana)
   - Review logs (Kibana)
   - Check traces (Jaeger)
   - Review recent deployments

2. **Determine Impact**
   - Users affected
   - Business impact
   - Data access/security implications

3. **Formulate Plan**
   - Mitigation strategy
   - Recovery plan
   - Communication plan

### 3.3 Mitigation (30 minutes - 2 hours)

1. **Implement Mitigation**
   - Hotfix if applicable
   - Rollback if needed
   - Scale resources if needed

2. **Communicate**
   - Update incident status
   - Notify stakeholders
   - Update users if publicly affected

### 3.4 Resolution (2-24 hours)

1. **Resolve Issue**
   - Full fix deployed
   - All services restored
   - Validate data integrity

2. **Post-Mortem**
   - Document root cause
   - Document resolution steps
   - Identify prevention

## 4. Common Incident Scenarios

### 4.1 API Service Down

**Symptoms:**
- `GET /health` returns 503
- All API endpoints failing

**Response:**
1. Check API container
   ```bash
   docker compose ps estim-api
   docker compose logs -f estim-api --tail=100
   ```

2. Restart API
   ```bash
   docker compose restart estim-api
   ```

3. If persistent, rollback
   ```bash
   docker compose pull estim-api
   docker compose up -d estim-api
   ```

4. Check database connection
   ```bash
   docker compose exec postgres psql -U estim -d estim
   ```

### 4.2 Database Issues

**Symptoms:**
- High query latency
- Connection timeouts
- Replication lag

**Response:**
1. Check query performance
   ```sql
   SELECT * FROM pg_stat_activity WHERE state = 'active';
   ```

2. Check replication
   ```sql
   SELECT * FROM pg_stat_replication;
   ```

3. Increase connection pool if needed

4. Check for long-running queries
   ```sql
   SELECT pid, now() - xact_start AS duration, state, query
   FROM pg_stat_activity
   WHERE state != 'idle'
   ORDER BY duration DESC
   LIMIT 10;
   ```

### 4.3 Redis Issues

**Symptoms:**
- Cache miss spike
- Queue backlog
- Connection errors

**Response:**
1. Check Redis stats
   ```bash
   redis-cli INFO stats
   ```

2. Check queue backlog
   ```bash
   celery -A app.worker.celery_app inspect active
   ```

3. Restart failed workers
   ```bash
   docker compose restart estim-worker
   ```

### 4.4 ML Model Issues

**Symptoms:**
- Model predictions failing
- Drift detected
- Training failures

**Response:**
1. Check MLflow for errors
   ```bash
   curl http://localhost:5000/api/2.0/mlflow/mlruns
   ```

2. Check model registry
   ```bash
   mlflow models list
   ```

3. Retrain model if needed
   ```bash
   python -m scripts.train_model --model cost_forecasting
   ```

## 5. Incident Command Structure

### 5.1 Roles

| Role | Responsibility |
|------|----------------|
| Incident Commander | Overall coordination, decision making |
| Technical Lead | Technical investigation, mitigation |
| Communications Lead | Stakeholder updates, external communications |
| Scribe | Document incident timeline, actions taken |

### 5.2 Escalation Path

1. Incident Commander
2. Platform Lead
3. DevOps Lead
4. CTO / VP Engineering

## 6. Post-Incident Review

### 6.1 Timeline

| Time | Event |
|------|-------|
| 10:00:00 | Alert triggered |
| 10:02:00 | Incident acknowledged |
| 10:05:00 | Incident commander assigned |
| 10:10:00 | Issue identified |
| 10:15:00 | Mitigation applied |
| 10:45:00 | Services restored |
| 11:00:00 | All users notified |
| 11:30:00 | Post-mortem scheduled |

### 6.2 Post-Mortem Template

```markdown
# Incident Post-Mortem: [Date] - [Title]

## Summary
- What happened
- Impact on users
- Duration

## Root Cause
- Primary cause
- Contributing factors

## Timeline
- Event timeline

## Resolution
- Actions taken
- Mitigation applied

## Prevention
- Preventive measures
- Improvements to monitoring
- Process improvements

## Follow-up
- Action items
- Owners
- Deadlines
```

## 7. Related Documentation

- [On-Call Rotation](../runbooks/on-call-rotation.md)
- [Backup and Restore Runbook](../runbooks/backup-restore.md)
- [Deployment Runbook](../runbooks/deployment.md)
