"""Domain entities for the identity module.

Pure Python dataclasses with no framework dependencies:
- User: system account with bcrypt password hash + active flag
- Role: named collection of permissions
- Permission: atomic action grant (e.g. procurement:approve)

State transitions live on the entities; cross-entity policies live
in rules.py.
"""

from dataclasses import dataclass, field
from datetime import UTC, datetime


@dataclass
class Permission:
    """Atomic grant: action allowed on a resource scope."""

    code: str  # e.g. "procurement:approve", "inventory:read"
    description: str = ""

    def __post_init__(self) -> None:
        if not self.code or not self.code.strip():
            raise ValueError("Permission code is required.")
        self.code = self.code.strip().lower()


@dataclass
class Role:
    """Named bundle of permissions."""

    name: str  # e.g. "procurement_manager"
    permissions: list[str] = field(default_factory=list)
    description: str = ""

    def __post_init__(self) -> None:
        if not self.name or not self.name.strip():
            raise ValueError("Role name is required.")
        self.name = self.name.strip().lower()

    def grant(self, permission_code: str) -> None:
        code = permission_code.strip().lower()
        if code not in self.permissions:
            self.permissions.append(code)

    def revoke(self, permission_code: str) -> None:
        code = permission_code.strip().lower()
        if code in self.permissions:
            self.permissions.remove(code)

    def has_permission(self, permission_code: str) -> bool:
        return permission_code.strip().lower() in self.permissions


@dataclass
class User:
    """System account. Password stored as bcrypt hash only."""

    id: str
    email: str
    password_hash: str
    full_name: str = ""
    is_active: bool = True
    roles: list[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    last_login_at: datetime | None = None

    def __post_init__(self) -> None:
        if not self.id:
            raise ValueError("User ID is required.")
        if not self.email or "@" not in self.email:
            raise ValueError("Valid email is required.")
        if not self.password_hash:
            raise ValueError("Password hash is required.")
        self.email = self.email.strip().lower()

    def assign_role(self, role_name: str) -> None:
        role = role_name.strip().lower()
        if role not in self.roles:
            self.roles.append(role)
            self.updated_at = datetime.now(UTC)

    def remove_role(self, role_name: str) -> None:
        role = role_name.strip().lower()
        if role in self.roles:
            self.roles.remove(role)
            self.updated_at = datetime.now(UTC)

    def has_role(self, role_name: str) -> bool:
        return role_name.strip().lower() in self.roles

    def deactivate(self) -> None:
        self.is_active = False
        self.updated_at = datetime.now(UTC)

    def reactivate(self) -> None:
        self.is_active = True
        self.updated_at = datetime.now(UTC)

    def record_login(self) -> None:
        if not self.is_active:
            raise InvalidStateError("Deactivated users cannot log in.")
        self.last_login_at = datetime.now(UTC)


class InvalidStateError(Exception):
    """Raised when an operation is invalid for the current state."""


class EntityValidationError(Exception):
    """Raised when entity field validation fails."""


# Alias kept for application-layer ergonomics
ValidationError = EntityValidationError


class DuplicateUserError(Exception):
    """Raised when registering an already-used email."""


class NotFoundError(Exception):
    """Raised when an entity is not found."""
