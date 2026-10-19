"""API tests for identity routes (Phase 3.4 gate)."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app as fastapi_app


@pytest.fixture
def client():
    # Import models FIRST so tables exist in metadata
    import app.modules.identity.infrastructure.models  # noqa: F401

    # StaticPool: all threads must share the single :memory: connection,
    # otherwise TestClient's worker threads see their own empty database.
    engine = create_engine(
        "sqlite:///:memory:",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(engine, "connect")
    def _fk_on(dbapi_conn, conn_record):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    identity_tables = [
        t for t in Base.metadata.tables.values()
        if t.schema == "identity" or (
            t.schema is None and t.name in (
                "users", "roles", "permissions", "role_permissions",
                "user_roles",
            )
        )
    ]
    for table in identity_tables:
        table.schema = None
        table.create(bind=engine, checkfirst=True)

    def override_db():
        with Session(engine) as sess:
            yield sess

    fastapi_app.dependency_overrides[get_db] = override_db
    with TestClient(fastapi_app, raise_server_exceptions=False) as c:
        yield c
    fastapi_app.dependency_overrides.clear()


class TestAuthFlow:
    def test_register_login_me(self, client: TestClient):
        reg = client.post(
            "/auth/register",
            json={"email": "jane@estim.co.tz", "password": "Strong123", "full_name": "Jane"},
        )
        assert reg.status_code == 201, reg.text
        assert reg.json()["email"] == "jane@estim.co.tz"

        login = client.post(
            "/auth/login",
            json={"email": "jane@estim.co.tz", "password": "Strong123"},
        )
        assert login.status_code == 200, login.text
        access = login.json()["access_token"]
        refresh = login.json()["refresh_token"]

        me = client.get("/users/me", headers={"Authorization": f"Bearer {access}"})
        assert me.status_code == 200
        assert me.json()["email"] == "jane@estim.co.tz"

        refreshed = client.post("/auth/refresh", json={"refresh_token": refresh})
        assert refreshed.status_code == 200
        assert refreshed.json()["access_token"]

    def test_register_duplicate(self, client: TestClient):
        body = {"email": "dup@estim.co.tz", "password": "Strong123"}
        assert client.post("/auth/register", json=body).status_code == 201
        dup = client.post("/auth/register", json=body)
        assert dup.status_code == 409

    def test_login_wrong_password(self, client: TestClient):
        client.post("/auth/register", json={"email": "x@estim.co.tz", "password": "Strong123"})
        resp = client.post("/auth/login", json={"email": "x@estim.co.tz", "password": "Wrong1234"})
        assert resp.status_code == 401

    def test_me_unauthorized(self, client: TestClient):
        assert client.get("/users/me").status_code == 401

    def test_update_profile_and_password(self, client: TestClient):
        client.post(
            "/auth/register",
            json={"email": "bob@estim.co.tz", "password": "Strong123", "full_name": "Bob"},
        )
        login = client.post(
            "/auth/login", json={"email": "bob@estim.co.tz", "password": "Strong123"}
        )
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        upd = client.put("/users/me", json={"full_name": "Bobby"}, headers=headers)
        assert upd.status_code == 200
        assert upd.json()["full_name"] == "Bobby"
        pw = client.post(
            "/users/me/change-password",
            json={"old_password": "Strong123", "new_password": "Newpass123"},
            headers=headers,
        )
        assert pw.status_code == 204, pw.text
        relogin = client.post(
            "/auth/login", json={"email": "bob@estim.co.tz", "password": "Newpass123"}
        )
        assert relogin.status_code == 200
