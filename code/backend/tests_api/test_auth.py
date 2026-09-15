"""Auth endpoint tests."""
import uuid

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def _unique_email() -> str:
    return f"user-{uuid.uuid4().hex[:10]}@example.com"


def test_register_returns_tokens():
    response = client.post("/api/auth/register", json={"email": _unique_email(), "password": "correcthorse1"})
    assert response.status_code == 201
    body = response.json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["token_type"] == "bearer"


def test_register_rejects_duplicate_email():
    email = _unique_email()
    client.post("/api/auth/register", json={"email": email, "password": "correcthorse1"})
    response = client.post("/api/auth/register", json={"email": email, "password": "correcthorse1"})
    assert response.status_code == 409


def test_register_rejects_weak_password():
    response = client.post("/api/auth/register", json={"email": _unique_email(), "password": "onlyletters"})
    assert response.status_code == 422

    response = client.post("/api/auth/register", json={"email": _unique_email(), "password": "12345678"})
    assert response.status_code == 422

    response = client.post("/api/auth/register", json={"email": _unique_email(), "password": "short1"})
    assert response.status_code == 422


def test_login_with_correct_credentials():
    email = _unique_email()
    client.post("/api/auth/register", json={"email": email, "password": "correcthorse1"})
    response = client.post("/api/auth/login", json={"email": email, "password": "correcthorse1"})
    assert response.status_code == 200
    assert response.json()["access_token"]


def test_login_with_wrong_password_401s():
    email = _unique_email()
    client.post("/api/auth/register", json={"email": email, "password": "correcthorse1"})
    response = client.post("/api/auth/login", json={"email": email, "password": "wrongpassword1"})
    assert response.status_code == 401


def test_login_with_unknown_email_401s_not_404():
    response = client.post("/api/auth/login", json={"email": _unique_email(), "password": "whatever123"})
    assert response.status_code == 401


def test_me_requires_a_token():
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_me_returns_the_authenticated_user():
    email = _unique_email()
    register = client.post("/api/auth/register", json={"email": email, "password": "correcthorse1"})
    token = register.json()["access_token"]

    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == email


def test_protected_endpoints_reject_missing_token():
    assert client.post("/api/predict", json={"manual": {"skin_type": "oily", "acne_severity": "mild"}}).status_code == 401
    assert client.post("/api/recommendations", json={"skin_type": "oily", "acne_severity": "mild"}).status_code == 401
    assert client.post("/api/upload", files={"file": ("x.jpg", b"x", "image/jpeg")}).status_code == 401


def test_protected_endpoints_reject_garbage_token():
    headers = {"Authorization": "Bearer not-a-real-jwt"}
    response = client.post("/api/predict", json={"manual": {"skin_type": "oily", "acne_severity": "mild"}}, headers=headers)
    assert response.status_code == 401


def test_ingredients_stays_public():
    response = client.get("/api/ingredients")
    assert response.status_code == 200


def test_refresh_issues_a_new_access_token():
    email = _unique_email()
    register = client.post("/api/auth/register", json={"email": email, "password": "correcthorse1"})
    refresh_token = register.json()["refresh_token"]

    response = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 200
    assert response.json()["access_token"]


def test_refresh_rejects_an_access_token_used_as_refresh():
    email = _unique_email()
    register = client.post("/api/auth/register", json={"email": email, "password": "correcthorse1"})
    access_token = register.json()["access_token"]

    response = client.post("/api/auth/refresh", json={"refresh_token": access_token})
    assert response.status_code == 401


def test_logout_revokes_the_access_token():
    email = _unique_email()
    register = client.post("/api/auth/register", json={"email": email, "password": "correcthorse1"})
    token = register.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    assert client.get("/api/auth/me", headers=headers).status_code == 200

    logout = client.post("/api/auth/logout", headers=headers)
    assert logout.status_code == 204

    assert client.get("/api/auth/me", headers=headers).status_code == 401


def test_logout_also_revokes_outstanding_refresh_tokens():
    email = _unique_email()
    register = client.post("/api/auth/register", json={"email": email, "password": "correcthorse1"})
    access_token = register.json()["access_token"]
    refresh_token = register.json()["refresh_token"]

    client.post("/api/auth/logout", headers={"Authorization": f"Bearer {access_token}"})

    response = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 401