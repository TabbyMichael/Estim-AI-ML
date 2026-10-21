"""Predictive maintenance ML: features + inference + evaluation."""

from typing import Any

from app.modules.maintenance.domain import rules
from app.modules.maintenance.domain.entities import Equipment, MaintenanceRecord
from app.shared.ml_base import EvaluationResult

FEATURE_NAMES = ["operating_hours", "downtime_total", "record_count", "mtbf_hours", "is_degraded"]

MODEL_NAME = "failure_predictor"
MODEL_VERSION = "v1"


def extract_maintenance_features(
    equipment: Equipment, history: list[MaintenanceRecord]
) -> list[float]:
    downtime = sum(r.downtime_hours for r in history)
    mtbf = rules.mtbf_hours(history, equipment.operating_hours)
    return [
        equipment.operating_hours,
        downtime,
        float(len(history)),
        mtbf,
        1.0 if equipment.status.value == "degraded" else 0.0,
    ]


class FailurePredictor:
    model_name: str = MODEL_NAME
    model_version: str = MODEL_VERSION

    def __init__(self, model_version: str = MODEL_VERSION) -> None:
        self.model_version = model_version
        self._booster: Any = None

    def attach_booster(self, booster: object) -> None:
        self._booster = booster

    def predict(self, equipment: Equipment, history: list[MaintenanceRecord]) -> dict:
        features = extract_maintenance_features(equipment, history)
        if self._booster is not None:
            try:
                prob = float(self._booster.predict([features])[0])
            except Exception:  # noqa: BLE001
                prob = self._heuristic(features)
        else:
            prob = self._heuristic(features)
        prob = min(1.0, max(0.0, prob))
        return {"failure_probability": prob, "risk_level": rules.risk_from_probability(prob).value}

    def _heuristic(self, features: list[float]) -> float:
        hours, downtime, count, _mtbf, degraded = features
        base = min(0.9, hours / 5000 + downtime / 500 + count / 50)
        return min(0.95, base + (0.2 if degraded else 0.0))

    def score(self, item: tuple[Equipment, list[MaintenanceRecord]]) -> float:
        return float(self.predict(item[0], item[1])["failure_probability"])

    def health(self) -> dict:
        return {
            "model_name": self.model_name,
            "model_version": self.model_version,
            "backend": "lightgbm" if self._booster else "heuristic",
            "ready": True,
        }


def evaluate_failures(actual: list[int], scores: list[float]) -> EvaluationResult:
    correct = sum(1 for a, s in zip(actual, scores, strict=False) if (s >= 0.5) == bool(a))
    acc = correct / len(actual) if actual else 0.0
    return EvaluationResult(
        model_name=MODEL_NAME, model_version=MODEL_VERSION, metrics={"accuracy": acc}
    )
