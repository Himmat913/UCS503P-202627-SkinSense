"""GET /api/analyses and POST /api/feedback."""
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def _register(email: str) -> dict:
    password = "testpass123"
    response = client.post("/api/auth/register", json={"email": email, "password": password})
    if response.status_code == 409:
        response = client.post("/api/auth/login", json={"email": email, "password": password})
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _manual_predict(headers: dict, skin_type: str, severity: str) -> None:
    response = client.post(
        "/api/predict",
        json={"manual": {"skin_type": skin_type, "acne_severity": severity}},
        headers=headers,
    )
    assert response.status_code == 200


def test_history_requires_auth():
    assert client.get("/api/analyses").status_code == 401


def test_history_lists_saved_predictions_newest_first(auth_headers):
    _manual_predict(auth_headers, "dry", "mild")
    _manual_predict(auth_headers, "oily", "severe")

    response = client.get("/api/analyses", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 2
    newest = body["items"][0]
    assert newest["skin_type"] == "oily"
    assert newest["acne_severity"] == "severe"
    assert newest["source"] == "manual"
    assert newest["referral_needed"] is True


def test_history_never_returns_another_users_records(auth_headers):
    other = _register("pytest-history-other@example.com")
    _manual_predict(other, "normal", "moderate")
    other_total = client.get("/api/analyses", headers=other).json()["total"]

    mine = client.get("/api/analyses?limit=100", headers=auth_headers).json()
    theirs = client.get("/api/analyses?limit=100", headers=other).json()
    my_ids = {item["id"] for item in mine["items"]}
    their_ids = {item["id"] for item in theirs["items"]}
    assert my_ids.isdisjoint(their_ids)
    assert theirs["total"] == other_total


def test_history_limit_is_validated(auth_headers):
    assert client.get("/api/analyses?limit=0", headers=auth_headers).status_code == 422
    assert client.get("/api/analyses?limit=101", headers=auth_headers).status_code == 422


def test_feedback_requires_auth():
    response = client.post("/api/feedback", json={"clarity_rating": 4})
    assert response.status_code == 401


def test_feedback_is_stored(auth_headers):
    response = client.post(
        "/api/feedback",
        json={
            "clarity_rating": 5,
            "comment": "Reasons were clear.",
            "skin_type": "oily",
            "acne_severity": "moderate",
            "engine_version": "rules-1.0",
            "product_count": 6,
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    body = response.json()
    assert body["received"] is True
    assert isinstance(body["id"], int)


def test_feedback_rating_must_be_1_to_5(auth_headers):
    for rating in (0, 6):
        response = client.post("/api/feedback", json={"clarity_rating": rating}, headers=auth_headers)
        assert response.status_code == 422
