import io

from fastapi.testclient import TestClient
from PIL import Image

from main import app

client = TestClient(app)


def _fake_jpeg(seed: int = 0) -> bytes:
    """A tiny real JPEG (not just random bytes) so PIL-based preprocessing,
    if the real-model path is ever exercised, doesn't choke on garbage."""
    img = Image.new("RGB", (64, 64), color=(seed % 255, 100, 150))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_upload_accepts_valid_image():
    response = client.post(
        "/api/upload",
        files={"file": ("selfie.jpg", _fake_jpeg(), "image/jpeg")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["image_id"].startswith("img_")
    assert body["validation"]["ok"] is True


def test_upload_rejects_non_image():
    response = client.post(
        "/api/upload",
        files={"file": ("notes.txt", b"hello", "text/plain")},
    )
    assert response.status_code == 400


def test_predict_manual_path():
    response = client.post("/api/predict", json={"manual": {"skin_type": "oily", "acne_severity": "moderate"}})
    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "manual"
    assert body["skin_type"] == "oily"
    assert body["skin_type_confidence"] == 1.0
    assert body["acne_severity"] == "moderate"


def test_predict_manual_severe_triggers_referral():
    response = client.post("/api/predict", json={"manual": {"skin_type": "dry", "acne_severity": "severe"}})
    body = response.json()
    assert body["referral"]["needed"] is True
    assert any("Severe" in r for r in body["referral"]["reasons"])


def test_predict_requires_exactly_one_source():
    # neither image_id nor manual
    response = client.post("/api/predict", json={})
    assert response.status_code == 422

    # both at once
    response = client.post("/api/predict", json={
        "image_id": "img_x",
        "manual": {"skin_type": "oily", "acne_severity": "mild"},
    })
    assert response.status_code == 422


def test_predict_unknown_image_id_404s():
    response = client.post("/api/predict", json={"image_id": "img_does_not_exist"})
    assert response.status_code == 404


def test_predict_from_uploaded_image_is_deterministic():
    upload = client.post(
        "/api/upload",
        files={"file": ("selfie.jpg", _fake_jpeg(42), "image/jpeg")},
    )
    image_id = upload.json()["image_id"]

    first = client.post("/api/predict", json={"image_id": image_id}).json()
    second = client.post("/api/predict", json={"image_id": image_id}).json()

    # same stored image -> same stub prediction, every time
    assert first["skin_type"] == second["skin_type"]
    assert first["acne_severity"] == second["acne_severity"]
    assert first["source"] == "stub"
