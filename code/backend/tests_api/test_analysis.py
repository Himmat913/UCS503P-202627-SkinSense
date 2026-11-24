import io

from fastapi.testclient import TestClient
from PIL import Image

from main import app
from services import inference, photo_validation

client = TestClient(app)


def _fake_jpeg(seed: int = 0) -> bytes:
    img = Image.new("RGB", (64, 64), color=(seed % 255, 100, 150))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def _fake_validation(ok, reasons):
    return lambda image_bytes: {
        "ok": ok,
        "reasons": reasons,
        "checks": {},
        "validator_version": "test",
    }


def test_upload_accepts_valid_image(auth_headers, monkeypatch):
    # The real validator needs a real face photo; here we only test the endpoint.
    monkeypatch.setattr(photo_validation, "validate_photo", _fake_validation(True, []))
    response = client.post(
        "/api/upload",
        files={"file": ("selfie.jpg", _fake_jpeg(), "image/jpeg")},
        headers=auth_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["image_id"].startswith("img_")
    assert body["validation"]["ok"] is True


def test_upload_reports_validation_rejection(auth_headers, monkeypatch):
    monkeypatch.setattr(
        photo_validation, "validate_photo", _fake_validation(False, ["No face detected."])
    )
    response = client.post(
        "/api/upload",
        files={"file": ("selfie.jpg", _fake_jpeg(), "image/jpeg")},
        headers=auth_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["validation"]["ok"] is False
    assert body["validation"]["reasons"] == ["No face detected."]


def test_upload_rejects_non_image(auth_headers):
    response = client.post(
        "/api/upload",
        files={"file": ("notes.txt", b"hello", "text/plain")},
        headers=auth_headers,
    )
    assert response.status_code == 400


def test_predict_manual_path(auth_headers):
    response = client.post("/api/predict", json={"manual": {"skin_type": "oily", "acne_severity": "moderate"}}, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "manual"
    assert body["skin_type"] == "oily"
    assert body["skin_type_confidence"] == 1.0
    assert body["acne_severity"] == "moderate"


def test_predict_manual_severe_triggers_referral(auth_headers):
    response = client.post("/api/predict", json={"manual": {"skin_type": "dry", "acne_severity": "severe"}}, headers=auth_headers)
    body = response.json()
    assert body["referral"]["needed"] is True
    assert any("Severe" in r for r in body["referral"]["reasons"])


def test_predict_requires_exactly_one_source(auth_headers):
    response = client.post("/api/predict", json={}, headers=auth_headers)
    assert response.status_code == 422

    response = client.post("/api/predict", json={
        "image_id": "img_x",
        "manual": {"skin_type": "oily", "acne_severity": "mild"},
    }, headers=auth_headers)
    assert response.status_code == 422


def test_predict_unknown_image_id_404s(auth_headers):
    response = client.post(
        "/api/predict",
        json={"image_id": "img_does_not_exist", "skin_type": "oily"},
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_predict_without_skin_type_falls_back_when_no_model(auth_headers, monkeypatch):
    # No skin-type checkpoint in this test environment: omitting skin_type on an
    # image prediction should ask the caller to supply it, not 500 or silently guess.
    monkeypatch.setattr(photo_validation, "validate_photo", _fake_validation(True, []))
    upload = client.post(
        "/api/upload",
        files={"file": ("selfie.jpg", _fake_jpeg(), "image/jpeg")},
        headers=auth_headers,
    )
    image_id = upload.json()["image_id"]

    response = client.post("/api/predict", json={"image_id": image_id}, headers=auth_headers)
    assert response.status_code == 409
    assert "skin-type model" in response.json()["detail"]


def test_predict_uses_skin_type_model_when_available(auth_headers, monkeypatch):
    # With a (fake) model available, image_id alone is enough — no skin_type needed.
    monkeypatch.setattr(photo_validation, "validate_photo", _fake_validation(True, []))
    monkeypatch.setattr(
        inference,
        "predict_skin_type",
        lambda image_path: {"skin_type": "dry", "skin_type_confidence": 0.81, "skin_type_source": "model"},
    )
    upload = client.post(
        "/api/upload",
        files={"file": ("selfie.jpg", _fake_jpeg(), "image/jpeg")},
        headers=auth_headers,
    )
    image_id = upload.json()["image_id"]

    response = client.post("/api/predict", json={"image_id": image_id}, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["skin_type"] == "dry"
    assert body["skin_type_confidence"] == 0.81
    assert body["skin_type_source"] == "model"


def test_predict_skin_type_override_wins_even_if_model_available(auth_headers, monkeypatch):
    monkeypatch.setattr(photo_validation, "validate_photo", _fake_validation(True, []))
    monkeypatch.setattr(
        inference,
        "predict_skin_type",
        lambda image_path: {"skin_type": "dry", "skin_type_confidence": 0.81, "skin_type_source": "model"},
    )
    upload = client.post(
        "/api/upload",
        files={"file": ("selfie.jpg", _fake_jpeg(), "image/jpeg")},
        headers=auth_headers,
    )
    image_id = upload.json()["image_id"]

    response = client.post(
        "/api/predict", json={"image_id": image_id, "skin_type": "oily"}, headers=auth_headers
    )
    body = response.json()
    assert body["skin_type"] == "oily"
    assert body["skin_type_source"] == "manual"


def test_predict_from_uploaded_image_is_deterministic(auth_headers):
    upload = client.post(
        "/api/upload",
        files={"file": ("selfie.jpg", _fake_jpeg(42), "image/jpeg")},
        headers=auth_headers,
    )
    image_id = upload.json()["image_id"]
    payload = {"image_id": image_id, "skin_type": "oily"}

    first = client.post("/api/predict", json=payload, headers=auth_headers).json()
    second = client.post("/api/predict", json=payload, headers=auth_headers).json()

    assert first["skin_type"] == "oily"
    assert first["skin_type"] == second["skin_type"]
    assert first["acne_severity"] == second["acne_severity"]
    assert first["source"] in {"stub", "model"}