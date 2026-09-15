"""Shared fixture: a registered test user + bearer token, for tests that
call protected endpoints."""
import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


@pytest.fixture(scope="module")
def auth_headers():
    email = "pytest-user@example.com"
    password = "testpass123"

    response = client.post("/api/auth/register", json={"email": email, "password": password})
    if response.status_code == 409:
        response = client.post("/api/auth/login", json={"email": email, "password": password})

    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}