# Estim AI Platform - Post-Launch Maintenance

## Maintenance Windows
- Schedule and scope live in `deployment/maintenance/maintenance-windows.md`.
- Monthly patching and quarterly database/ML reviews.
- Announce all production changes in `#estim-deployments`.

## Database Maintenance
- Run `deployment/maintenance/db-maintenance.py`.
- Performs `VACUUM ANALYZE`, database reindexing, audit-log cleanup, and size checks.
- Requires `DATABASE_URL` and `psycopg2`.

## ML Model Retraining
- Run `deployment/maintenance/ml-retraining.py`.
- Uses drift-signal input to select models for retraining.
- Validates replacement models in staging before production rollout.

## Dependency Updates
- Run `deployment/maintenance/dependency-updates.py`.
- Reports Python and Node updates by patch/minor/major risk.
- Apply low-risk updates first; schedule high-risk majors separately.
