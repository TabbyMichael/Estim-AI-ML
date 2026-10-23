# Estim AI Platform - Post-Launch Monitoring

## Application Health
- Run `deployment/monitoring/health-monitor.py`.
- Checks: API, web, MLflow, Postgres TCP, Redis TCP.
- JSON output: `/tmp/estim-health.json`.
- Failure behavior: optional Slack alert and nonzero exit.

## Business Metrics
- Run `deployment/monitoring/business-metrics.py`.
- Tracks procurement, forecasting, inventory, maintenance, and project-risk KPIs.
- JSON output: `/tmp/business-metrics.json`.

## ML Model Performance
- Run `deployment/monitoring/ml-monitor.py`.
- Tracks accuracy/precision/recall, error/drift metrics, and retraining candidates.
- JSON output: `/tmp/ml-metrics.json`.

## Automated Alerts
- Run `deployment/monitoring/alert-manager.py`.
- Reads the three JSON reports above.
- Routes unhealthy/critical findings to Slack and P1 findings to PagerDuty.
- Existing Prometheus rules remain in `infrastructure/monitoring/alerts.yml`.
