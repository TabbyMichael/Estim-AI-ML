#!/usr/bin/env python3
"""Estim AI Platform - Application Health Monitor.

Checks API, web, database, cache, and MLflow health endpoints/ports and
emits a JSON/text report. Sends a Slack webhook alert on failures.
"""

import json
import logging
import socket
import sys
import time
import urllib.request
from datetime import datetime, timezone
from typing import Dict, List, Optional

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("health-monitor")


def check_http(url: str, timeout: int = 10):
    start = time.monotonic()
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "estim-health-monitor/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            elapsed_ms = round((time.monotonic() - start) * 1000, 1)
            code = resp.status
            if code == 200:
                return "healthy", elapsed_ms, None
            if code in (502, 503, 504):
                return "unhealthy", elapsed_ms, f"HTTP {code}"
            return "degraded", elapsed_ms, f"HTTP {code}"
    except Exception as exc:
        elapsed_ms = round((time.monotonic() - start) * 1000, 1)
        return "unhealthy", elapsed_ms, f"{type(exc).__name__}: {exc}"


def check_tcp(host: str, port: int, timeout: int = 5):
    start = time.monotonic()
    try:
        with socket.create_connection((host, port), timeout=timeout):
            elapsed_ms = round((time.monotonic() - start) * 1000, 1)
            return "healthy", elapsed_ms, None
    except Exception as exc:
        elapsed_ms = round((time.monotonic() - start) * 1000, 1)
        return "unhealthy", elapsed_ms, f"{type(exc).__name__}: {exc}"

def send_slack(webhook, failures):
    if not webhook or not failures:
        return False
    lines = [f"- {i['service']}: {i['status']} ({i.get('error') or 'no detail'})" for i in failures]
    payload = {"text": f"Estim health check failed for {len(failures)} checks",
               "attachments": [{"color": "danger",
                                "fields": [{"title": "Failures", "value": chr(10).join(lines)}]}]}
    try:
        req = urllib.request.Request(webhook, data=json.dumps(payload).encode("utf-8"),
                                     headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=10)
        return True
    except Exception as exc:
        logger.error("Slack alert failed: %s", exc)
        return False


def main():
    import os
    checks = [
        {"service": "estim-api", "kind": "http", "target": os.getenv("API_URL", "http://localhost:8000/health")},
        {"service": "estim-web", "kind": "http", "target": os.getenv("WEB_URL", "http://localhost:3000/")},
        {"service": "estim-mlflow", "kind": "http", "target": os.getenv("MLFLOW_URL", "http://localhost:5000/")},
        {"service": "postgres", "kind": "tcp", "target": os.getenv("POSTGRES_TARGET", "localhost:5432")},
        {"service": "redis", "kind": "tcp", "target": os.getenv("REDIS_TARGET", "localhost:6379")},
    ]
    results = []
    for item in checks:
        if item["kind"] == "http":
            status, elapsed, error = check_http(item["target"])
            results.append({"service": item["service"], "endpoint": item["target"], "status": status,
                            "response_time_ms": elapsed, "error": error})
        else:
            host, _, port = item["target"].partition(":")
            status, elapsed, error = check_tcp(host, int(port or "0"))
            results.append({"service": item["service"], "endpoint": item["target"], "status": status,
                            "response_time_ms": elapsed, "error": error})
    failures = [r for r in results if r["status"] != "healthy"]
    report = {"timestamp": datetime.now(timezone.utc).isoformat(),
              "summary": {"healthy": sum(1 for r in results if r["status"] == "healthy"),
                          "degraded": sum(1 for r in results if r["status"] == "degraded"),
                          "unhealthy": sum(1 for r in results if r["status"] == "unhealthy")},
              "checks": results}
    out_path = os.getenv("HEALTH_EXPORT_PATH", "/tmp/estim-health.json")
    with open(out_path, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
    send_slack(os.getenv("HEALTH_ALERT_WEBHOOK"), failures)
    for row in results:
        print(("PASS" if row["status"] == "healthy" else "FAIL"), row["service"], row["status"])
    print("report:", out_path)
    return 1 if report["summary"]["unhealthy"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
