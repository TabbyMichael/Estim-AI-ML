#!/usr/bin/env python3
"""Route P1/P2/P3 alerts to Slack, email, and PagerDuty."""

import json
import logging
import os
import sys
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import List, Optional

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("alert-manager")


@dataclass
class Alert:
    severity: str
    title: str
    message: str
    source: str
    timestamp: str = ""

    def __post_init__(self) -> None:
        if not self.timestamp:
            self.timestamp = datetime.now(timezone.utc).isoformat()


class AlertManager:
    def __init__(self, slack_webhook=None, pagerduty_key=None):
        self.slack_webhook = slack_webhook
        self.pagerduty_key = pagerduty_key
        self.alerts: List[Alert] = []

    def add(self, severity: str, title: str, message: str, source: str) -> Alert:
        alert = Alert(severity, title, message, source)
        self.alerts.append(alert)
        return alert

    def slack_payload(self, alert: Alert):
        color = {"P1": "danger", "P2": "warning", "P3": "good"}.get(alert.severity, "warning")
        return {
            "text": f"*{alert.severity} Alert*: {alert.title}",
            "attachments": [{
                "color": color,
                "fields": [
                    {"title": "Severity", "value": alert.severity, "short": True},
                    {"title": "Source", "value": alert.source, "short": True},
                    {"title": "Message", "value": alert.message, "short": False},
                    {"title": "Time", "value": alert.timestamp, "short": False},
                ],
            }],
        }

    def send_slack(self, alert: Alert) -> bool:
        if not self.slack_webhook:
            logger.warning("Slack webhook not configured")
            return False
        try:
            req = urllib.request.Request(
                self.slack_webhook,
                data=json.dumps(self.slack_payload(alert)).encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )
            urllib.request.urlopen(req, timeout=10)
            logger.info("Slack alert sent: %s", alert.title)
            return True
        except Exception as exc:
            logger.error("Slack alert failed: %s", exc)
            return False

    def send_pagerduty(self, alert: Alert) -> bool:
        if alert.severity != "P1":
            return False
        if not self.pagerduty_key:
            logger.warning("PagerDuty key not configured")
            return False
        payload = {
            "routing_key": self.pagerduty_key,
            "event_action": "trigger",
            "payload": {
                "summary": alert.title,
                "source": alert.source,
                "severity": "critical",
                "custom_details": {"message": alert.message, "timestamp": alert.timestamp},
            },
        }
        try:
            req = urllib.request.Request(
                "https://events.pagerduty.com/v2/enqueue",
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )
            urllib.request.urlopen(req, timeout=10)
            logger.info("PagerDuty alert sent: %s", alert.title)
            return True
        except Exception as exc:
            logger.error("PagerDuty alert failed: %s", exc)
            return False

    def dispatch(self, alert: Alert) -> None:
        self.send_slack(alert)
        if alert.severity == "P1":
            self.send_pagerduty(alert)

    def report(self) -> None:
        counts = {"P1": 0, "P2": 0, "P3": 0}
        for alert in self.alerts:
            counts[alert.severity] = counts.get(alert.severity, 0) + 1
        print(f"Alerts: P1={counts.get('P1', 0)} P2={counts.get('P2', 0)} P3={counts.get('P3', 0)}")
        for alert in self.alerts:
            print(f"[{alert.severity}] {alert.title} ({alert.source})")


def read_json(path: str):
    try:
        with open(path, encoding="utf-8") as handle:
            return json.load(handle)
    except FileNotFoundError:
        return {}


def collect_from_reports() -> list:
    alerts = []
    health = read_json(os.getenv("HEALTH_EXPORT_PATH", "/tmp/estim-health.json"))
    for check in health.get("checks", []):
        if check.get("status") == "unhealthy":
            alerts.append(("P1", f"{check['service']} unhealthy",
                           check.get("error") or "Health check failed", "health-monitor"))
        elif check.get("status") == "degraded":
            alerts.append(("P2", f"{check['service']} degraded",
                           check.get("error") or "Health check degraded", "health-monitor"))
    business = read_json(os.getenv("METRICS_EXPORT_PATH", "/tmp/business-metrics.json"))
    for metric in business.get("metrics", []):
        if metric.get("status") == "critical":
            alerts.append(("P2", f"Business KPI critical: {metric['name']}",
                           f"{metric['value']} {metric['unit']}", "business-metrics"))
    ml_metrics = read_json(os.getenv("ML_METRICS_EXPORT_PATH", "/tmp/ml-metrics.json"))
    for metric in ml_metrics.get("metrics", []):
        if metric.get("status") == "critical":
            alerts.append(("P2", f"ML metric critical: {metric['model']} {metric['metric']}",
                           str(metric["value"]), "ml-monitor"))
    return alerts


def main() -> int:
    manager = AlertManager(
        slack_webhook=os.getenv("SLACK_WEBHOOK_URL"),
        pagerduty_key=os.getenv("PAGERDUTY_INTEGRATION_KEY"),
    )
    found = collect_from_reports()
    if not found:
        manager.add("P3", "Post-launch checks completed", "No P1/P2 findings in monitor reports.", "post-launch")
    for severity, title, message, source in found:
        manager.add(severity, title, message, source)
    for alert in manager.alerts:
        manager.dispatch(alert)
    manager.report()
    return 1 if any(alert.severity == "P1" for alert in manager.alerts) else 0


if __name__ == "__main__":
    raise SystemExit(main())

