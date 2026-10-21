"""Application services for the identity module.

UserService: registration, profile updates, activation.
AuthService: credential verification + JWT issuance/refresh.
"""

import uuid
from datetime import UTC, datetime

from app.core import security
from app.modules.identity.application.ports import (
    PasswordHasher,
    RoleRepository,
    TokenIssuer,
    UserRepository,
)
from app.modules.identity.domain import rules
from app.modules.identity.domain.entities import (
    DuplicateUserError,
    NotFoundError,
    Role,
    User,
    ValidationError,
)


class BcryptHasher:
    def hash(self, password: str) -> str:
        return security.hash_password(password)

    def verify(self, plain: str, hashed: str) -> bool:
        return security.verify_password(plain, hashed)


class JwtIssuer:
    def create_access_token(self, subject: str, roles: list[str]) -> str:
        return security.create_access_token(subject, roles=roles)

    def create_refresh_token(self, subject: str) -> str:
        return security.create_refresh_token(subject)


class UserService:
    def __init__(self, users: UserRepository, hasher: PasswordHasher | None = None) -> None:
        self.users = users
        self.hasher = hasher or BcryptHasher()

    def register(
        self, email: str, password: str, full_name: str = "", roles: list[str] | None = None
    ) -> User:
        ok, reason = rules.can_register(email, password, self._all_emails())
        if not ok:
            if "already" in reason:
                raise DuplicateUserError(reason)
            raise ValidationError(reason)
        now = datetime.now(UTC)
        user = User(
            id=str(uuid.uuid4()),
            email=email.strip().lower(),
            password_hash=self.hasher.hash(password),
            full_name=full_name.strip(),
            roles=list(roles or []),
            created_at=now,
            updated_at=now,
        )
        return self.users.save(user)

    def update_profile(self, user_id: str, full_name: str) -> User:
        user = self.users.get_by_id(user_id)
        user.full_name = full_name.strip()
        user.updated_at = datetime.now(UTC)
        return self.users.save(user)

    def set_active(self, user_id: str, active: bool) -> User:
        user = self.users.get_by_id(user_id)
        if active:
            user.reactivate()
        else:
            user.deactivate()
        return self.users.save(user)

    def assign_role(self, user_id: str, role_name: str) -> User:
        user = self.users.get_by_id(user_id)
        user.assign_role(role_name)
        return self.users.save(user)

    def remove_role(self, user_id: str, role_name: str) -> User:
        user = self.users.get_by_id(user_id)
        user.remove_role(role_name)
        return self.users.save(user)

    def admin_update(
        self,
        user_id: str,
        full_name: str | None = None,
        roles: list[str] | None = None,
        is_active: bool | None = None,
    ) -> User:
        user = self.users.get_by_id(user_id)
        if full_name is not None:
            user.full_name = full_name.strip()
            user.updated_at = datetime.now(UTC)
        if roles is not None:
            user.roles = [r.strip().lower() for r in roles if r.strip()]
            user.updated_at = datetime.now(UTC)
        if is_active is not None:
            if is_active:
                user.reactivate()
            else:
                user.deactivate()
        return self.users.save(user)

    def list_users(
        self,
        skip: int = 0,
        limit: int = 50,
        query: str | None = None,
        is_active: bool | None = None,
    ) -> tuple[list[User], int]:
        return self.users.list_users(skip=skip, limit=limit, query=query, is_active=is_active)

    def _all_emails(self) -> list[str]:
        # Repository port has no list-all; existence checked via save guard.
        # can_register duplicate check uses empty list here; the repository
        # raises DuplicateUserError on conflicting save as backstop.
        return []


class AuthService:
    def __init__(
        self,
        users: UserRepository,
        hasher: PasswordHasher | None = None,
        tokens: TokenIssuer | None = None,
    ) -> None:
        self.users = users
        self.hasher = hasher or BcryptHasher()
        self.tokens = tokens or JwtIssuer()

    def login(self, email: str, password: str) -> tuple[User, str, str]:
        try:
            user = self.users.get_by_email(email.strip().lower())
        except NotFoundError:
            raise ValidationError("Invalid email or password.") from None
        if not user.is_active:
            raise ValidationError("Account is deactivated.")
        if not self.hasher.verify(password, user.password_hash):
            raise ValidationError("Invalid email or password.")
        user.record_login()
        self.users.save(user)
        access = self.tokens.create_access_token(user.id, user.roles)
        refresh = self.tokens.create_refresh_token(user.id)
        return user, access, refresh

    def refresh(self, refresh_token: str) -> tuple[User, str]:
        payload = security.decode_token(refresh_token)
        if payload.get("type") != "refresh" or not payload.get("sub"):
            raise ValidationError("Invalid refresh token.")
        user = self.users.get_by_id(payload["sub"])
        if not user.is_active:
            raise ValidationError("Account is deactivated.")
        return user, self.tokens.create_access_token(user.id, user.roles)

    def change_password(self, user_id: str, old_password: str, new_password: str) -> User:
        user = self.users.get_by_id(user_id)
        if not self.hasher.verify(old_password, user.password_hash):
            raise ValidationError("Current password is incorrect.")
        ok, reason = rules.validate_password(new_password)
        if not ok:
            raise ValidationError(reason)
        user.password_hash = self.hasher.hash(new_password)
        user.updated_at = datetime.now(UTC)
        return self.users.save(user)


class RoleService:
    def __init__(self, roles: RoleRepository) -> None:
        self.roles = roles

    def list_roles(self) -> list[Role]:
        return self.roles.list_roles()

    def create_role(
        self, name: str, description: str = "", permissions: list[str] | None = None
    ) -> Role:
        role = Role(name=name, description=description, permissions=list(permissions or []))
        return self.roles.save(role)

    def grant(self, role_name: str, permission_code: str) -> Role:
        role = self.roles.get_by_name(role_name)
        role.grant(permission_code)
        return self.roles.save(role)

    def revoke(self, role_name: str, permission_code: str) -> Role:
        role = self.roles.get_by_name(role_name)
        role.revoke(permission_code)
        return self.roles.save(role)
