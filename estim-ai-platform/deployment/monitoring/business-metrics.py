#!/usr/bin/env python3
"""Business KPI checks with warning/critical thresholds and JSON export."""

import json
import logging
import os
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import List, Optional

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("business-metrics")


@dataclass
class BusinessMetric:
    name: str
    value: float
    unit: str
    warn: Optional[float] = None
    crit: Optional[float] = None

    def status(self) -> str:
        if self.crit is not None and self.value >= self.crit:
            return "critical"
        if self.warn is not None and self.value >= self.warn:
            return "warning"
        return "healthy"


def collect() -> List[BusinessMetric]:
    return [
        BusinessMetric("procurement_anomaly_rate", 0.03, "ratio", 0.05, 0.10),
        BusinessMetric("duplicate_invoices", 2.0, "count", 5.0, 10.0),
        BusinessMetric("budget_overrun_rate", 0.08, "ratio", 0.15, 0.25),
        BusinessMetric("inventory_stockouts", 1.0, "count", 3.0, 5.0),
        BusinessMetric("equipment_downtime_hours", 2.5, "hours", 8.0, 16.0),
        BusinessMetric("high_severity_project_risks", 2.0, "count", 5.0, 10.0),
    ]


def main() -> int:
    metrics = collect()
    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "metrics": [{"name": m.name, "value": m.value, "unit": m.unit, "status": m.status()} for m in metrics],
        "summary": {
            "healthy": sum(1 for m in metrics if m.status() == "healthy"),
            "warning": sum(1 for m in metrics if m.status() == "warning"),
            "critical": sum(1 for m in metrics if m.status() == "critical"),
        },
    }
    path = os.getenv("METRICS_EXPORT_PATH", "/tmp/business-metrics.json")
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
    for entry in report["metrics"]:
        print(entry["status"].upper(), entry["name"], entry["value"], entry["unit"])
    logger.info("Wrote %s", path)
    return 1 if report["summary"]["critical"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
