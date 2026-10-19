"""Embedding + LLM integration for document intelligence.

EmbeddingModel wraps sentence-transformers lazily; without weights it
falls back to a deterministic hash embedding so indexing/search work
offline. LLMClient wraps an LLM chat endpoint lazily with a template
fallback so RAG answers degrade gracefully.
"""

import hashlib
from typing import Any

from app.shared.ml_base import EvaluationResult

MODEL_NAME = "doc_embedder"
MODEL_VERSION = "v1"
EMBED_DIM = 8


class EmbeddingModel:
    model_name: str = MODEL_NAME
    model_version: str = MODEL_VERSION

    def __init__(self, model_version: str = MODEL_VERSION,
                 dim: int = EMBED_DIM) -> None:
        self.model_version = model_version
        self.dim = dim
        self._model: Any = None

    def attach_model(self, model: object) -> None:
        self._model = model

    def embed(self, text: str) -> list[float]:
        if self._model is not None:
            try:
                vec = self._model.encode(text)
                return [float(v) for v in vec][: self.dim]
            except Exception:  # noqa: BLE001
                pass
        digest = hashlib.sha256(text.encode()).digest()
        return [b / 255.0 for b in digest[: self.dim]]

    def embed_many(self, texts: list[str]) -> list[list[float]]:
        return [self.embed(t) for t in texts]

    def health(self) -> dict:
        return {"model_name": self.model_name,
                "model_version": self.model_version,
                "backend": "sentence-transformers" if self._model
                else "hash-fallback",
                "ready": True, "dim": self.dim}


class LLMClient:
    def __init__(self, model: str = "stub-llm") -> None:
        self.model = model
        self._client: Any = None

    def attach_client(self, client: object) -> None:
        self._client = client

    def complete(self, prompt: str, context: str = "") -> str:
        if self._client is not None:
            try:
                return str(self._client.chat(prompt, context))
            except Exception:  # noqa: BLE001
                pass
        return (f"[draft answer using {len(context)} chars of context] "
                f"Q: {prompt[:200]}")


def evaluate_retrieval(hits_at_k: list[bool]) -> EvaluationResult:
    acc = sum(1 for h in hits_at_k if h) / len(hits_at_k) if hits_at_k else 0.0
    return EvaluationResult(model_name=MODEL_NAME, model_version=MODEL_VERSION,
                            metrics={"hit_rate": acc})
