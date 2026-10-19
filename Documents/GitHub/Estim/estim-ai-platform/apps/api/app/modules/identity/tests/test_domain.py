"""Domain tests for the identity module (Phase 3.1 gate)."""

import pytest

from app.modules.identity.domain import rules
from app.modules.identity.domain.entities import (
    InvalidStateError,
    Permission,
    Role,
    User,
)


def _user(**kwargs) -> User:
    base = {"id": "u-1", "email": "a@estim.co.tz", "password_hash": "hashed"}
    base.update(kwargs)
    return User(**base)


class TestUser:
    def test_create_and_normalize_email(self):
        assert _user(email="A@Estim.CO.TZ").email == "a@estim.co.tz"

    def test_requires_valid_email(self):
        with pytest.raises(ValueError):
            _user(email="not-an-email")

    def test_requires_password_hash(self):
        with pytest.raises(ValueError):
            _user(password_hash="")

    def test_role_assignment_idempotent(self):
        u = _user()
        u.assign_role("Procurement_Manager")
        u.assign_role("procurement_manager")
        assert u.roles == ["procurement_manager"]
        assert u.has_role("procurement_manager") is True
        u.remove_role("procurement_manager")
        assert u.has_role("procurement_manager") is False

    def test_deactivate_reactivate(self):
        u = _user()
        u.deactivate()
        assert u.is_active is False
        with pytest.raises(InvalidStateError):
            u.record_login()
        u.reactivate()
        u.record_login()
        assert u.last_login_at is not None


class TestRolePermission:
    def test_grant_revoke(self):
        r = Role(name="Auditor")
        r.grant("procurement:review")
        r.grant("procurement:review")
        assert r.permissions == ["procurement:review"]
        assert r.has_permission("procurement:review") is True
        r.revoke("procurement:review")
        assert r.has_permission("procurement:review") is False

    def test_permission_code_normalized(self):
        assert Permission(code=" Procurement:Approve ").code == "procurement:approve"


class TestRules:
    def test_password_policy(self):
        ok, _ = rules.validate_password("Strong123")
        assert ok is True
        assert rules.validate_password("short1")[0] is False
        assert rules.validate_password("nodigits!")[0] is False
        assert rules.validate_password("12345678")[0] is False

    def test_can_register(self):
        ok, _ = rules.can_register("new@estim.co.tz", "Strong123", ["a@estim.co.tz"])
        assert ok is True
        ok, reason = rules.can_register("a@estim.co.tz", "Strong123", ["a@estim.co.tz"])
        assert ok is False and "already" in reason
        with pytest.raises(ValueError):
            rules.can_register("bad", "Strong123", [])

    def test_user_has_permission(self):
        u = _user(roles=["procurement_manager"])
        rp = {"procurement_manager": ["procurement:approve"]}
        assert rules.user_has_permission(u, "procurement:approve", rp) is True
        assert rules.user_has_permission(u, "inventory:write", rp) is False

    def test_can_access_project(self):
        admin = _user(roles=["admin"])
        assert rules.can_access_project(admin, "p-9", {}) is True
        member = _user(id="u-2")
        assert rules.can_access_project(member, "p-1", {"p-1": ["u-2"]}) is True
        assert rules.can_access_project(member, "p-1", {"p-1": ["u-3"]}) is False
