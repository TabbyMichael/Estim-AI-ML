"""HTTP middleware: correlation IDs, request logging, error mapping.

- CorrelationIdMiddleware: reuses incoming X-Correlation-ID or generates one,
  stores it in the context var, echoes it back on the response.
- RequestLoggingMiddleware: logs method/path/status/duration with correlation.
- EstimException handler + catch-all 500 handler registered via register_handlers.
"""

import time
import uuid
from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core import logging as estim_logging
from app.core.exceptions import EstimException
from app.core.metrics import HTTP_REQUEST_DURATION_SECONDS, HTTP_REQUESTS_TOTAL

CORRELATION_HEADER = "X-Correlation-ID"


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        cid = request.headers.get(CORRELATION_HEADER) or str(uuid.uuid4())
        estim_logging.set_correlation_id(cid)
        response = await call_next(request)
        response.headers[CORRELATION_HEADER] = cid
        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        logger = estim_logging.get_logger("estim.http")
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        logger.info(
            "%s %s -> %s (%.2fms)",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            extra={"action": "http_request", "duration_ms": duration_ms},
        )
        # Record Prometheus metrics
        endpoint = request.url.path
        HTTP_REQUESTS_TOTAL.labels(
            method=request.method,
            endpoint=endpoint,
            status_code=response.status_code,
        ).inc()
        HTTP_REQUEST_DURATION_SECONDS.labels(
            method=request.method,
            endpoint=endpoint,
        ).observe(time.perf_counter() - start)
        return response


async def _estim_exception_handler(request: Request, exc: EstimException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content=exc.to_dict())


async def _unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger = estim_logging.get_logger("estim.errors")
    logger.exception("Unhandled error: %s", exc)
    return JSONResponse(
        status_code=500,
        content={
            "error_code": "INTERNAL_ERROR",
            "message": "An unexpected error occurred.",
            "details": {},
        },
    )


def register_middleware(app: FastAPI) -> None:
    app.add_middleware(CorrelationIdMiddleware)
    app.add_middleware(RequestLoggingMiddleware)


def register_handlers(app: FastAPI) -> None:
    app.add_exception_handler(EstimException, _estim_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, _unhandled_exception_handler)
