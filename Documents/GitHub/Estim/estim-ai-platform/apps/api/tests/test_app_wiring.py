"""Tests for middleware, bootstrap container, and FastAPI app wiring."""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.bootstrap import Container, register_dependencies
from app.core.exceptions import BadRequestError
from app.core.middleware import (
    CORRELATION_HEADER,
    register_handlers,
    register_middleware,
)


def _mini_app() -> FastAPI:
    app = FastAPI()
    register_middleware(app)
    register_handlers(app)

    @app.get("/ok")
    def ok():
        return {"ok": True}

    @app.get("/boom-estim")
    def boom_estim():
        raise BadRequestError("bad input")

    @app.get("/boom-raw")
    def boom_raw():
        raise RuntimeError("unexpected")

    return app


class TestMiddleware:
    def test_correlation_id_generated_and_echoed(self):
        client = TestClient(_mini_app())
        resp = client.get("/ok")
        assert resp.status_code == 200
        assert CORRELATION_HEADER in resp.headers
        assert len(resp.headers[CORRELATION_HEADER]) > 0

    def test_correlation_id_propagated(self):
        client = TestClient(_mini_app())
        resp = client.get("/ok", headers={CORRELATION_HEADER: "abc-123"})
        assert resp.headers[CORRELATION_HEADER] == "abc-123"

    def test_estim_exception_mapped(self):
        client = TestClient(_mini_app(), raise_server_exceptions=False)
        resp = client.get("/boom-estim")
        assert resp.status_code == 400
        assert resp.json()["error_code"] == "BAD_REQUEST"

    def test_unhandled_mapped_to_500(self):
        client = TestClient(_mini_app(), raise_server_exceptions=False)
        resp = client.get("/boom-raw")
        assert resp.status_code == 500
        assert resp.json()["error_code"] == "INTERNAL_ERROR"


class TestContainer:
    def test_register_and_resolve_instance(self):
        c = Container()
        c.register("x", 42)
        assert c.resolve("x") == 42
        assert c.has("x") is True

    def test_register_factory(self):
        c = Container()
        c.register_factory("y", lambda: [1, 2])
        assert c.resolve("y") == [1, 2]

    def test_missing_raises(self):
        import pytest

        c = Container()
        with pytest.raises(KeyError):
            c.resolve("nope")

    def test_register_dependencies(self):
        c = register_dependencies(Container())
        assert c.has("settings") is True


class TestMainApp:
    def test_health_and_root(self):
        from app.main import app

        client = TestClient(app)
        health = client.get("/health")
        assert health.status_code == 200
        assert health.json()["status"] == "ok"
        root = client.get("/")
        assert root.status_code == 200
        assert root.json()["docs"] == "/docs"

    def test_openapi_has_platform_tag(self):
        from app.main import app

        client = TestClient(app)
        spec = client.get("/openapi.json").json()
        assert "/health" in spec["paths"]
        assert spec["info"]["title"] == "Estim AI Platform"
