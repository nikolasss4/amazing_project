"""Tests for health check endpoint."""

from fastapi.testclient import TestClient


def test_health_check(client: TestClient) -> None:
    """Test that health check returns healthy status."""
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "app" in data


def test_health_check_returns_app_name(client: TestClient) -> None:
    """Test that health check includes app name."""
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "gamified-trading-api"
