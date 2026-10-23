# Estim AI Platform - Regular Maintenance Windows

## Monthly Security Patch Window
- When: first Saturday, 02:00–04:00 UTC.
- Scope: OS packages, base images, application security patches.
- Owner: Platform on-call.
- Communication: announce in `#estim-deployments` 48 hours ahead.

## Quarterly Database Window
- When: first Sunday of January/April/July/October, 02:00–06:00 UTC.
- Scope: `VACUUM ANALYZE`, index checks, backup restore test.
- Runbook: `deployment/maintenance/db-maintenance.py`.

## Quarterly ML Retraining Review
- Review drift reports from `deployment/monitoring/ml-monitor.py`.
- Trigger retraining with `deployment/maintenance/ml-retraining.py`.
- Validate replacement models in staging before production rollout.

## Monthly Dependency Review
- Run `deployment/maintenance/dependency-updates.py`.
- Apply patch/minor updates; schedule major upgrades separately.
