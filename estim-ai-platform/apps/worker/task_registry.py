"""Celery task registry (Phase 1 placeholder).

Phase 2+ will import domain event handlers here, e.g.:
    from app.modules.procurement.application.handlers import ...
    celery_app.autodiscover_tasks([...])
"""
from .celery_app import celery_app  # noqa: F401

registered_tasks = [
    "estim.health_check",
]
