"""End-to-end test of the real skin-type inference pipeline: a synthetic checkpoint
matching the training format, a real face photo, real MediaPipe landmarks, the shared
skin_preprocess module, and the model forward pass — everything except an actual
trained checkpoint. Skipped if torch/torchvision/mediapipe aren't installed."""
from pathlib import Path

import pytest

torch = pytest.importorskip("torch")
pytest.importorskip("torchvision")
mp = pytest.importorskip("mediapipe")

import numpy as np
from PIL import Image

from config import SKIN_TYPE_MODEL_PATH
from services import inference


def _synthetic_face_png(path: Path, size: int = 400) -> None:
    """A rough face-like image (oval + eyes + mouth) real enough for MediaPipe
    FaceMesh to find a single face in. Not a real photo, but exercises the whole
    pipeline exactly like one would."""
    import math

    img = Image.new("RGB", (size, size), (210, 180, 160))
    px = img.load()
    cx, cy = size // 2, size // 2
    rx, ry = size * 0.33, size * 0.42
    for y in range(size):
        for x in range(size):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                px[x, y] = (225, 195, 175)
    for ex in (cx - size * 0.13, cx + size * 0.13):
        for y in range(int(cy - size * 0.06), int(cy - size * 0.02)):
            for x in range(int(ex - size * 0.05), int(ex + size * 0.05)):
                if 0 <= x < size and 0 <= y < size:
                    px[x, y] = (40, 30, 30)
    for y in range(int(cy + size * 0.18), int(cy + size * 0.21)):
        for x in range(int(cx - size * 0.08), int(cx + size * 0.08)):
            px[x, y] = (120, 60, 60)
    img.save(path)


@pytest.fixture
def fake_checkpoint(tmp_path, monkeypatch):
    from torchvision.models import mobilenet_v2
    import torch.nn as nn

    model = mobilenet_v2(weights=None)
    model.classifier = nn.Sequential(nn.Dropout(0.3), nn.Linear(model.last_channel, 3))
    classes = ["dry", "normal", "oily"]
    ckpt_path = tmp_path / "mobilenetv2_skintype.pt"
    torch.save(
        {"state_dict": model.state_dict(), "classes": classes,
         "preprocess": {"sharpness_target": None}, "val_balanced_acc": 0.5},
        ckpt_path,
    )
    # This test exercises the "real model available" path specifically, regardless of
    # whichever SKINSENSE_USE_REAL_MODELS the test suite happens to be run with (CI
    # runs with it forced off, since it doesn't install torch at all).
    monkeypatch.setattr(inference, "FORCE_REAL_MODELS", True, raising=False)
    monkeypatch.setattr(inference, "SKIN_TYPE_MODEL_PATH", ckpt_path, raising=False)
    monkeypatch.setattr("config.SKIN_TYPE_MODEL_PATH", ckpt_path, raising=False)
    inference._skin_model = None
    inference._skin_classes = None
    inference._skin_preprocess_cfg = {}
    inference._skin_load_attempted = False
    yield ckpt_path, classes
    inference._skin_model = None
    inference._skin_classes = None
    inference._skin_preprocess_cfg = {}
    inference._skin_load_attempted = False


def test_predict_skin_type_runs_full_pipeline(tmp_path, fake_checkpoint):
    ckpt_path, classes = fake_checkpoint
    photo_path = tmp_path / "face.png"
    _synthetic_face_png(photo_path)

    result = inference.predict_skin_type(photo_path)

    assert result is not None, "expected a result: the checkpoint loads and the synthetic photo has one face"
    assert result["skin_type"] in classes
    assert 0.0 <= result["skin_type_confidence"] <= 1.0
    assert result["skin_type_source"] == "model"


def test_predict_skin_type_none_without_checkpoint(tmp_path, monkeypatch):
    monkeypatch.setattr("config.SKIN_TYPE_MODEL_PATH", tmp_path / "does_not_exist.pt", raising=False)
    inference._skin_model = None
    inference._skin_load_attempted = False
    try:
        assert inference.predict_skin_type(tmp_path / "irrelevant.png") is None
    finally:
        inference._skin_load_attempted = False


def test_predict_skin_type_none_when_no_face(tmp_path, fake_checkpoint):
    blank_path = tmp_path / "blank.png"
    Image.fromarray(np.full((300, 300, 3), 128, np.uint8)).save(blank_path)
    assert inference.predict_skin_type(blank_path) is None
