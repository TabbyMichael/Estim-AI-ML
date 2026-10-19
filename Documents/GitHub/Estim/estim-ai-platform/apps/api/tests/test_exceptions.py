"""Tests for platform exception hierarchy."""

import pytest

from app.core.exceptions import (
    BadRequestError,
    ConflictError,
    EstimException,
    ForbiddenError,
    NotFoundError,
    ServiceUnavailableError,
    UnauthorizedError,
    ValidationError,
)


class TestEstimException:
    def test_base_defaults(self):
        err = EstimException()
        assert err.status_code == 500
        assert err.error_code == "INTERNAL_ERROR"
        assert str(err) == "An unexpected error occurred."

    def test_custom_message_and_details(self):
        err = EstimException("boom", details={"field": "x"})
        assert str(err) == "boom"
        assert err.to_dict() == {
            "error_code": "INTERNAL_ERROR",
            "message": "boom",
            "details": {"field": "x"},
        }

    def test_to_dict_shape(self):
        assert NotFoundError().to_dict() == {
            "error_code": "NOT_FOUND",
            "message": "The requested resource was not found.",
            "details": {},
        }


class TestHttpMapping:
    @pytest.mark.parametrize(
        "exc_cls, status, code",
        [
            (NotFoundError, 404, "NOT_FOUND"),
            (ValidationError, 422, "VALIDATION_ERROR"),
            (ConflictError, 409, "CONFLICT"),
            (UnauthorizedError, 401, "UNAUTHORIZED"),
            (ForbiddenError, 403, "FORBIDDEN"),
            (BadRequestError, 400, "BAD_REQUEST"),
            (ServiceUnavailableError, 503, "SERVICE_UNAVAILABLE"),
        ],
    )
    def test_status_codes(self, exc_cls, status, code):
        err = exc_cls()
        assert err.status_code == status
        assert err.error_code == code

    def test_subclass_of_estim(self):
        for cls in (
            NotFoundError,
            ValidationError,
            ConflictError,
            UnauthorizedError,
            ForbiddenError,
            BadRequestError,
            ServiceUnavailableError,
        ):
            assert issubclass(cls, EstimException)
