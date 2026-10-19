"""Tests for Prometheus metrics."""

from app.core.metrics import (
    HTTP_REQUESTS_TOTAL,
    HTTP_REQUEST_DURATION_SECONDS,
    NOTIFICATIONS_SENT_TOTAL,
    FORECASTS_GENERATED_TOTAL,
    PROCUREMENT_ANOMALIES_DETECTED_TOTAL,
    MAINTENANCE_ALERTS_RAISED_TOTAL,
    VISUAL_INSPECTIONS_COMPLETED_TOTAL,
    MODEL_EVALUATION_ACCURACY,
    MODEL_DRIFT_SCORE,
    metrics_response,
)


class TestMetrics:
    """Test cases for the Prometheus metrics module."""

    def test_http_requests_total_increments(self):
        """HTTP_REQUESTS_TOTAL counter increments correctly."""
        initial = HTTP_REQUESTS_TOTAL.labels(
            method="GET", endpoint="/health", status_code="200"
        )._value.get()
        HTTP_REQUESTS_TOTAL.labels(
            method="GET", endpoint="/health", status_code="200"
        ).inc()
        after = HTTP_REQUESTS_TOTAL.labels(
            method="GET", endpoint="/health", status_code="200"
        )._value.get()
        assert after == initial + 1

    def test_http_request_duration_observes(self):
        """HTTP_REQUEST_DURATION_SECONDS histogram accepts observations."""
        HTTP_REQUEST_DURATION_SECONDS.labels(
            method="GET", endpoint="/health"
        ).observe(0.05)
        # Should not raise

    def test_notifications_sent_total(self):
        """NOTIFICATIONS_SENT_TOTAL counter increments correctly."""
        initial = NOTIFICATIONS_SENT_TOTAL.labels(
            channel="in_app", status="sent"
        )._value.get()
        NOTIFICATIONS_SENT_TOTAL.labels(
            channel="in_app", status="sent"
        ).inc()
        after = NOTIFICATIONS_SENT_TOTAL.labels(
            channel="in_app", status="sent"
        )._value.get()
        assert after == initial + 1

    def test_forecasts_generated_total(self):
        """FORECASTS_GENERATED_TOTAL counter increments correctly."""
        initial = FORECASTS_GENERATED_TOTAL.labels(
            model_version="v1"
        )._value.get()
        FORECASTS_GENERATED_TOTAL.labels(model_version="v1").inc()
        after = FORECASTS_GENERATED_TOTAL.labels(model_version="v1")._value.get()
        assert after == initial + 1

    def test_procurement_anomalies_detected_total(self):
        """PROCUREMENT_ANOMALIES_DETECTED_TOTAL counter increments correctly."""
        initial = PROCUREMENT_ANOMALIES_DETECTED_TOTAL.labels(
            severity="high"
        )._value.get()
        PROCUREMENT_ANOMALIES_DETECTED_TOTAL.labels(severity="high").inc()
        after = PROCUREMENT_ANOMALIES_DETECTED_TOTAL.labels(severity="high")._value.get()
        assert after == initial + 1

    def test_maintenance_alerts_raised_total(self):
        """MAINTENANCE_ALERTS_RAISED_TOTAL counter increments correctly."""
        initial = MAINTENANCE_ALERTS_RAISED_TOTAL.labels(
            alert_type="threshold", severity="warning"
        )._value.get()
        MAINTENANCE_ALERTS_RAISED_TOTAL.labels(
            alert_type="threshold", severity="warning"
        ).inc()
        after = MAINTENANCE_ALERTS_RAISED_TOTAL.labels(
            alert_type="threshold", severity="warning"
        )._value.get()
        assert after == initial + 1

    def test_visual_inspections_completed_total(self):
        """VISUAL_INSPECTIONS_COMPLETED_TOTAL counter increments correctly."""
        initial = VISUAL_INSPECTIONS_COMPLETED_TOTAL.labels(
            result="pass"
        )._value.get()
        VISUAL_INSPECTIONS_COMPLETED_TOTAL.labels(result="pass").inc()
        after = VISUAL_INSPECTIONS_COMPLETED_TOTAL.labels(result="pass")._value.get()
        assert after == initial + 1

    def test_model_evaluation_accuracy(self):
        """MODEL_EVALUATION_ACCURACY histogram accepts observations."""
        MODEL_EVALUATION_ACCURACY.labels(
            model_name="procurement_anomaly", model_version="v1"
        ).observe(0.85)
        # Should not raise

    def test_model_drift_score(self):
        """MODEL_DRIFT_SCORE histogram accepts observations."""
        MODEL_DRIFT_SCORE.labels(
            model_name="cost_forecast", model_version="v1"
        ).observe(0.15)
        # Should not raise

    def test_metrics_response_returns_text(self):
        """metrics_response returns a valid Prometheus text payload."""
        body, headers = metrics_response()
        assert isinstance(body, str)
        assert "Content-Type" in headers
        assert "prometheus" in headers["Content-Type"].lower() or "text" in headers["Content-Type"].lower()
        # Should contain at least one metric family
        assert "estim_http_requests_total" in body or "# HELP" in body
