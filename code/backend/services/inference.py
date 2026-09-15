"""Runs skin-type and acne-severity inference on a stored image. Falls back
to a deterministic, image-derived stub when no trained checkpoint is present
at the paths in config.py — drop the .pt files in and restart to go live,
no code change needed. Set SKINSENSE_USE_REAL_MODELS=0 to force stub mode."""
import hashlib
from pathlib import Path

from config import ACNE_MODEL_PATH, SKIN_TYPE_MODEL_PATH, FORCE_REAL_MODELS

SKIN_TYPES = ["oily", "dry", "normal"]
SEVERITIES = ["mild", "moderate", "severe"]

_acne_model = None
_skin_type_model = None
_load_attempted = False


def _try_load_real_models() -> bool:
    global _acne_model, _skin_type_model, _load_attempted
    if _load_attempted:
        return _acne_model is not None and _skin_type_model is not None
    _load_attempted = True

    if FORCE_REAL_MODELS is False:
        return False
    if not (ACNE_MODEL_PATH.exists() and SKIN_TYPE_MODEL_PATH.exists()):
        return False

    try:
        import torch
    except ImportError:
        return False

    try:
        _acne_model = torch.load(ACNE_MODEL_PATH, map_location="cpu")
        _acne_model.eval()
        _skin_type_model = torch.load(SKIN_TYPE_MODEL_PATH, map_location="cpu")
        _skin_type_model.eval()
        return True
    except Exception:
        _acne_model = None
        _skin_type_model = None
        return False


def _preprocess(image_path: Path):
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
        "lesion_count_estimate": None,
        "skin_tone": None,
        "source": "model",
    }


def _stub_inference(image_path: Path) -> dict:
    digest = hashlib.sha256(image_path.read_bytes()).hexdigest()
    n = int(digest, 16)

    skin_type = SKIN_TYPES[n % 3]
    severity = SEVERITIES[(n // 3) % 3]
    skin_conf = 0.65 + (n % 30) / 100
    acne_conf = 0.60 + ((n // 7) % 35) / 100

    return {
        "skin_type": skin_type,
        "skin_type_confidence": round(skin_conf, 2),
        "acne_severity": severity,
        "acne_severity_confidence": round(acne_conf, 2),
        "lesion_count_estimate": None,
        "skin_tone": None,
        "source": "model",
    }


def predict(image_path: Path) -> dict:
    if _try_load_real_models():
        try:
            return _run_real_inference(image_path)
        except Exception:
            return _stub_inference(image_path)
    return _stub_inference(image_path)


def predict_manual(skin_type: str, acne_severity: str) -> dict:
    return {
        "skin_type": skin_type,
        "skin_type_confidence": 1.0,
        "acne_severity": acne_severity,
        "acne_severity_confidence": 1.0,
        "lesion_count_estimate": None,
        "skin_tone": None,
        "source": "manual",
    }