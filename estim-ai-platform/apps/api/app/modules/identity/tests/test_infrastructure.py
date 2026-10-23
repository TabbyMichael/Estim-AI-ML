"""Infrastructure tests for identity repositories (Phase 3.2 gate).

SQLite-backed: verifies entity<->model mapping and repository
round-trips. Schema-qualified table names are stripped for SQLite
compat since SQLite has no schemas.
"""

import uuid
from collections.abc import Iterator
from datetime import UTC, datetime

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session

from app.core.database import Base
from app.modules.identity.domain.entities import Permission, Role, User
from app.modules.identity.infrastructure import mappers
from app.modules.identity.infrastructure.repository import (
    SqlAlchemyPermissionRepository,
    SqlAlchemyRoleRepository,
    SqlAlchemyUserRepository,
)


@pytest.fixture
def session() -> Iterator[Session]:
    engine = create_engine("sqlite:///:memory:")

    @event.listens_for(engine, "connect")
    def _fk_on(dbapi_conn, conn_record):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    # SQLite has no schemas: drop the schema qualifier for OUR tables
    # only and create just those (global metadata also holds other
    # modules' schema-qualified tables SQLite rejects).
    for table in Base.metadata.tables.values():
        if table.schema == "identity" or (
            table.schema is None
            and table.name
            in (
                "users",
                "roles",
                "permissions",
                "role_permissions",
                "user_roles",
            )
        ):
            table.schema = None
            table.create(bind=engine, checkfirst=True)
    with Session(engine) as sess:
        yield sess


def _user() -> User:
    now = datetime.now(UTC)
    return User(
        id=str(uuid.uuid4()),
        email="Test@Estim.co.tz",
        password_hash="hashed-pw",
        full_name="Test User",
        roles=["admin"],
        created_at=now,
        updated_at=now,
    )


class TestMappers:
    def test_user_roundtrip(self):
        user = _user()
        model, links = mappers.user_to_model(user)
        assert model.email == "test@estim.co.tz"
        assert [link.role_name for link in links] == ["admin"]
        back = mappers.model_to_user(model, ["admin"])
        assert back.email == user.email
        assert back.roles == ["admin"]

    def test_role_roundtrip(self):
        role = Role(name="Manager", permissions=["a:b"])
        model, codes = mappers.role_to_model(role)
        assert model.name == "manager"
        assert mappers.model_to_role(model, codes).permissions == ["a:b"]

    def test_permission_roundtrip(self):
        perm = Permission(code="X:Y")
        assert mappers.model_to_permission(mappers.permission_to_model(perm)).code == "x:y"


class TestUserRepository:
    def test_save_and_get_by_email(self, session: Session):
        SqlAlchemyRoleRepository(session).save(Role(name="admin", permissions=[]))
        repo = SqlAlchemyUserRepository(session)
        saved = repo.save(_user())
        assert saved.roles == ["admin"]
        fetched = repo.get_by_email("test@estim.co.tz")
        assert fetched.id == saved.id
        assert repo.exists_by_email("TEST@estim.co.tz") is True

    def test_get_missing_raises(self, session: Session):
        from app.modules.identity.domain.entities import NotFoundError

        with pytest.raises(NotFoundError):
            SqlAlchemyUserRepository(session).get_by_email("no@here.tz")


class TestRoleRepository:
    def test_save_and_list(self, session: Session):
        repo = SqlAlchemyRoleRepository(session)
        repo.save(Role(name="auditor", permissions=["procurement:review"]))
        fetched = repo.get_by_name("AUDITOR")
        assert fetched.permissions == ["procurement:review"]
        assert len(repo.list_roles()) == 1


class TestPermissionRepository:
    def test_save_and_list(self, session: Session):
        repo = SqlAlchemyPermissionRepository(session)
        repo.save(Permission(code="docs:read", description="Read docs"))
        codes = [p.code for p in repo.list_permissions()]
        assert "docs:read" in codes
