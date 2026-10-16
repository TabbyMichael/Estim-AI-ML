# On-Call Rotation

## Overview

This document defines the on-call rotation for the Estim AI Platform monitoring and observability stack. It covers alert notification routing, escalation procedures, and service-specific runbooks for the following services:

- **Prometheus** (port 9090) — Metrics collection & alerting
- **Grafana** (port 3001) — Dashboards & visualization
- **Kibana** (port 5601) — Log aggregation (ELK)
- **Jaeger** (port 16686) — Distributed tracing
- **Alertmanager** (port 9093) — Alert routing & notifications
- **API** (port 8000) — Core Estim API service

---

## Rotation Schedule

### Shift Handoff

| Shift | Start Time | End Time | Handoff Required |
|-------|-----------|----------|-----------------|
| Day Shift | 09:00 | 21:00 | Yes |
| Night Shift | 21:00 | 09:00 | Yes |

### Team Roster (Example)

The following is a sample 4-person rotation. Replace with your team's actual schedule:

| Team Member | Primary On-Call | Secondary On-Call | Rotation Owner |
|-------------|----------------|-------------------|----------------|
| Alice Chen | Week 1-2 | Week 3-4 | Alex Kim |
| Bob Smith | Week 3-4 | Week 1-2 | Alex Kim |
| Carol Davis | Week 5-6 | Week 7-8 | Alex Kim |
| David Park | Week 7-8 | Week 5-6 | Alex Kim |

**Rotation Frequency:** 2 weeks (primary on-call) / 4 weeks (secondary on-call)

---

## Alert Severity & Response

| Severity | Label | Response Time | Resolution Target |
|----------|-------|---------------|-------------------|
| **P1 - Critical** | `severity: critical` | 5 minutes | 30 minutes |
| **P2 - Warning** | `severity: warning` | 30 minutes | 2 hours |
| **P3 - Info** | `severity: info` | Next business day | 24 hours |

### Alert Distribution

During business hours (09:00 - 18:00, local time):
1. **P1 alerts** → Primary on-call receives Slack notification immediately
2. **P2/P3 alerts** → Primary on-call receives Slack notification; reviewed within response window

After hours (18:00 - 09:00):
1. **P1 alerts** → Primary on-call receives immediate Slack notification + phone page
2. **P2 alerts** → Secondary on-call notified within 15 minutes
3. **P3 alerts** → No immediate notification; reviewed next morning

---

## Alert Router Configuration

Alertmanager routes alerts to the following receivers (config in `infrastructure/monitoring/alertmanager/alertmanager.yml`):

| Receiver | Channel / Gateway | Description |
|----------|-------------------|-------------|
| `slack-notifications` | `#estim-alerts` (Slack) | All alerts routed to this Slack channel |


### Database (PostgreSQL)

**Symptoms:** High connection count, slow queries, replication lag

1. Check `pg_stat_activity` for long-running queries
2. Check replication status with `SELECT * FROM pg_stat_replication`
3. Increase connection pool if needed
4. Review recent migrations

### Redis

**Symptoms:** Cache miss spike, queue backlog, connection errors

1. Check `redis-cli INFO stats` for `expired_keys`, `evicted_keys`
2. Review Celery task queue lags
3. Check memory usage (`used_memory_human`)

### Object Storage (MinIO/S3)

**Symptoms:** 403 errors, 503 errors, file upload failures

1. Verify access keys in `.env`
2. Check MinIO console for bucket/permission issues
3. Review recent API logs for 403/503 errors

### Message Queue (Redis Celery)

**Symptoms:** Task backlog, worker failures

1. Check `celery -A app tasks list` for pending tasks
2. Review worker logs in Kibana
3. Restart failed workers if needed

---

## Common Alert Responses

### Alert: HighErrorRate

```yaml
expr: rate(estim_http_requests_total{status_code=~"5.."}[5m]) > 0.05
```

**Investigation:**
- Check the Grafana dashboard for API error rates
- Look at recent API deployments
- Filter Kibana logs for `status:"5xx"` in the last 5 minutes

**Resolution:**
- Restart the API service if unhealthy
- Rollback recent deployment if regression observed
- Scale up API replicas if under load

### Alert: HighLatency

```yaml
expr: histogram_quantile(0.95, rate(estim_http_request_duration_seconds_bucket[5m])) > 1
```

**Investigation:**
- Check Jaeger traces for slow requests
- Review DB query performance in Grafana
- Check Redis cache hit ratio

**Resolution:**
- Increase database connection pool if exhausted
- Enable Redis caching if not already active
- Scale up database instances
## On-Call Rotation Management

### Roster Maintenance

- Rotation owned by: Alex Kim (Platform Lead)
- Update: `docs/runbooks/on-call-rotation.md`
- Slack channel: `#estim-oncall` for roster discussions

### Rotation Changes

When a team member leaves or joins, update the roster:
1. Post to Slack `#estim-oncall` to notify the team
2. Update the table in this runbook
3. Notify the outgoing member to hand off their current assignment

### Handoff Notes

Before ending each shift, post a handoff summary in Slack `#estim-oncall`:

```markdown
## Shift Handoff: [Date/Time] - [Name]

### Open Alerts:
- [Alert name]: [Current status, action taken]

### Upcoming Scheduled Work:
- [Deployment/Downtime window]

### Checklist:
- [ ] Reviewed all P1/P2 alerts
- [ ] Checked Grafana dashboards
- [ ] Reviewed logs in Kibana
- [ ] Confirmed no open issues for next shift
```

---

## Emergency Contacts

| Role | Contact | Method |
|------|---------|--------|
| Platform Lead | Alex Kim | Slack: @alex.kim / Phone: [XXX-XXX-XXXX] |
| DevOps Lead | Sam Lee | Slack: @sam.lee / Email: devops@estim.ai |
| ML Engineer | Jordan Taylor | Slack: @jordan.taylor / Email: ml@estim.ai |
| DB Admin | Taylor Nguyen | Slack: @taylor.nguyen / Email: db@estim.ai |
| General Support | Support Team | Slack: #estim-support / Email: support@estim.ai |
| Security Incident | Security Team | Email: security@estim.ai (use for P1 security alerts) |

---

## Summary

| Week | Primary On-Call | Secondary On-Call |
|------|-----------------|-------------------|
| 2026-10-19 | Alice Chen | Bob Smith |
| 2026-10-05 | Bob Smith | Carol Davis |
| 2026-09-19 | Carol Davis | David Park |
| 2026-09-05 | David Park | Alice Chen |

*Replace with your team's actual schedule.*

---

## Notes

- This rotation is a documented guideline. Adapt thresholds and contacts to your team's actual needs.
- Review this runbook quarterly or after any major incident.
- Update the alertmanager config if changes to routing or receivers are needed.

---

*Last updated: 2026-10-16*

### Alert: APIUnreachable

```yaml
expr: up{job="estim-api"} == 0
```

**Investigation:**
- Verify the API container is running: `docker compose ps estim-api`
- Check the API logs for startup errors
- Review recent config changes (env vars, secrets)

**Resolution:**
- Restart the API service: `docker compose restart estim-api`
- Check application logs for errors
- Rollback recent deployment if needed

### Alert: HighModelDrift

```yaml
expr: histogram_quantile(0.95, rate(estim_model_drift_score_bucket[1h])) > 0.3
```

**Investigation:**
- Check ML model performance monitoring in Grafana
- Review recent model training jobs
- Check data pipeline for changes in input data distribution

**Resolution:**
- Re-train model with latest data if drift is significant
- Review data ingestion pipeline for failures
- Notify ML engineer if model requires retraining

| `email-notifications` | `alerts@estim.ai` (via SMTP) | Email notifications, low-priority |
| `pagerduty-notifications` | PagerDuty Service | P1+Critical alerts only |

---

## Escalation Procedure

### Step 1: Acknowledge Alert

1. Check Slack channel `#estim-alerts` for the alert notification
2. Verify the alert is not a duplicate by checking Grafana/Prometheus
3. Acknowledge in the Slack thread (if available)

### Step 2: Triage

1. Check Grafana dashboards for related services
2. Check Kibana for any related log errors
3. Check Jaeger for recent traces (for latency-related alerts)
4. Determine if the alert is a real issue or a false positive (e.g., scheduled cron job, known behavior)

### Step 3: Resolve or Escalate

**Self-resolve if:**
- The issue is minor (e.g., metric spike, non-critical service)
- You can mitigate without system changes

**Escalate to:**
- Go-to engineer: `alex.kim@estim.ai`
- Infrastructure team: `devops@estim.ai`

### Step 4: Notify Stakeholders

- Post final resolution in Slack channel `#estim-alerts`
- Include: alert name, root cause, resolved time, action taken
- If P1 incident: notify team lead and project manager

---

## Service-Specific Runbooks

### API Service (FastAPI)

**Symptoms:** High 5xx error rate, high latency, health check failing

1. Check `GET /health` and `GET /ready`
2. Review recent deployments (GitHub Actions)
3. Check resource usage: CPU, memory, Redis connections
4. Review recent log errors in Kibana
