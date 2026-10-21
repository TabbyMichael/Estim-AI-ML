"""SQLAlchemy repository implementations for the identity module."""

import uuid

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.modules.identity.domain.entities import (
    DuplicateUserError,
    NotFoundError,
    Permission,
    Role,
    User,
)
from app.modules.identity.infrastructure import mappers
from app.modules.identity.infrastructure.models import (
    PermissionModel,
    RoleModel,
    RolePermissionModel,
    UserModel,
    UserRoleModel,
)


class SqlAlchemyUserRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_id(self, user_id: str) -> User:
        model = self.session.get(UserModel, uuid.UUID(user_id))
        if model is None:
            raise NotFoundError(f"User {user_id} not found.")
        return mappers.model_to_user(model, self._role_names(model.id))

    def get_by_email(self, email: str) -> User:
        stmt = select(UserModel).where(UserModel.email == email.strip().lower())
        model = self.session.execute(stmt).scalar_one_or_none()
        if model is None:
            raise NotFoundError(f"User {email} not found.")
        return mappers.model_to_user(model, self._role_names(model.id))

    def exists_by_email(self, email: str) -> bool:
        stmt = select(UserModel.id).where(UserModel.email == email.strip().lower())
        return self.session.execute(stmt).scalar_one_or_none() is not None

    def save(self, user: User) -> User:
        if self.exists_by_email(user.email):
            existing = self.session.get(UserModel, uuid.UUID(user.id))
            if existing is None or existing.email != user.email:
                raise DuplicateUserError(f"Email {user.email} already registered.")
        model, links = mappers.user_to_model(user)
        merged = self.session.merge(model)
        self.session.execute(delete(UserRoleModel).where(UserRoleModel.user_id == merged.id))
        for link in links:
            link.user_id = merged.id
            self.session.add(link)
        self.session.flush()
        return mappers.model_to_user(merged, [link.role_name for link in links])

    def _role_names(self, user_id: uuid.UUID) -> list[str]:
        stmt = select(UserRoleModel.role_name).where(UserRoleModel.user_id == user_id)
        return list(self.session.execute(stmt).scalars().all())

    def list_users(
        self,
        skip: int = 0,
        limit: int = 50,
        query: str | None = None,
        is_active: bool | None = None,
    ) -> tuple[list[User], int]:
        stmt = select(UserModel)
        count_stmt = select(func.count(UserModel.id))
        if query:
            like = f"%{query.strip().lower()}%"
            stmt = stmt.where((UserModel.email.ilike(like)) | (UserModel.full_name.ilike(like)))
            count_stmt = count_stmt.where(
                (UserModel.email.ilike(like)) | (UserModel.full_name.ilike(like))
            )
        if is_active is not None:
            stmt = stmt.where(UserModel.is_active == is_active)
            count_stmt = count_stmt.where(UserModel.is_active == is_active)
        total = self.session.execute(count_stmt).scalar_one()
        stmt = stmt.order_by(UserModel.created_at.desc()).offset(skip).limit(limit)
        models = list(self.session.execute(stmt).scalars().all())
        return (
            [mappers.model_to_user(m, self._role_names(m.id)) for m in models],
            total,
        )


class SqlAlchemyRoleRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_name(self, name: str) -> Role:
        model = self.session.get(RoleModel, name.strip().lower())
        if model is None:
            raise NotFoundError(f"Role {name} not found.")
        stmt = select(RolePermissionModel.permission_code).where(
            RolePermissionModel.role_name == model.name
        )
        codes = list(self.session.execute(stmt).scalars().all())
        return mappers.model_to_role(model, codes)

    def save(self, role: Role) -> Role:
        model, codes = mappers.role_to_model(role)
        merged = self.session.merge(model)
        self.session.execute(
            delete(RolePermissionModel).where(RolePermissionModel.role_name == merged.name)
        )
        for code in codes:
            self._ensure_permission(code)
            self.session.add(RolePermissionModel(role_name=merged.name, permission_code=code))
        self.session.flush()
        return mappers.model_to_role(merged, codes)

    def list_roles(self) -> list[Role]:
        models = self.session.execute(select(RoleModel)).scalars().all()
        return [self.get_by_name(m.name) for m in models]

    def _ensure_permission(self, code: str) -> None:
        if self.session.get(PermissionModel, code) is None:
            self.session.add(PermissionModel(code=code, description=""))


class SqlAlchemyPermissionRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def save(self, permission: Permission) -> Permission:
        merged = self.session.merge(mappers.permission_to_model(permission))
        self.session.flush()
        return mappers.model_to_permission(merged)

    def list_permissions(self) -> list[Permission]:
        models = self.session.execute(select(PermissionModel)).scalars().all()
        return [mappers.model_to_permission(m) for m in models]
