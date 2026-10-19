"""Prometheus metrics for the Estim AI Platform.

Exposes application, business, and ML metrics at the `/metrics` endpoint
scraped by Prometheus (see `infrastructure/monitoring/prometheus.yml`).
"""

from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

# ---------------------------------------------------------------------------
# HTTP / application metrics
# ---------------------------------------------------------------------------

HTTP_REQUESTS_TOTAL = Counter(
    "estim_http_requests_total",
    "Total number of HTTP requests handled by the API.",
    ["method", "endpoint", "status_code"],
)

HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "estim_http_request_duration_seconds",
    "Duration of HTTP requests handled by the API in seconds.",
    ["method", "endpoint"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10),
)

# ---------------------------------------------------------------------------
# Business metrics
# ---------------------------------------------------------------------------

NOTIFICATIONS_SENT_TOTAL = Counter(
    "estim_notifications_sent_total",
    "Total number of notifications dispatched.",
    ["channel", "status"],
)

FORECASTS_GENERATED_TOTAL = Counter(
    "estim_forecasts_generated_total",
    "Total number of cost forecasts generated.",
    ["model_version"],
)

PROCUREMENT_ANOMALIES_DETECTED_TOTAL = Counter(
    "estim_procurement_anomalies_detected_total",
    "Total number of procurement anomalies detected.",
    ["severity"],
)

MAINTENANCE_ALERTS_RAISED_TOTAL = Counter(
    "estim_maintenance_alerts_raised_total",
    "Total number of maintenance alerts raised.",
    ["alert_type", "severity"],
)

VISUAL_INSPECTIONS_COMPLETED_TOTAL = Counter(
    "estim_visual_inspections_completed_total",
    "Total number of visual inspections completed.",
    ["result"],
)

# ---------------------------------------------------------------------------
# ML metrics
# ---------------------------------------------------------------------------

MODEL_EVALUATION_ACCURACY = Histogram(
    "estim_model_evaluation_accuracy",
    "Model evaluation accuracy scores.",
    ["model_name", "model_version"],
    buckets=(0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 0.99, 1.0),
)

MODEL_DRIFT_SCORE = Histogram(
    "estim_model_drift_score",
    "Model drift score (higher = more drift).",
    ["model_name", "model_version"],
    buckets=(0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0),
)


def metrics_response() -> tuple[str, dict[str, str]]:
    """Return the Prometheus text-format metrics payload and content type."""
    return generate_latest().decode("utf-8"), {"Content-Type": CONTENT_TYPE_LATEST}
