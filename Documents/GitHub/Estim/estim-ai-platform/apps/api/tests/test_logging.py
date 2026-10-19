"""Tests for structured logging with correlation IDs."""

import json
import logging
import sys
from unittest.mock import MagicMock, patch

from app.core import logging as estim_logging

from app.core.logging import EstimJsonFormatter, LogstashTCPSocketHandler, setup_logging


class TestCorrelationId:
    def test_generates_when_absent(self):
        estim_logging.correlation_id_var.set(None)
        cid = estim_logging.get_correlation_id()
        assert isinstance(cid, str) and len(cid) > 0

    def test_set_and_get_roundtrip(self):
        estim_logging.set_correlation_id("test-123")
        assert estim_logging.get_correlation_id() == "test-123"
        estim_logging.correlation_id_var.set(None)

    def test_set_generates_when_no_arg(self):
        estim_logging.correlation_id_var.set(None)
        cid = estim_logging.set_correlation_id()
        assert cid == estim_logging.get_correlation_id()


class TestJsonFormatter:
    def test_format_includes_required_fields(self):
        formatter = estim_logging.EstimJsonFormatter()
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname=__file__,
            lineno=1,
            msg="hello",
            args=(),
            exc_info=None,
        )
        record.correlation_id = "cid-1"
        payload = json.loads(formatter.format(record))
        assert payload["message"] == "hello"
        assert payload["level"] == "INFO"
        assert payload["correlation_id"] == "cid-1"
        assert "timestamp" in payload

    def test_format_includes_extra_context(self):
        formatter = estim_logging.EstimJsonFormatter()
        record = logging.LogRecord(
            name="test",
            level=logging.WARNING,
            pathname=__file__,
            lineno=1,
            msg="slow",
            args=(),
            exc_info=None,
        )
        record.correlation_id = "cid-2"
        record.user_id = "u-1"
        record.module = "procurement"
        record.action = "approve"
        record.duration_ms = 12
        payload = json.loads(formatter.format(record))
        assert payload["user_id"] == "u-1"
        assert payload["module"] == "procurement"
        assert payload["action"] == "approve"
        assert payload["duration_ms"] == 12


class TestSetupLogging:
    def test_returns_estim_logger(self):
        logger = estim_logging.setup_logging(level="INFO")
        assert logger.name == "estim"

    def test_get_logger_adapter(self):
        estim_logging.set_correlation_id("adapter-cid")
        adapter = estim_logging.get_logger("test.module")
        assert adapter.extra["correlation_id"] == "adapter-cid"


class TestLogstashTCPSocketHandler:
    def test_make_pickle_returns_json_line(self):
        handler = LogstashTCPSocketHandler("localhost", 5000)
        formatter = EstimJsonFormatter()
        handler.setFormatter(formatter)
        record = logging.LogRecord(
            name="estim.test",
            level=logging.INFO,
            pathname="",
            lineno=0,
            msg="logstash test message",
            args=(),
            exc_info=None,
        )
        record.correlation_id = "test-cid"
        result = handler.makePickle(record)
        assert result.endswith(b"\n")
        payload = json.loads(result.decode("utf-8").strip())
        assert payload["message"] == "logstash test message"
        assert payload["correlation_id"] == "test-cid"

    def test_make_pickle_with_exception(self):
        handler = LogstashTCPSocketHandler("localhost", 5000)
        formatter = EstimJsonFormatter()
        handler.setFormatter(formatter)
        try:
            raise RuntimeError("test error")
        except RuntimeError:
            record = logging.LogRecord(
                name="estim.errors",
                level=logging.ERROR,
                pathname="",
                lineno=0,
                msg="error occurred",
                args=(),
                exc_info=sys.exc_info(),
            )
        result = handler.makePickle(record)
        payload = json.loads(result.decode("utf-8").strip())
        assert "exception" in payload
        assert "RuntimeError" in payload["exception"]
        assert "test error" in payload["exception"]

    @patch("socket.create_connection")
    def test_connect_uses_configured_host_port(self, mock_create_connection):
        mock_socket = MagicMock()
        mock_create_connection.return_value = mock_socket
        handler = LogstashTCPSocketHandler("logstash.example.com", 9999)
        # SocketHandler stores host/port; verify they're set correctly
        assert handler.host == "logstash.example.com"
        assert handler.port == 9999


class TestSetupLoggingWithLogstash:
    def test_setup_logging_without_logstash_host(self):
        root = logging.getLogger()
        root.handlers.clear()
        with patch("app.core.config.settings.logstash_host", ""):
            setup_logging(level="INFO")
        socket_handlers = [h for h in root.handlers if isinstance(h, LogstashTCPSocketHandler)]
        assert len(socket_handlers) == 0

    @patch("app.core.config.settings.logstash_host", "logstash")
    @patch("app.core.config.settings.logstash_port", 5000)
    @patch("app.core.logging.LogstashTCPSocketHandler")
    def test_setup_logging_with_logstash_host_adds_handler(self, mock_handler_class):
        root = logging.getLogger()
        root.handlers.clear()
        mock_handler_instance = MagicMock()
        mock_handler_class.return_value = mock_handler_instance
        with patch.object(root, "addHandler") as mock_add_handler:
            setup_logging(level="INFO")
        mock_handler_class.assert_called_once_with("logstash", 5000)
        mock_handler_instance.setFormatter.assert_called_once()
        mock_add_handler.assert_called_with(mock_handler_instance)
