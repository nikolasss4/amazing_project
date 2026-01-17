"""Security utilities for JWT validation and user authentication."""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

security = HTTPBearer()


class CurrentUser(BaseModel):
    """Current authenticated user model."""

    id: str
    email: str | None = None
    role: str = "user"

    # Additional Supabase user metadata
    app_metadata: dict = {}
    user_metadata: dict = {}


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
) -> CurrentUser:
    """
    Extract and validate the current user from Supabase JWT.

    This dependency validates the JWT token from the Authorization header
    and returns the current user information.

    Raises:
        HTTPException: If token is invalid or expired.
    """
    token = credentials.credentials

    try:
        # TODO: For production, verify with Supabase JWT secret
        # The JWT secret can be found in Supabase Dashboard > Settings > API
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user ID",
            )

        return CurrentUser(
            id=user_id,
            email=payload.get("email"),
            role=payload.get("role", "user"),
            app_metadata=payload.get("app_metadata", {}),
            user_metadata=payload.get("user_metadata", {}),
        )

    except JWTError as e:
        logger.warning("JWT validation failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user_optional(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(HTTPBearer(auto_error=False))],
) -> CurrentUser | None:
    """
    Optionally extract current user from JWT.

    Returns None if no token is provided, but validates if present.
    """
    if credentials is None:
        return None

    return await get_current_user(credentials)


# Type alias for dependency injection
AuthenticatedUser = Annotated[CurrentUser, Depends(get_current_user)]
OptionalUser = Annotated[CurrentUser | None, Depends(get_current_user_optional)]
