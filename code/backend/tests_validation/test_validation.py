"""Photo-validation tests.

The detector (`_detect_faces`) is replaced with fake landmarks so these tests
need neither mediapipe nor a real face photo. One optional integration test at
the bottom runs real MediaPipe if it is installed.
"""
import io

import numpy as np
import pytest
from PIL import Image

from services import photo_validation as pv
from services.photo_validation import VALIDATOR_VERSION, validate_photo


def _textured_jpeg(size=400, mean=128, seed=0) -> bytes:
    """A sharp, noisy image with a controllable average brightness."""
    rng = np.random.default_rng(seed)
    arr = np.clip(rng.normal(mean, 40, (size, size, 3)), 0, 255).astype(np.uint8)
    buf = io.BytesIO()
    Image.fromarray(arr).save(buf, format="JPEG", quality=95)
    return buf.getvalue()


def _flat_jpeg(size=400, value=128) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (size, size), (value, value, value)).save(buf, format="JPEG")
    return buf.getvalue()


def _fake_face(nose_x=0.5, left=0.3, right=0.7, top=0.2, bottom=0.8) -> np.ndarray:
    """468 landmarks, all in the middle, with the ones the validator reads placed."""
    lm = np.full((468, 3), 0.5, dtype=np.float32)
    lm[pv._CHEEK_A] = [left, 0.5, 0]
    lm[pv._CHEEK_B] = [right, 0.5, 0]
    lm[pv._NOSE_TIP] = [nose_x, 0.5, 0]
    lm[0] = [0.5, top, 0]
    lm[1 + 1] = [0.5, bottom, 0]
    return lm


@pytest.fixture
def one_good_face(monkeypatch):
    monkeypatch.setattr(pv, "_detect_faces", lambda rgb: [_fake_face()])


def test_contract_shape():
    result = validate_photo(b"x")
    assert set(result.keys()) == {"ok", "reasons", "checks", "validator_version"}
    assert isinstance(result["checks"], dict)
    assert {"face_count", "brightness", "yaw_deg", "blur_score"} <= set(result["checks"])


def test_unreadable_file_is_rejected():
    result = validate_photo(b"not an image at all")
    assert result["ok"] is False
    assert "couldn't read" in result["reasons"][0]


def test_good_photo_passes(one_good_face):
    result = validate_photo(_textured_jpeg())
    assert result["ok"] is True
    assert result["reasons"] == []
    assert result["validator_version"] == VALIDATOR_VERSION
    assert result["checks"]["face_count"] == 1


def test_no_face_is_rejected(monkeypatch):
    monkeypatch.setattr(pv, "_detect_faces", lambda rgb: [])
    result = validate_photo(_textured_jpeg())
    assert result["ok"] is False
    assert "No face detected" in result["reasons"][0]


def test_multiple_faces_are_rejected(monkeypatch):
    monkeypatch.setattr(pv, "_detect_faces", lambda rgb: [_fake_face(), _fake_face()])
    result = validate_photo(_textured_jpeg())
    assert result["ok"] is False
    assert "More than one face" in result["reasons"][0]


def test_head_turned_is_rejected(monkeypatch):
    # Nose far toward one cheek -> large yaw.
    monkeypatch.setattr(pv, "_detect_faces", lambda rgb: [_fake_face(nose_x=0.64)])
    result = validate_photo(_textured_jpeg())
    assert result["ok"] is False
    assert result["checks"]["yaw_deg"] > pv.MAX_YAW_DEG
    assert any("turned" in r for r in result["reasons"])


def test_frontal_yaw_is_near_zero():
    assert pv._estimate_yaw_deg(_fake_face(nose_x=0.5)) < 1.0


def test_too_dark_is_rejected(one_good_face):
    result = validate_photo(_textured_jpeg(mean=15))
    assert result["ok"] is False
    assert any("too dark" in r for r in result["reasons"])


def test_too_bright_is_rejected(one_good_face):
    result = validate_photo(_flat_jpeg(value=250))
    assert result["ok"] is False
    assert any("too bright" in r for r in result["reasons"])


def test_blurry_is_rejected(one_good_face):
    result = validate_photo(_flat_jpeg(value=128))  # no texture at all -> zero sharpness
    assert result["ok"] is False
    assert any("blurry" in r for r in result["reasons"])


def test_tiny_face_is_rejected(monkeypatch):
    small = _fake_face(left=0.45, right=0.55, top=0.45, bottom=0.55)
    monkeypatch.setattr(pv, "_detect_faces", lambda rgb: [small])
    result = validate_photo(_textured_jpeg())
    assert result["ok"] is False
    assert any("too small" in r for r in result["reasons"])


def test_face_cut_off_at_edge_is_rejected(monkeypatch):
    cut = _fake_face(left=-0.1, right=0.6, top=0.1, bottom=0.9)
    monkeypatch.setattr(pv, "_detect_faces", lambda rgb: [cut])
    result = validate_photo(_textured_jpeg())
    assert result["ok"] is False
    assert any("cut off" in r for r in result["reasons"])


def test_degrades_gracefully_when_mediapipe_unavailable(monkeypatch):
    monkeypatch.setattr(pv, "_detect_faces", lambda rgb: None)
    result = validate_photo(_textured_jpeg())
    assert result["ok"] is True
    assert result["validator_version"] == pv.UNAVAILABLE_VERSION


def test_real_mediapipe_rejects_blank_image():
    pytest.importorskip("mediapipe")
    result = validate_photo(_flat_jpeg())
    assert result["ok"] is False
    assert result["checks"]["face_count"] == 0
