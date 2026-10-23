"""Tests for JWT auth, password hashing, RBAC."""

import pytest
from fastapi.security import HTTPAuthorizationCredentials

from app.core import security
from app.core.exceptions import ForbiddenError, UnauthorizedError


class TestPasswords:
    def test_hash_and_verify(self):
        hashed = security.hash_password("s3cret-pw")
        assert hashed != "s3cret-pw"
        assert security.verify_password("s3cret-pw", hashed) is True
        assert security.verify_password("wrong", hashed) is False

    def test_hashes_are_salted(self):
        assert security.hash_password("same") != security.hash_password("same")


class TestTokens:
    def test_access_token_roundtrip(self):
        token = security.create_access_token("user-1", roles=["admin"])
        payload = security.decode_token(token)
        assert payload["sub"] == "user-1"
        assert payload["roles"] == ["admin"]
        assert payload["type"] == "access"

    def test_refresh_token_type(self):
        payload = security.decode_token(security.create_refresh_token("user-2"))
        assert payload["type"] == "refresh"

    def test_invalid_token_raises(self):
        with pytest.raises(UnauthorizedError):
            security.decode_token("not.a.token")


class TestCurrentUser:
    def _creds(self, token: str):
        return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    def test_get_current_user(self):
        token = security.create_access_token("u-9", roles=["procurement_officer"])
        user = security.get_current_user(self._creds(token))
        assert user.user_id == "u-9"
        assert user.has_role("procurement_officer") is True

    def test_missing_token_raises(self):
        with pytest.raises(UnauthorizedError):
            security.get_current_user(None)

    def test_refresh_token_rejected(self):
        with pytest.raises(UnauthorizedError):
            security.get_current_user(self._creds(security.create_refresh_token("u-9")))

    def test_require_roles_allows(self):
        token = security.create_access_token("u-1", roles=["procurement_manager"])
        user = security.get_current_user(self._creds(token))
        checker = security.require_roles("procurement_manager", "auditor")
        # checker is a FastAPI dependency: (user=...) -> CurrentUser
        assert checker(user=user).user_id == "u-1"

    def test_require_roles_denies(self):
        token = security.create_access_token("u-1", roles=["viewer"])
        user = security.get_current_user(self._creds(token))
        checker = security.require_roles("procurement_manager")
        with pytest.raises(ForbiddenError):
            checker(user=user)

    def test_optional_user_none(self):
        assert security.optional_user(None) is None
        assert security.optional_user(self._creds("bad")) is None
