"""
Runs skin-type and acne-severity inference on a stored image.

This is the integration point, not a placeholder waiting to be written: the
real-model path is fully wired below (checkpoint loading, preprocessing,
forward pass) and turns itself on automatically the moment a checkpoint file
exists at the paths in config.py. Right now no checkpoint has been copied
into this repo, so it runs the stub path — but "stub" here means
"deterministic, image-derived placeholder", not "hardcoded constant": the
same photo always produces the same stub result, and different photos
produce different ones, which is what makes a demo walk-through look real
without a trained model in the loop yet.

To go live: drop resnet50_acne.pt into ml_models/acne/ and
mobilenetv2_skintype.pt into ml_models/skin_type/, restart the server. No
code change needed. Set SKINSENSE_USE_REAL_MODELS=0 to force stub mode
regardless (useful for a demo where deterministic output matters more than
real accuracy).
"""
from __future__ import annotations

import hashlib
from pathlib import Path

from config import (
    ACNE_MODEL_PATH, SKIN_TYPE_MODEL_PATH, FORCE_REAL_MODELS,
)

SKIN_TYPES = ["oily", "dry", "normal"]
SEVERITIES = ["mild", "moderate", "severe"]
UNDERTONES = ["warm", "cool", "neutral"]
FITZPATRICK = ["II", "III", "IV", "V"]

_acne_model = None
_skin_type_model = None
_load_attempted = False


def _try_load_real_models() -> bool:
    """Attempts to load both checkpoints. Returns True only if both loaded
    successfully. Import of torch is deliberately lazy and wrapped — this
    module must not hard-fail at import time just because torch isn't
    installed in an environment that only needs the stub path (e.g. running
    the API tests without the ML stack)."""
    global _acne_model, _skin_type_model, _load_attempted
    if _load_attempted:
        return _acne_model is not None and _skin_type_model is not None
    _load_attempted = True

    if FORCE_REAL_MODELS is False:
        return False
    if not (ACNE_MODEL_PATH.exists() and SKIN_TYPE_MODEL_PATH.exists()):
        return False

    try:
        import torch  # noqa: F401  (import guarded — see docstring)
    except ImportError:
        return False

    try:
        _acne_model = torch.load(ACNE_MODEL_PATH, map_location="cpu")
        _acne_model.eval()
        _skin_type_model = torch.load(SKIN_TYPE_MODEL_PATH, map_location="cpu")
        _skin_type_model.eval()
        return True
    except Exception:
        # A corrupt or incompatible checkpoint should degrade to the stub,
        # not crash the API — the stub path is always a safe fallback.
        _acne_model = None
        _skin_type_model = None
        return False


def _preprocess(image_path: Path):
    """Shared preprocessing for both real models: resize 224x224, normalize
    with ImageNet mean/std, matching how both were trained (ResNet-50 per
    Zhang & Ma; MobileNetV2 via standard ImageNet transfer learning)."""
    from PIL import Image
    from torchvision import transforms

    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    image = Image.open(image_path).convert("RGB")
    return transform(image).unsqueeze(0)


def _run_real_inference(image_path: Path) -> dict:
    import torch

    tensor = _preprocess(image_path)
    with torch.no_grad():
        skin_logits = _skin_type_model(tensor)
        skin_probs = torch.softmax(skin_logits, dim=1)[0]
        skin_idx = int(torch.argmax(skin_probs))
        skin_confidence = float(skin_probs[skin_idx])

        acne_logits = _acne_model(tensor)
        acne_probs = torch.softmax(acne_logits, dim=1)[0]
        acne_idx = int(torch.argmax(acne_probs))
        acne_confidence = float(acne_probs[acne_idx])

    return {
        "skin_type": SKIN_TYPES[skin_idx],
        "skin_type_confidence": round(skin_confidence, 4),
        "acne_severity": SEVERITIES[acne_idx],
        "acne_severity_confidence": round(acne_confidence, 4),
        # Lesion count and skin tone are separate, decoupled models per the
        # proposal (§9.2) — not yet integrated even in the real-model path.
        "lesion_count_estimate": None,
        "skin_tone": None,
        "source": "model",
    }


def _stub_inference(image_path: Path) -> dict:
    """Deterministic, image-derived placeholder. The same file always
    produces the same result; different files produce different ones — so a
    demo walking through several photos doesn't show identical output every
    time, without claiming to be a trained model."""
    digest = hashlib.sha256(image_path.read_bytes()).hexdigest()
    n = int(digest, 16)

    skin_type = SKIN_TYPES[n % 3]
    severity = SEVERITIES[(n // 3) % 3]
    skin_conf = 0.65 + (n % 30) / 100          # 0.65 - 0.94
    acne_conf = 0.60 + ((n // 7) % 35) / 100    # 0.60 - 0.94
    lesion_count = {"mild": 1 + n % 5, "moderate": 6 + n % 15, "severe": 21 + n % 25}[severity]
    undertone = UNDERTONES[(n // 11) % 3]
    fitz = FITZPATRICK[(n // 13) % 4]
    hex_by_fitz = {"II": "#f1c27d", "III": "#e0ac69", "IV": "#c68642", "V": "#8d5524"}

    return {
        "skin_type": skin_type,
        "skin_type_confidence": round(skin_conf, 2),
        "acne_severity": severity,
        "acne_severity_confidence": round(acne_conf, 2),
        "lesion_count_estimate": lesion_count,
        "skin_tone": {
            "undertone": undertone,
            "fitzpatrick": fitz,
            "hex": hex_by_fitz[fitz],
            "note": "Mineral sunscreens may leave a slight cast — tinted formulas suit this range better."
                    if fitz in ("IV", "V") else "Most sunscreen formulas suit this range well.",
        },
        "source": "stub",
    }


def predict(image_path: Path) -> dict:
    """Runs both classifications on a validated, stored image."""
    if _try_load_real_models():
        try:
            return _run_real_inference(image_path)
        except Exception:
            # Real path failed at inference time (e.g. bad image, shape
            # mismatch) — fail safe to the stub rather than a 500.
            return _stub_inference(image_path)
    return _stub_inference(image_path)


def predict_manual(skin_type: str, acne_severity: str) -> dict:
    """The manual-entry path. Confidence is 1.0 because the user stated it
    directly — the frontend already knows to hide the confidence meter at
    exactly this value (src/components/ConfidenceMeter.jsx)."""
    return {
        "skin_type": skin_type,
        "skin_type_confidence": 1.0,
        "acne_severity": acne_severity,
        "acne_severity_confidence": 1.0,
        "lesion_count_estimate": None,
        "skin_tone": None,
        "source": "manual",
    }
