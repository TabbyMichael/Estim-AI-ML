"""Identity API routes: /auth/* + /users/me.

Wired via dependency-injected services backed by SQLAlchemy
repositories. Router mounts in app.main (Phase 3.4).
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import (
    BadRequestError,
    ConflictError,
    EstimException,
    UnauthorizedError,
)
from app.core.exceptions import (
    NotFoundError as CoreNotFound,
)
from app.core.security import CurrentUser, get_current_user, require_roles
from app.modules.identity.api.schemas import (
    AccessTokenResponse,
    AdminUserCreateRequest,
    AdminUserUpdateRequest,
    ChangePasswordRequest,
    LoginRequest,
    PermissionGrantRequest,
    PermissionResponse,
    RefreshRequest,
    RegisterRequest,
    RoleAssignRequest,
    RoleResponse,
    TokenResponse,
    UpdateProfileRequest,
    UserActivityResponse,
    UserListResponse,
    UserResponse,
)
from app.modules.identity.application.services import AuthService, RoleService, UserService
from app.modules.identity.domain import entities as domain_errors
from app.modules.identity.domain.entities import Permission, Role
from app.modules.identity.infrastructure.repository import (
    SqlAlchemyPermissionRepository,
    SqlAlchemyRoleRepository,
    SqlAlchemyUserRepository,
)

router = APIRouter(tags=["identity"])


def _user_service(db: Session = Depends(get_db)) -> UserService:
    return UserService(SqlAlchemyUserRepository(db))


def _role_service(db: Session = Depends(get_db)) -> RoleService:
    return RoleService(SqlAlchemyRoleRepository(db))


def _permission_repo(db: Session = Depends(get_db)) -> SqlAlchemyPermissionRepository:
    return SqlAlchemyPermissionRepository(db)


def _auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(SqlAlchemyUserRepository(db))


def _translate(exc: Exception) -> Exception:
    """Map known domain errors to platform errors; unknown pass through as-is."""
    if isinstance(exc, domain_errors.DuplicateUserError):
        return ConflictError(str(exc))
    if isinstance(exc, domain_errors.NotFoundError):
        return CoreNotFound(str(exc))
    if isinstance(exc, domain_errors.ValidationError):
        return BadRequestError(str(exc))
    if isinstance(exc, EstimException):
        return exc
    return exc  # unexpected -> global handler turns it into a 500


@router.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    body: RegisterRequest,
    svc: UserService = Depends(_user_service),
    db: Session = Depends(get_db),
) -> UserResponse:
    try:
        user = svc.register(body.email, body.password, body.full_name)
    except Exception as exc:  # noqa: BLE001 - translate domain errors
        raise _translate(exc) from exc
    db.commit()
    return UserResponse.from_entity(user)


@router.post("/auth/login", response_model=TokenResponse)
def login(
    body: LoginRequest,
    svc: AuthService = Depends(_auth_service),
    db: Session = Depends(get_db),
) -> TokenResponse:
    try:
        _, access, refresh = svc.login(body.email, body.password)
    except domain_errors.ValidationError as exc:
        raise UnauthorizedError(str(exc)) from exc
    db.commit()  # persist last_login_at
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/auth/refresh", response_model=AccessTokenResponse)
def refresh(body: RefreshRequest, svc: AuthService = Depends(_auth_service)) -> AccessTokenResponse:
    try:
        _, access = svc.refresh(body.refresh_token)
        return AccessTokenResponse(access_token=access)
    except Exception as exc:  # noqa: BLE001 - translate domain errors
        raise UnauthorizedError(str(exc)) from exc


@router.get("/users/me", response_model=UserResponse)
def me(
    current: CurrentUser = Depends(get_current_user),
    svc: UserService = Depends(_user_service),
) -> UserResponse:
    try:
        return UserResponse.from_entity(svc.users.get_by_id(current.user_id))
    except Exception as exc:  # noqa: BLE001 - translate domain errors
        raise _translate(exc) from exc


@router.put("/users/me", response_model=UserResponse)
def update_me(
    body: UpdateProfileRequest,
    current: CurrentUser = Depends(get_current_user),
    svc: UserService = Depends(_user_service),
    db: Session = Depends(get_db),
) -> UserResponse:
    try:
        user = svc.update_profile(current.user_id, body.full_name)
    except Exception as exc:  # noqa: BLE001 - translate domain errors
        raise _translate(exc) from exc
    db.commit()
    return UserResponse.from_entity(user)


@router.post("/users/me/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    body: ChangePasswordRequest,
    current: CurrentUser = Depends(get_current_user),
    svc: AuthService = Depends(_auth_service),
    db: Session = Depends(get_db),
) -> None:
    try:
        svc.change_password(current.user_id, body.old_password, body.new_password)
    except Exception as exc:  # noqa: BLE001 - translate domain errors
        raise _translate(exc) from exc
    db.commit()


# ── Admin: user management (Roadmap 1.1) ──────────────────────────

AdminUser = Depends(require_roles("admin", "platform_admin"))


@router.get("/admin/users", response_model=UserListResponse)
def admin_list_users(
    skip: int = 0,
    limit: int = 50,
    q: str | None = None,
    is_active: bool | None = None,
    _: CurrentUser = AdminUser,
    svc: UserService = Depends(_user_service),
) -> UserListResponse:
    users, total = svc.list_users(skip=skip, limit=min(limit, 200), query=q, is_active=is_active)
    return UserListResponse(
        users=[UserResponse.from_entity(u) for u in users], total=total, skip=skip, limit=limit
    )


@router.post("/admin/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def admin_create_user(
    body: AdminUserCreateRequest,
    _: CurrentUser = AdminUser,
    svc: UserService = Depends(_user_service),
    db: Session = Depends(get_db),
) -> UserResponse:
    try:
        user = svc.register(body.email, body.password, body.full_name, roles=body.roles)
    except Exception as exc:  # noqa: BLE001
        raise _translate(exc) from exc
    db.commit()
    return UserResponse.from_entity(user)


@router.put("/admin/users/{user_id}", response_model=UserResponse)
def admin_update_user(
    user_id: str,
    body: AdminUserUpdateRequest,
    _: CurrentUser = AdminUser,
    svc: UserService = Depends(_user_service),
    db: Session = Depends(get_db),
) -> UserResponse:
    try:
        user = svc.admin_update(
            user_id, full_name=body.full_name, roles=body.roles, is_active=body.is_active
        )
    except Exception as exc:  # noqa: BLE001
        raise _translate(exc) from exc
    db.commit()
    return UserResponse.from_entity(user)


@router.post("/admin/users/{user_id}/deactivate", response_model=UserResponse)
def admin_deactivate_user(
    user_id: str,
    _: CurrentUser = AdminUser,
    svc: UserService = Depends(_user_service),
    db: Session = Depends(get_db),
) -> UserResponse:
    try:
        user = svc.set_active(user_id, False)
    except Exception as exc:  # noqa: BLE001
        raise _translate(exc) from exc
    db.commit()
    return UserResponse.from_entity(user)


@router.post("/admin/users/{user_id}/reactivate", response_model=UserResponse)
def admin_reactivate_user(
    user_id: str,
    _: CurrentUser = AdminUser,
    svc: UserService = Depends(_user_service),
    db: Session = Depends(get_db),
) -> UserResponse:
    try:
        user = svc.set_active(user_id, True)
    except Exception as exc:  # noqa: BLE001
        raise _translate(exc) from exc
    db.commit()
    return UserResponse.from_entity(user)


@router.post("/admin/users/{user_id}/roles", response_model=UserResponse)
def admin_assign_role(
    user_id: str,
    body: RoleAssignRequest,
    _: CurrentUser = AdminUser,
    svc: UserService = Depends(_user_service),
    db: Session = Depends(get_db),
) -> UserResponse:
    try:
        user = svc.assign_role(user_id, body.role)
    except Exception as exc:  # noqa: BLE001
        raise _translate(exc) from exc
    db.commit()
    return UserResponse.from_entity(user)


@router.delete("/admin/users/{user_id}/roles/{role}", response_model=UserResponse)
def admin_remove_role(
    user_id: str,
    role: str,
    _: CurrentUser = AdminUser,
    svc: UserService = Depends(_user_service),
    db: Session = Depends(get_db),
) -> UserResponse:
    try:
        user = svc.remove_role(user_id, role)
    except Exception as exc:  # noqa: BLE001
        raise _translate(exc) from exc
    db.commit()
    return UserResponse.from_entity(user)


@router.post("/admin/users/bulk-activate", response_model=list[UserResponse])
def admin_bulk_activate(
    user_ids: list[str],
    _: CurrentUser = AdminUser,
    svc: UserService = Depends(_user_service),
    db: Session = Depends(get_db),
) -> list[UserResponse]:
    users = [svc.set_active(uid, True) for uid in user_ids[:200]]
    db.commit()
    return [UserResponse.from_entity(u) for u in users]


@router.post("/admin/users/bulk-deactivate", response_model=list[UserResponse])
def admin_bulk_deactivate(
    user_ids: list[str],
    _: CurrentUser = AdminUser,
    svc: UserService = Depends(_user_service),
    db: Session = Depends(get_db),
) -> list[UserResponse]:
    users = [svc.set_active(uid, False) for uid in user_ids[:200]]
    db.commit()
    return [UserResponse.from_entity(u) for u in users]


@router.get("/admin/users/activity", response_model=list[UserActivityResponse])
def admin_user_activity(
    _: CurrentUser = AdminUser,
    svc: UserService = Depends(_user_service),
) -> list[UserActivityResponse]:
    users, _ = svc.list_users(skip=0, limit=500)
    return [
        UserActivityResponse(
            user_id=u.id, email=u.email, last_login_at=u.last_login_at,
            is_active=u.is_active, roles=list(u.roles),
        )
        for u in users
    ]


@router.get("/admin/roles", response_model=list[RoleResponse])
def admin_list_roles(
    _: CurrentUser = AdminUser,
    svc: RoleService = Depends(_role_service),
) -> list[RoleResponse]:
    return [
        RoleResponse(name=r.name, description=r.description, permissions=list(r.permissions))
        for r in svc.list_roles()
    ]


@router.post("/admin/roles", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
def admin_create_role(
    body: RoleResponse,
    _: CurrentUser = AdminUser,
    svc: RoleService = Depends(_role_service),
    db: Session = Depends(get_db),
) -> RoleResponse:
    role = svc.create_role(body.name, body.description, body.permissions)
    db.commit()
    return RoleResponse(name=role.name, description=role.description,
                        permissions=list(role.permissions))


@router.post("/admin/roles/{role_name}/permissions", response_model=RoleResponse)
def admin_grant_permission(
    role_name: str,
    body: PermissionGrantRequest,
    _: CurrentUser = AdminUser,
    svc: RoleService = Depends(_role_service),
    db: Session = Depends(get_db),
) -> RoleResponse:
    role = svc.grant(role_name, body.permission)
    db.commit()
    return RoleResponse(name=role.name, description=role.description,
                        permissions=list(role.permissions))


@router.delete("/admin/roles/{role_name}/permissions/{permission}", response_model=RoleResponse)
def admin_revoke_permission(
    role_name: str,
    permission: str,
    _: CurrentUser = AdminUser,
    svc: RoleService = Depends(_role_service),
    db: Session = Depends(get_db),
) -> RoleResponse:
    role = svc.revoke(role_name, permission)
    db.commit()
    return RoleResponse(name=role.name, description=role.description,
                        permissions=list(role.permissions))


@router.get("/admin/permissions", response_model=list[PermissionResponse])
def admin_list_permissions(
    _: CurrentUser = AdminUser,
    repo: SqlAlchemyPermissionRepository = Depends(_permission_repo),
) -> list[PermissionResponse]:
    return [PermissionResponse(code=p.code, description=p.description)
            for p in repo.list_permissions()]
