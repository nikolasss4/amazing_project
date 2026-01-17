"""Tests for authentication stubs and security utilities."""

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.core.security import get_current_user, CurrentUser


class TestCurrentUser:
    """Tests for CurrentUser model."""

    def test_current_user_creation(self) -> None:
        """Test CurrentUser model instantiation."""
        user = CurrentUser(
            id="test-id",
            email="test@example.com",
            role="user",
        )

        assert user.id == "test-id"
        assert user.email == "test@example.com"
        assert user.role == "user"

    def test_current_user_defaults(self) -> None:
        """Test CurrentUser default values."""
        user = CurrentUser(id="test-id")

        assert user.id == "test-id"
        assert user.email is None
        assert user.role == "user"
        assert user.app_metadata == {}
        assert user.user_metadata == {}


class TestGetCurrentUser:
    """Tests for get_current_user dependency."""

    @pytest.mark.asyncio
    async def test_get_current_user_invalid_token(self) -> None:
        """Test that invalid token raises HTTPException."""
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials="invalid_token",
        )

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(credentials)

        assert exc_info.value.status_code == 401

    # TODO: Add test with valid JWT token
    # This requires setting up a proper JWT secret and token generation


class TestProtectedEndpoints:
    """Tests for protected endpoint behavior."""

    def test_protected_endpoint_without_auth(self, client) -> None:
        """Test that protected endpoints return 401 without auth."""
        # Most endpoints require authentication
        protected_endpoints = [
            "/api/trade/hyperliquid/positions",
            "/api/trade/pear/pairs/positions",
            "/api/community/users/me",
            "/api/community/friends",
            "/api/improve/challenges/user/me",
            "/api/ai/chat",
        ]

        for endpoint in protected_endpoints:
            # GET endpoints
            if endpoint in [
                "/api/trade/hyperliquid/positions",
                "/api/trade/pear/pairs/positions",
                "/api/community/users/me",
                "/api/community/friends",
                "/api/improve/challenges/user/me",
            ]:
                response = client.get(endpoint)
            # POST endpoints
            else:
                response = client.post(endpoint, json={})

            assert response.status_code in [401, 403, 422], (
                f"Expected 401/403/422 for {endpoint}, got {response.status_code}"
            )
