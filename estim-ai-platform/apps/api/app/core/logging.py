"""Structured logging with correlation IDs and Logstash shipping.

Per docs/architecture/01-overview.md §10.2: JSON format with
timestamp, level, correlation_id. Context: user id, module,
action, duration. Respects settings.log_level / log_format.

When settings.logstash_host is set, JSON logs are also shipped
to Logstash over TCP for ELK aggregation.
"""

import json
import logging
import sys
import uuid
from contextvars import ContextVar
from datetime import UTC, datetime
from logging.handlers import SocketHandler
from typing import Any

from app.core.config import settings

correlation_id_var: ContextVar[str | None] = ContextVar("correlation_id", default=None)


def get_correlation_id() -> str:
    """Return the current correlation id, creating one if absent."""
    cid = correlation_id_var.get()
    if cid is None:
        cid = str(uuid.uuid4())
        correlation_id_var.set(cid)
    return cid


def set_correlation_id(correlation_id: str | None = None) -> str:
    """Set (or generate) the correlation id for this context."""
    cid = correlation_id or str(uuid.uuid4())
    correlation_id_var.set(cid)
    return cid


class EstimJsonFormatter(logging.Formatter):
    """JSON log formatter with correlation id and extra context."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "correlation_id": getattr(record, "correlation_id", correlation_id_var.get()),
        }
        for key in ("user_id", "module", "action", "duration_ms"):
            if hasattr(record, key):
                payload[key] = getattr(record, key)
        if record.exc_info and record.exc_info[0] is not None:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload)


class LogstashTCPSocketHandler(SocketHandler):
    """Sends JSON-encoded log records to Logstash over TCP.

    Uses SocketHandler's pickling transport but overrides makePickle
    to send JSON lines instead (Logstash tcp input with json codec).
    """

    def __init__(self, host: str, port: int):
        super().__init__(host, port)

    def makePickle(self, record: logging.LogRecord) -> bytes:
        """Encode the record as a JSON line for Logstash."""
        msg = self.format(record)
        return (msg + "\n").encode("utf-8")


_configured = False


def setup_logging(level: str | None = None) -> logging.Logger:
    """Configure root logging once; returns the platform logger."""
    global _configured
    log_level = (level or settings.log_level).upper()
    handler = logging.StreamHandler(sys.stdout)
    if (settings.log_format or "json").lower() == "json":
        handler.setFormatter(EstimJsonFormatter())
    else:
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s [%(name)s] %(message)s"))
    root = logging.getLogger()
    root.setLevel(getattr(logging, log_level, logging.INFO))
    if not _configured:
        root.handlers.clear()
        root.addHandler(handler)
        _configured = True

    # Ship JSON logs to Logstash when configured
    if settings.logstash_host:
        logstash_handler = LogstashTCPSocketHandler(settings.logstash_host, settings.logstash_port)
        logstash_handler.setFormatter(EstimJsonFormatter())
        root.addHandler(logstash_handler)

    return logging.getLogger("estim")


def get_logger(name: str) -> logging.LoggerAdapter:
    """Return a logger adapter that injects the correlation id."""
    return logging.LoggerAdapter(
        logging.getLogger(name),
        {"correlation_id": get_correlation_id()},
    )
