"""JWT authentication and password hashing (Phase 2.1/2.3 core).

Uses python-jose + passlib[bcrypt] per setup.py. Provides:
- hash_password / verify_password (bcrypt)
- create_access_token / create_refresh_token
- decode_token (validates signature + expiry)
- get_current_user dependency + require_roles() RBAC factory
"""

from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import settings
from app.core.exceptions import ForbiddenError, UnauthorizedError

bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt (direct, no passlib)."""
    pw_bytes = password.encode("utf-8")
    if len(pw_bytes) > 72:
        raise ValueError("Password cannot be longer than 72 bytes.")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against its bcrypt hash."""
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def _encode(payload: dict[str, Any], expires: timedelta) -> str:
    now = datetime.now(UTC)
    to_encode = {**payload, "iat": now, "exp": now + expires}
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(
    subject: str,
    roles: list[str] | None = None,
    extra: dict[str, Any] | None = None,
) -> str:
    """Create a short-lived access token."""
    payload: dict[str, Any] = {"sub": subject, "type": "access"}
    if roles:
        payload["roles"] = roles
    if extra:
        payload.update(extra)
    return _encode(payload, timedelta(minutes=settings.jwt_expire_minutes))


def create_refresh_token(subject: str) -> str:
    """Create a long-lived refresh token."""
    return _encode(
        {"sub": subject, "type": "refresh"},
        timedelta(days=settings.jwt_refresh_expire_days),
    )


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT; raises UnauthorizedError on failure."""
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise UnauthorizedError(f"Invalid token: {exc}") from exc


class CurrentUser:
    """Authenticated principal extracted from a JWT."""

    def __init__(self, user_id: str, roles: list[str], raw: dict[str, Any]) -> None:
        self.user_id = user_id
        self.roles = roles
        self.raw = raw

    def has_role(self, role: str) -> bool:
        return role in self.roles


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> CurrentUser:
    """FastAPI dependency: bearer token -> CurrentUser (access tokens only)."""
    if credentials is None or not credentials.credentials:
        raise UnauthorizedError("Missing bearer token.")
    payload = decode_token(credentials.credentials)
    if payload.get("type") != "access":
        raise UnauthorizedError("Refresh tokens cannot access the API.")
    subject = payload.get("sub")
    if not subject:
        raise UnauthorizedError("Token has no subject.")
    roles = payload.get("roles", [])
    return CurrentUser(user_id=subject, roles=roles, raw=payload)


def require_roles(*allowed: str):
    """Dependency factory enforcing RBAC roles (Phase 2.3)."""

    def _check(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if not any(user.has_role(role) for role in allowed):
            raise ForbiddenError(
                f"Requires one of roles: {', '.join(allowed)}.",
                details={"required": list(allowed), "actual": user.roles},
            )
        return user

    return _check


def optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> CurrentUser | None:
    """Like get_current_user but returns None instead of 401."""
    if credentials is None or not credentials.credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
    except UnauthorizedError:
        return None
    if payload.get("type") != "access" or not payload.get("sub"):
        return None
    return CurrentUser(user_id=payload["sub"], roles=payload.get("roles", []), raw=payload)


# Re-export HTTPException aliases for backwards compat in routers
http_401 = lambda detail="Unauthorized": HTTPException(  # noqa: E731
    status_code=status.HTTP_401_UNAUTHORIZED, detail=detail
)
