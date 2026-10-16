# mypy: ignore-errors
"""Audit middleware: records mutating HTTP requests to the audit log.

Failures are swallowed and logged — auditing must never break requests.
Registered in app.main via register_audit_middleware(app).
"""

import logging

from fastapi import FastAPI, Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.core import logging as estim_logging
from app.core.database import SessionLocal
from app.modules.audit.application.services import AuditService
from app.modules.audit.domain.rules import MUTATING_METHODS
from app.modules.audit.infrastructure.repository import (
    SqlAlchemyAuditRepository,
)

logger = logging.getLogger("estim.audit")


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):  # type: ignore[no-untyped-def]
        response = await call_next(request)
        if request.method in MUTATING_METHODS:
            try:
                db = SessionLocal()
                try:
                    service = AuditService(SqlAlchemyAuditRepository(db))
                    service.record_http(
                        method=request.method,
                        path=request.url.path,
                        status_code=response.status_code,
                        actor=request.headers.get("X-User-ID", "anonymous"),
                        ip_address=request.client.host if request.client else "",
                        user_agent=request.headers.get("User-Agent", ""),
                        correlation_id=estim_logging.get_correlation_id() or "",
                    )
                    db.commit()
                finally:
                    db.close()
            except Exception as exc:  # noqa: BLE001 - audit must not break
                logger.warning("audit write failed: %s", exc)
        return response


def register_audit_middleware(app: FastAPI) -> None:
    app.add_middleware(AuditMiddleware)
