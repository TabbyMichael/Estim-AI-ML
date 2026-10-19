#!/usr/bin/env python3
"""ML model health, drift, and retraining-signal checks with JSON export."""

import json
import logging
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import List, Optional

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("ml-monitor")

HIGHER_BETTER = {"accuracy", "precision", "recall", "f1_score", "r2_score", "auc_roc"}


@dataclass
class ModelMetric:
    model: str
    version: str
    metric: str
    value: float
    warn: Optional[float] = None
    crit: Optional[float] = None

    def status(self) -> str:
        if self.metric in HIGHER_BETTER:
            if self.crit is not None and self.value <= self.crit:
                return "critical"
            if self.warn is not None and self.value <= self.warn:
                return "warning"
            return "healthy"
        if self.crit is not None and self.value >= self.crit:
            return "critical"
        if self.warn is not None and self.value >= self.warn:
            return "warning"
        return "healthy"


def collect() -> List[ModelMetric]:
    return [
        ModelMetric("cost-forecasting-lightgbm", "v1.2.0", "mape", 0.085, 0.10, 0.15),
        ModelMetric("cost-forecasting-lightgbm", "v1.2.0", "r2_score", 0.89, 0.80, 0.70),
        ModelMetric("cost-forecasting-lightgbm", "v1.2.0", "drift_score", 0.12, 0.20, 0.30),
        ModelMetric("procurement-anomaly-detector", "v1.1.0", "precision", 0.91, 0.85, 0.75),
        ModelMetric("procurement-anomaly-detector", "v1.1.0", "recall", 0.87, 0.80, 0.70),
        ModelMetric("maintenance-failure-predictor", "v1.0.0", "auc_roc", 0.93, 0.88, 0.82),
    ]


def main() -> int:
    metrics = collect()
    rows = [{"model": m.model, "version": m.version, "metric": m.metric, "value": m.value,
             "status": m.status()} for m in metrics]
    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "metrics": rows,
        "summary": {"healthy": sum(1 for r in rows if r["status"] == "healthy"),
                    "warning": sum(1 for r in rows if r["status"] == "warning"),
                    "critical": sum(1 for r in rows if r["status"] == "critical")},
        "retrain": sorted({r["model"] for r in rows if r["metric"] == "drift_score" and r["status"] == "critical"}),
    }
    path = os.getenv("ML_METRICS_EXPORT_PATH", "/tmp/ml-metrics.json")
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
    for entry in rows:
        print(entry["status"].upper(), entry["model"], entry["metric"], entry["value"])
    logger.info("Wrote %s", path)
    return 1 if report["summary"]["critical"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
