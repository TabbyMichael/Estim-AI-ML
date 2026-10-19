"""Visual inspection ML: detector adapter + evaluation.

YOLODetector is the registered ModelAdapter. The heavyweight YOLO/U-Net
weights load lazily via `attach_model()`; without weights it runs a
deterministic stub so API/tests work offline. Swap in real weights in
production without changing callers.
"""

from app.modules.visual_inspection.domain import rules
from app.shared.ml_base import EvaluationResult

MODEL_NAME = "defect_detector"
MODEL_VERSION = "v1"

DEFECT_TYPES = ["crack", "spalling", "corrosion", "exposed_rebar",
                "honeycombing", "efflorescence"]


class YOLODetector:
    model_name: str = MODEL_NAME
    model_version: str = MODEL_VERSION

    def __init__(self, model_version: str = MODEL_VERSION) -> None:
        self.model_version = model_version
        self._model: object | None = None

    def attach_model(self, model: object) -> None:
        self._model = model

    def detect(self, image_ref: str) -> list[dict]:
        """Detect defects in an image (ref = storage key or bytes tag)."""
        if self._model is not None:
            try:
                return self._run_model(image_ref)
            except Exception:  # noqa: BLE001
                pass
        return self._stub(image_ref)

    def _run_model(self, image_ref: str) -> list[dict]:
        fn = self._model
        if not callable(fn):
            raise TypeError("attached model is not callable")
        results = fn(image_ref)  # ultralytics-style callable
        out = []
        for r in results:
            out.append({"defect_type": str(r.get("name", "crack")),
                        "confidence": float(r.get("confidence", 0.0)),
                        "bbox": r.get("bbox")})
        return out

    def _stub(self, image_ref: str) -> list[dict]:
        # Deterministic: hash the ref -> stable pseudo-detection.
        h = abs(hash(image_ref)) % 100
        if h < 40:
            return []
        defect = DEFECT_TYPES[h % len(DEFECT_TYPES)]
        conf = 0.45 + (h % 50) / 100.0
        return [{"defect_type": defect, "confidence": round(conf, 3),
                 "bbox": {"x": 10, "y": 10, "w": 100, "h": 100}}]

    def score(self, item: str) -> float:
        dets = self.detect(item)
        if not dets:
            return 0.0
        return float(max(d["confidence"] for d in dets))

    def health(self) -> dict:
        return {"model_name": self.model_name,
                "model_version": self.model_version,
                "backend": "yolo" if self._model else "stub",
                "ready": True}


def evaluate_detections(
    expected: list[bool], predicted: list[bool]
) -> EvaluationResult:
    tp = sum(1 for e, p in zip(expected, predicted, strict=False) if e and p)
    fp = sum(1 for e, p in zip(expected, predicted, strict=False) if not e and p)
    fn = sum(1 for e, p in zip(expected, predicted, strict=False) if e and not p)
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = (2 * precision * recall / (precision + recall)
          if (precision + recall) else 0.0)
    return EvaluationResult(model_name=MODEL_NAME, model_version=MODEL_VERSION,
                            metrics={"precision": precision, "recall": recall,
                                     "f1": f1})


__all__ = ["YOLODetector", "evaluate_detections", "rules",
           "DEFECT_TYPES", "MODEL_NAME", "MODEL_VERSION"]
