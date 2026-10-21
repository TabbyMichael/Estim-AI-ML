"""Shared ML base classes (Phase 2.2).

Every module's inference adapter implements ModelAdapter; training
scripts report via EvaluationResult. The registry tracks deployed
versions per settings (e.g. procurement_anomaly_model_version).
"""

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Generic, Protocol, TypeVar

TInput = TypeVar("TInput")
# Covariant: a transformer only *produces* feature vectors, so a transformer of
# `list[Specific]` is usable wherever a transformer of `list[General]` is expected.
TFeatures = TypeVar("TFeatures", covariant=True)


class FeatureTransformer(Protocol, Generic[TInput, TFeatures]):  # noqa: UP046
    """Stateless feature extraction: domain entity -> model vector."""

    feature_names: list[str]

    def transform(self, items: list[TInput]) -> TFeatures: ...


class ModelAdapter(Protocol):
    """Inference contract every module model must satisfy."""

    model_name: str
    model_version: str

    def score(self, item: Any) -> float: ...
    def health(self) -> dict[str, Any]: ...


@dataclass
class EvaluationResult:
    """Standard training/eval report stored alongside MLflow runs."""

    model_name: str
    model_version: str
    metrics: dict[str, float]
    dataset_ref: str = ""
    evaluated_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    notes: str = ""

    def get(self, metric: str, default: float | None = None) -> float | None:
        return self.metrics.get(metric, default)


@dataclass
class ModelRegistryEntry:
    model_name: str
    active_version: str
    versions: list[str] = field(default_factory=list)
    threshold: float | None = None


class ModelRegistry:
    """In-memory registry; production impl reads settings + MLflow."""

    def __init__(self) -> None:
        self._entries: dict[str, ModelRegistryEntry] = {}

    def register(
        self,
        model_name: str,
        version: str,
        threshold: float | None = None,
        activate: bool = True,
    ) -> ModelRegistryEntry:
        entry = self._entries.get(model_name)
        if entry is None:
            entry = ModelRegistryEntry(model_name=model_name, active_version=version)
            self._entries[model_name] = entry
        if version not in entry.versions:
            entry.versions.append(version)
        if threshold is not None:
            entry.threshold = threshold
        if activate:
            entry.active_version = version
        return entry

    def active(self, model_name: str) -> ModelRegistryEntry:
        if model_name not in self._entries:
            raise KeyError(f"Model not registered: {model_name}")
        return self._entries[model_name]
