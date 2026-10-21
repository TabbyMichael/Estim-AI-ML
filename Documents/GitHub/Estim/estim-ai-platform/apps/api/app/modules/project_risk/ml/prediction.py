"""Delay prediction ML: features + inference + evaluation."""

from typing import Any

from app.modules.project_risk.domain import rules
from app.modules.project_risk.domain.entities import Milestone
from app.shared.ml_base import EvaluationResult

FEATURE_NAMES = ["progress_pct", "delay_days", "duration_days", "is_delayed", "is_in_progress"]

MODEL_NAME = "delay_predictor"
MODEL_VERSION = "v1"


def extract_delay_features(m: Milestone) -> list[float]:
    duration = max(1.0, (m.planned_end - m.planned_start).total_seconds() / 86400)
    return [
        m.progress_pct,
        m.delay_days(),
        duration,
        1.0 if m.delay_days() > 0 else 0.0,
        1.0 if m.status.value == "in_progress" else 0.0,
    ]


class DelayPredictor:
    model_name: str = MODEL_NAME
    model_version: str = MODEL_VERSION

    def __init__(self, model_version: str = MODEL_VERSION) -> None:
        self.model_version = model_version
        self._booster: Any = None

    def attach_booster(self, booster: object) -> None:
        self._booster = booster

    def predict(self, milestone: Milestone) -> dict:
        features = extract_delay_features(milestone)
        if self._booster is not None:
            try:
                raw = self._booster.predict([features])
                prob, days = float(raw[0][0]), float(raw[0][1])
            except Exception:  # noqa: BLE001
                prob, days = self._heuristic(features)
        else:
            prob, days = self._heuristic(features)
        prob = min(1.0, max(0.0, prob))
        return {
            "delay_probability": prob,
            "predicted_delay_days": max(0.0, days),
            "risk_level": rules.risk_from_delay(prob, days).value,
        }

    def _heuristic(self, f: list[float]) -> tuple[float, float]:
        _prog, delay, _dur, is_delayed, in_prog = f
        prob = min(0.95, 0.1 + is_delayed * 0.4 + in_prog * 0.15 + min(delay / 60, 0.3))
        return prob, delay * 1.2 + 2.0

    def score(self, item: Milestone) -> float:
        return float(self.predict(item)["delay_probability"])

    def health(self) -> dict:
        return {
            "model_name": self.model_name,
            "model_version": self.model_version,
            "backend": "lightgbm" if self._booster else "heuristic",
            "ready": True,
        }


def evaluate_delays(actual: list[int], scores: list[float]) -> EvaluationResult:
    correct = sum(1 for a, s in zip(actual, scores, strict=False) if (s >= 0.5) == bool(a))
    acc = correct / len(actual) if actual else 0.0
    return EvaluationResult(
        model_name=MODEL_NAME, model_version=MODEL_VERSION, metrics={"accuracy": acc}
    )
