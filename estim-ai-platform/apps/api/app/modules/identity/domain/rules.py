"""Business rules for the identity module.

Pure functions, no side effects. Password policy enforced here;
hashing itself lives in app.core.security.
"""

import re

from app.modules.identity.domain.entities import User

MIN_PASSWORD_LENGTH = 8
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def validate_email(email: str) -> bool:
    """Check email has a plausible shape."""
    return bool(EMAIL_RE.match(email.strip()))


def validate_password(password: str) -> tuple[bool, str]:
    """Enforce password policy. Returns (ok, reason)."""
    if len(password) < MIN_PASSWORD_LENGTH:
        return False, f"Password must be at least {MIN_PASSWORD_LENGTH} characters."
    if len(password.encode("utf-8")) > 72:
        return False, "Password cannot exceed 72 bytes (bcrypt limit)."
    if not re.search(r"[A-Za-z]", password):
        return False, "Password must contain a letter."
    if not re.search(r"[0-9]", password):
        return False, "Password must contain a digit."
    return True, ""


def can_register(email: str, password: str, existing_emails: list[str]) -> tuple[bool, str]:
    """Check whether a new account may be created."""
    if not validate_email(email):
        raise ValueError("Invalid email address.")
    ok, reason = validate_password(password)
    if not ok:
        return False, reason
    if email.strip().lower() in {e.strip().lower() for e in existing_emails}:
        return False, "Email already registered."
    return True, ""


def user_has_permission(
    user: User, permission_code: str, role_permissions: dict[str, list[str]]
) -> bool:
    """Resolve effective permissions via the user's roles."""
    wanted = permission_code.strip().lower()
    for role_name in user.roles:
        if wanted in role_permissions.get(role_name.strip().lower(), []):
            return True
    return False


def can_access_project(user: User, project_id: str, project_members: dict[str, list[str]]) -> bool:
    """Project-level gate: admins bypass, others need membership."""
    if "admin" in user.roles:
        return True
    return user.id in project_members.get(project_id, [])
