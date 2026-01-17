"""Pytest configuration and fixtures."""

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
async def async_client() -> AsyncClient:
    """Create an async test client for the FastAPI app."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def mock_auth_headers() -> dict[str, str]:
    """
    Create mock authentication headers.

    In real tests, this would use a valid test JWT.
    For now, it returns a stub token.
    """
    return {
        "Authorization": "Bearer test_jwt_token",
    }


@pytest.fixture
def mock_user_id() -> str:
    """Return a mock user ID for testing."""
    return "test-user-id-12345"
