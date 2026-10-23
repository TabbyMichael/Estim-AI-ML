"""Celery application entrypoint (Phase 1 placeholder).

Full task registration lands in Phase 2 (shared events/outbox).
This file exists so the worker Docker build context is valid.
"""
from celery import Celery
import os

broker_url = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/1")
result_backend = os.getenv("CELERY_RESULT_BACKEND", "redis://redis:6379/2")

celery_app = Celery("estim_worker", broker=broker_url, backend=result_backend)

celery_app.conf.update(
    task_track_started=True,
    task_time_limit=int(os.getenv("CELERY_TASK_TIMEOUT", "300")),
    accept_content=["json"],
    task_serializer="json",
    result_serializer="json",
)


@celery_app.task(name="estim.health_check")
def health_check() -> str:
    """Minimal task to verify worker <-> broker connectivity."""
    return "ok"
