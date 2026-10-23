# Estim AI Platform - Deployment Runbook

## 1. Deployment Overview

This runbook covers the deployment process for the Estim AI Platform across environments.

## 2. Deployment Environments

| Environment | URL | Purpose | Approvals |
|-------------|-----|---------|-----------|
| Local | localhost:8000 | Development | N/A |
| Staging | https://staging.estim.ai | Pre-production testing | Manual approval |
| Production | https://api.estim.ai | Production traffic | Production approval |

## 3. Pre-Deployment Checklist

### 3.1 Code Review

- [ ] All merge requests approved
- [ ] Tests pass on CI
- [ ] No linting errors
- [ ] Documentation updated

### 3.2 Database

- [ ] Migration scripts reviewed
- [ ] Backward compatibility verified
- [ ] Backup created before migration

### 3.3 Infrastructure

- [ ] Staging environment accessible
- [ ] DNS records updated
- [ ] SSL certificates valid
- [ ] Load balancer health checks passing

## 4. Deployment Steps

### 4.1 Staging Deployment

1. **Trigger CI/CD**
   ```bash
   # Pushing to main triggers CI
   git push origin main
   ```

2. **Verify CI Pipeline**
   - All tests pass
   - Docker images built
   - Security scan passed

3. **Verify Staging**
   - Smoke tests passed
   - Key features verified
   - Performance within limits

4. **Notify Team**
   - Post in #estim-deployments Slack
   - Inform stakeholders

### 4.2 Production Deployment

1. **Plan Deployment**
   - Schedule deployment window (avoid peak hours)
   - Notify stakeholders
   - Prepare rollback plan

2. **Create Deployment Tag**
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```

3. **Deploy to Production**
   - Trigger deployment pipeline
   - Monitor deployment progress

4. **Post-Deployment Verification**
   - Run smoke tests
   - Monitor key metrics
   - Verify user access

5. **Monitor for Issues**
   - Watch error rates
   - Monitor latency
   - Track user feedback

## 5. Smoke Tests

### 5.1 Critical Path Tests

```bash
# API health
curl -f https://api.estim.ai/health || echo "API health check failed"

# Auth endpoint
curl -f https://api.estim.ai/auth/login -X POST -d '{"email":"test@test.com","password":"test"}'

# Key functionality
curl -f https://api.estim.ai/procurement/invoices -H "Authorization: Bearer $TOKEN"

# Dashboard accessibility
curl -f https://app.estim.ai | grep -q "Estim Dashboard"
```

### 5.2 Expected Behavior

| Test | Expected Result |
|------|-----------------|
| API health | `{"status": "healthy"}` |
| Auth login | Returns JWT tokens |
| Procurement | Returns invoice data (200 OK) |
| Dashboard | HTML loaded with content |

## 6. Rollback Procedures

### 6.1 Application Rollback

1. Identify current version
   ```bash
   docker compose ps | grep estim-api
   ```

2. Revert to previous version
   ```bash
   docker compose pull estim-api
   docker compose up -d estim-api
   ```

3. Verify rollback
   ```bash
   curl https://api.estim.ai/health
   ```

### 6.2 Production Failover

If the entire platform is down:

1. Activate backup environment
2. Switch DNS to backup
3. Notify stakeholders
4. Begin recovery

## 7. Post-Deployment Tasks

### 7.1 Monitoring

- Monitor error rates (expected: < 0.1%)
- Monitor latency (p95 < 500ms)
- Monitor API error rates

### 7.2 Communication

- Post deployment success in #estim-deployments
- Update status page
- Notify customers of changes

### 7.3 Cleanup

- Remove old Docker images
- Archiving deployment logs
- Update deployment documentation

## 8. Related Documentation

- [Backup and Restore Runbook](../runbooks/backup-restore.md)
- [Incident Response Runbook](../runbooks/incident-response.md)
- [On-Call Rotation](../runbooks/on-call-rotation.md)
