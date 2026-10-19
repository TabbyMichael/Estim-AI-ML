"""Entity <-> model mappers for the identity module."""

import uuid
from datetime import UTC

from app.modules.identity.domain.entities import Permission, Role, User
from app.modules.identity.infrastructure.models import (
    PermissionModel,
    RoleModel,
    UserModel,
    UserRoleModel,
)


def user_to_model(user: User) -> tuple[UserModel, list[UserRoleModel]]:
    model = UserModel(
        id=uuid.UUID(user.id),
        email=user.email,
        password_hash=user.password_hash,
        full_name=user.full_name,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at,
        last_login_at=user.last_login_at,
    )
    links = [UserRoleModel(user_id=model.id, role_name=r) for r in user.roles]
    return model, links


def model_to_user(model: UserModel, role_names: list[str]) -> User:
    return User(
        id=str(model.id),
        email=model.email,
        password_hash=model.password_hash,
        full_name=model.full_name,
        is_active=model.is_active,
        roles=list(role_names),
        created_at=model.created_at.replace(tzinfo=model.created_at.tzinfo or UTC),
        updated_at=model.updated_at.replace(tzinfo=model.updated_at.tzinfo or UTC),
        last_login_at=model.last_login_at,
    )


def role_to_model(role: Role) -> tuple[RoleModel, list[str]]:
    return RoleModel(name=role.name, description=role.description), list(role.permissions)


def model_to_role(model: RoleModel, permission_codes: list[str]) -> Role:
    return Role(name=model.name, permissions=list(permission_codes), description=model.description)


def permission_to_model(permission: Permission) -> PermissionModel:
    return PermissionModel(code=permission.code, description=permission.description)


def model_to_permission(model: PermissionModel) -> Permission:
    return Permission(code=model.code, description=model.description)
