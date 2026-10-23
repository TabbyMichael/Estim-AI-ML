"""Application tests for identity services (Phase 3.3 gate)."""

from unittest.mock import Mock

import pytest

from app.modules.identity.application.services import AuthService, UserService
from app.modules.identity.domain.entities import (
    User,
    ValidationError,
)


def _stored_user() -> User:
    from datetime import UTC, datetime

    now = datetime.now(UTC)
    return User(
        id="u-1",
        email="a@estim.co.tz",
        password_hash="HASHED",
        full_name="A",
        roles=["admin"],
        created_at=now,
        updated_at=now,
    )


class TestUserService:
    def test_register_hashes_and_saves(self):
        users = Mock()
        users.save.side_effect = lambda u: u
        hasher = Mock()
        hasher.hash.return_value = "HASHED"
        svc = UserService(users, hasher)
        user = svc.register("New@estim.co.tz", "Strong123", "New User", roles=["viewer"])
        assert user.email == "new@estim.co.tz"
        assert user.password_hash == "HASHED"
        hasher.hash.assert_called_once_with("Strong123")
        users.save.assert_called_once()

    def test_register_weak_password(self):
        with pytest.raises(ValidationError):
            UserService(Mock()).register("n@estim.co.tz", "weak", "N")

    def test_update_profile_and_roles(self):
        stored = _stored_user()
        users = Mock()
        users.get_by_id.return_value = stored
        users.save.side_effect = lambda u: u
        svc = UserService(users)
        updated = svc.update_profile("u-1", "  New Name ")
        assert updated.full_name == "New Name"
        svc.assign_role("u-1", "auditor")
        assert "auditor" in stored.roles
        svc.set_active("u-1", False)
        assert stored.is_active is False


class TestAuthService:
    def _svc(self, user: User | None = None):
        users = Mock()
        if user is None:
            from app.modules.identity.domain.entities import NotFoundError

            users.get_by_email.side_effect = NotFoundError("x")
            users.get_by_id.side_effect = NotFoundError("x")
        else:
            users.get_by_email.return_value = user
            users.get_by_id.return_value = user
            users.save.side_effect = lambda u: u
        hasher = Mock()
        hasher.verify.return_value = True
        tokens = Mock()
        tokens.create_access_token.return_value = "ACCESS"
        tokens.create_refresh_token.return_value = "REFRESH"
        return AuthService(users, hasher, tokens), users, hasher

    def test_login_success(self):
        svc, _, _ = self._svc(_stored_user())
        user, access, refresh = svc.login("a@estim.co.tz", "pw")
        assert (access, refresh) == ("ACCESS", "REFRESH")
        assert user.last_login_at is not None

    def test_login_unknown_user(self):
        svc, _, _ = self._svc(None)
        with pytest.raises(ValidationError):
            svc.login("no@here.tz", "pw")

    def test_login_wrong_password(self):
        svc, _, hasher = self._svc(_stored_user())
        hasher.verify.return_value = False
        with pytest.raises(ValidationError):
            svc.login("a@estim.co.tz", "bad")

    def test_login_deactivated(self):
        u = _stored_user()
        u.deactivate()
        svc, _, _ = self._svc(u)
        with pytest.raises(ValidationError):
            svc.login("a@estim.co.tz", "pw")

    def test_change_password(self):
        svc, _, hasher = self._svc(_stored_user())
        hasher.verify.return_value = True
        hasher.hash.return_value = "NEWHASH"
        updated = svc.change_password("u-1", "old", "Newpass123")
        assert updated.password_hash == "NEWHASH"

    def test_change_password_weak(self):
        svc, _, _ = self._svc(_stored_user())
        with pytest.raises(ValidationError):
            svc.change_password("u-1", "old", "weak")
