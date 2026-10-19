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
from app.core.security import CurrentUser, get_current_user
from app.modules.identity.api.schemas import (
    AccessTokenResponse,
    ChangePasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserResponse,
)
from app.modules.identity.application.services import AuthService, UserService
from app.modules.identity.domain import entities as domain_errors
from app.modules.identity.infrastructure.repository import SqlAlchemyUserRepository

router = APIRouter(tags=["identity"])


def _user_service(db: Session = Depends(get_db)) -> UserService:
    return UserService(SqlAlchemyUserRepository(db))


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
