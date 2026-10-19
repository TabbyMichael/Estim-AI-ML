"""SQLAlchemy models for the identity module (schema: identity).

Tables: users, roles, permissions, user_roles (association).
Cross-schema FKs are forbidden (ADR-002) - roles referenced by name.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(UTC)


class UserModel(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "identity"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    roles: Mapped[list["UserRoleModel"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class RoleModel(Base):
    __tablename__ = "roles"
    __table_args__ = {"schema": "identity"}

    name: Mapped[str] = mapped_column(String(100), primary_key=True)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")


class PermissionModel(Base):
    __tablename__ = "permissions"
    __table_args__ = {"schema": "identity"}

    code: Mapped[str] = mapped_column(String(150), primary_key=True)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")


class RolePermissionModel(Base):
    __tablename__ = "role_permissions"
    __table_args__ = {"schema": "identity"}

    role_name: Mapped[str] = mapped_column(
        String(100), ForeignKey("identity.roles.name", ondelete="CASCADE"), primary_key=True
    )
    permission_code: Mapped[str] = mapped_column(
        String(150), ForeignKey("identity.permissions.code", ondelete="CASCADE"), primary_key=True
    )


class UserRoleModel(Base):
    __tablename__ = "user_roles"
    __table_args__ = {"schema": "identity"}

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("identity.users.id", ondelete="CASCADE"), primary_key=True
    )
    role_name: Mapped[str] = mapped_column(
        String(100), ForeignKey("identity.roles.name", ondelete="CASCADE"), primary_key=True
    )

    user: Mapped[UserModel] = relationship(back_populates="roles")
