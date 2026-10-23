"""Platform-wide exception hierarchy.

Domain modules raise their own errors (e.g. procurement's
InvalidStateError); the API layer translates them into these
HTTP-mapped exceptions via handlers registered in main.py.
"""

from typing import Any


class EstimException(Exception):
    """Base class for all platform exceptions."""

    status_code: int = 500
    error_code: str = "INTERNAL_ERROR"
    message: str = "An unexpected error occurred."

    def __init__(
        self,
        message: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message or self.message)
        self.message = message or self.message
        self.details = details or {}

    def to_dict(self) -> dict[str, Any]:
        return {
            "error_code": self.error_code,
            "message": self.message,
            "details": self.details,
        }


class NotFoundError(EstimException):
    status_code = 404
    error_code = "NOT_FOUND"
    message = "The requested resource was not found."


class ValidationError(EstimException):
    status_code = 422
    error_code = "VALIDATION_ERROR"
    message = "Request validation failed."


class ConflictError(EstimException):
    status_code = 409
    error_code = "CONFLICT"
    message = "The resource conflicts with existing data."


class UnauthorizedError(EstimException):
    status_code = 401
    error_code = "UNAUTHORIZED"
    message = "Authentication is required."


class ForbiddenError(EstimException):
    status_code = 403
    error_code = "FORBIDDEN"
    message = "You do not have permission to perform this action."


class BadRequestError(EstimException):
    status_code = 400
    error_code = "BAD_REQUEST"
    message = "The request could not be processed."


class ServiceUnavailableError(EstimException):
    status_code = 503
    error_code = "SERVICE_UNAVAILABLE"
    message = "A downstream service is unavailable."
