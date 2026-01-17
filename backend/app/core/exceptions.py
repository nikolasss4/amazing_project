"""Custom exceptions for the application."""

from typing import Any


class AppException(Exception):
    """Base exception for application errors."""

    def __init__(
        self,
        message: str,
        error_code: str = "app_error",
        status_code: int = 500,
        details: dict[str, Any] | None = None,
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


class NotFoundError(AppException):
    """Resource not found error."""

    def __init__(self, resource: str, identifier: str | None = None):
        message = f"{resource} not found"
        if identifier:
            message = f"{resource} with id '{identifier}' not found"
        super().__init__(
            message=message,
            error_code="not_found",
            status_code=404,
        )


class ValidationError(AppException):
    """Validation error."""

    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(
            message=message,
            error_code="validation_error",
            status_code=400,
            details=details,
        )


class AuthorizationError(AppException):
    """Authorization error."""

    def __init__(self, message: str = "Not authorized to perform this action"):
        super().__init__(
            message=message,
            error_code="authorization_error",
            status_code=403,
        )


class ExternalServiceError(AppException):
    """External service error."""

    def __init__(self, service: str, message: str):
        super().__init__(
            message=f"{service} error: {message}",
            error_code="external_service_error",
            status_code=502,
            details={"service": service},
        )
