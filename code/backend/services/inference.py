"""Runs acne-severity and skin-type inference on a stored image, using the real
trained checkpoints when present.

Acne severity falls back to a deterministic, image-derived stub when its
checkpoint can't be loaded, so it is always available. Skin type has no such
stub — a photo-based guess with no model behind it would be worse than asking
the user — so predict_skin_type() returns None when its checkpoint, torch or
mediapipe isn't available, or the stored image doesn't have exactly one
detectable face, and the caller (routers/analysis.py) falls back to requiring
skin_type in the request (see predict_manual and the skin_type field on
PredictRequest). Set SKINSENSE_USE_REAL_MODELS=0 to force stub/fallback mode
for both models."""
import hashlib
from pathlib import Path

from config import ACNE_MODEL_PATH, FORCE_REAL_MODELS, SKIN_TYPE_MODEL_PATH

SEVERITIES = ["mild", "moderate", "severe"]

_acne_model = None
_load_attempted = False


def _build_flat_resnet50(num_classes: int = 3):
    """Standard torchvision layout: conv1, bn1, layer1..layer4, fc."""
    from torchvision.models import resnet50
    import torch.nn as nn
    model = resnet50(weights=None)
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    return model


class _FeatureWrappedResNet50:
    """Matches a training script that wrapped the backbone as
    nn.Sequential(*list(resnet50().children())[:-2]) under `self.features`,
    with a separate `self.fc` head — a common Kaggle/tutorial pattern. This
    is what resnet50_acne.pt was actually saved as."""
    @staticmethod
    def build(num_classes: int = 3):
        from torchvision.models import resnet50
        import torch.nn as nn

        class Wrapped(nn.Module):
            def __init__(self):
                super().__init__()
                base = resnet50(weights=None)
                self.features = nn.Sequential(*list(base.children())[:-2])
                self.avgpool = nn.AdaptiveAvgPool2d((1, 1))
                self.fc = nn.Linear(2048, num_classes)

            def forward(self, x):
                import torch
                x = self.features(x)
                x = self.avgpool(x)
                x = torch.flatten(x, 1)
                return self.fc(x)

        return Wrapped()


def _try_load_acne_model() -> bool:
    global _acne_model, _load_attempted
    if _load_attempted:
        return _acne_model is not None
    _load_attempted = True

    if FORCE_REAL_MODELS is False:
        return False
    if not ACNE_MODEL_PATH.exists():
        return False

    try:
        import torch
    except ImportError:
        return False

    try:
        obj = torch.load(ACNE_MODEL_PATH, map_location="cpu", weights_only=False)
    except Exception as exc:
        print(f"[inference] Failed to read acne checkpoint file: {exc}")
        return False

    if hasattr(obj, "eval"):
        # A full model object was saved directly.
        _acne_model = obj
        _acne_model.eval()
        return True

    # A bare state_dict was saved — try the wrapped layout first, since
    # that's what this checkpoint's key names ("features.0", "features.4"...)
    # actually match, then fall back to the flat torchvision layout.
    for builder, label in [
        (_FeatureWrappedResNet50.build, "feature-wrapped"),
        (_build_flat_resnet50, "flat"),
    ]:
        try:
            model = builder(num_classes=3)
            model.load_state_dict(obj)
            model.eval()
            _acne_model = model
            print(f"[inference] Loaded acne checkpoint using {label} architecture.")
            return True
        except Exception as exc:
            print(f"[inference] {label} architecture didn't match: {exc}")

    _acne_model = None
    return False


def _load_upright_rgb(image_path: Path):
    """Open the stored upload the way the user saw it.

    Phone cameras often save pixels sideways and record the real orientation
    in an EXIF tag. Browsers honour that tag in the preview, and
    photo_validation applies it before running MediaPipe, so the model must
    too or it grades a rotated face. Images with no orientation tag are
    returned unchanged, so their tensors are identical to before.
    """
    from PIL import Image, ImageOps

    with Image.open(image_path) as raw:
        return ImageOps.exif_transpose(raw).convert("RGB")


def _preprocess(image_path: Path):
    from torchvision import transforms

    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    image = _load_upright_rgb(image_path)
    return transform(image).unsqueeze(0)


def _run_real_acne_inference(image_path: Path) -> dict:
    import torch

    tensor = _preprocess(image_path)
    with torch.no_grad():
        logits = _acne_model(tensor)
        probs = torch.softmax(logits, dim=1)[0]
        idx = int(torch.argmax(probs))
        confidence = float(probs[idx])

    return {
        "acne_severity": SEVERITIES[idx],
        "acne_severity_confidence": round(confidence, 4),
        "lesion_count_estimate": None,
        "source": "model",
    }


def _stub_acne_inference(image_path: Path) -> dict:
    digest = hashlib.sha256(image_path.read_bytes()).hexdigest()
    n = int(digest, 16)

    severity = SEVERITIES[(n // 3) % 3]
    acne_conf = 0.60 + ((n // 7) % 35) / 100
    lesion_count = {"mild": 1 + n % 5, "moderate": 6 + n % 15, "severe": 21 + n % 25}[severity]

    return {
        "acne_severity": severity,
        "acne_severity_confidence": round(acne_conf, 2),
        "lesion_count_estimate": lesion_count,
        "source": "stub",
    }


def predict_acne(image_path: Path) -> dict:
    """Real acne-severity inference when the checkpoint loads, stub otherwise."""
    if _try_load_acne_model():
        try:
            return _run_real_acne_inference(image_path)
        except Exception as exc:
            print(f"[inference] Real inference failed, falling back to stub: {exc}")
            return _stub_acne_inference(image_path)
    return _stub_acne_inference(image_path)


def predict_manual(skin_type: str, acne_severity: str) -> dict:
    return {
        "skin_type": skin_type,
        "skin_type_confidence": 1.0,
        "skin_type_source": "manual",
        "acne_severity": acne_severity,
        "acne_severity_confidence": 1.0,
        "lesion_count_estimate": None,
        "skin_tone": None,
        "source": "manual",
    }

# --------------------------------------------------------------------------------
# Skin type (MobileNetV2, trained separately — see ml_models/skin_type/README.md)
# --------------------------------------------------------------------------------

_skin_model = None
_skin_classes: list[str] | None = None
_skin_preprocess_cfg: dict = {}
_skin_load_attempted = False


def _build_skin_type_model(num_classes: int):
    """Must match the training notebook exactly: MobileNetV2, ImageNet-initialised,
    classifier replaced with Dropout(0.3) + Linear(last_channel, num_classes)."""
    from torchvision.models import mobilenet_v2
    import torch.nn as nn

    model = mobilenet_v2(weights=None)
    model.classifier = nn.Sequential(nn.Dropout(0.3), nn.Linear(model.last_channel, num_classes))
    return model


def _try_load_skin_type_model() -> bool:
    global _skin_model, _skin_classes, _skin_preprocess_cfg, _skin_load_attempted
    if _skin_load_attempted:
        return _skin_model is not None
    _skin_load_attempted = True

    if FORCE_REAL_MODELS is False:
        return False
    if not SKIN_TYPE_MODEL_PATH.exists():
        return False

    try:
        import torch
    except ImportError:
        return False

    try:
        checkpoint = torch.load(SKIN_TYPE_MODEL_PATH, map_location="cpu", weights_only=False)
    except Exception as exc:
        print(f"[inference] Failed to read skin-type checkpoint file: {exc}")
        return False

    try:
        classes = checkpoint["classes"]
        state_dict = checkpoint["state_dict"]
        model = _build_skin_type_model(num_classes=len(classes))
        model.load_state_dict(state_dict)
        model.eval()
    except Exception as exc:
        print(f"[inference] Skin-type checkpoint didn't match the expected format: {exc}")
        return False

    _skin_model = model
    _skin_classes = list(classes)
    _skin_preprocess_cfg = dict(checkpoint.get("preprocess") or {})
    print(f"[inference] Loaded skin-type checkpoint. classes={_skin_classes} "
          f"val_balanced_acc={checkpoint.get('val_balanced_acc')} "
          f"test_balanced_acc={checkpoint.get('test_balanced_acc')}")
    return True


def _skin_type_tensor(image_path: Path, landmarks):
    """Build the model input exactly like training: shared skin_preprocess, then plain
    ToTensor + ImageNet normalize (the crop is already 224x224, so no resize here)."""
    from torchvision import transforms
    from services import skin_preprocess as sp

    image = _load_upright_rgb(image_path)
    sharpness_target = _skin_preprocess_cfg.get("sharpness_target")
    crop = sp.preprocess(image, landmarks, sharpness_target=sharpness_target)

    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    return transform(crop).unsqueeze(0)


def _run_real_skin_type_inference(image_path: Path, landmarks) -> dict:
    import torch

    tensor = _skin_type_tensor(image_path, landmarks)
    with torch.no_grad():
        logits = _skin_model(tensor)
        probs = torch.softmax(logits, dim=1)[0]
        idx = int(torch.argmax(probs))
        confidence = float(probs[idx])

    return {
        "skin_type": _skin_classes[idx],
        "skin_type_confidence": round(confidence, 4),
        "skin_type_source": "model",
    }


def predict_skin_type(image_path: Path) -> dict | None:
    """Real skin-type inference, or None if it can't be run right now (no checkpoint,
    torch/mediapipe unavailable, or the stored image has no single detectable face).

    The caller must treat None as "ask the user for skin_type", not as an error to
    surface directly — see routers/analysis.py.
    """
    if not _try_load_skin_type_model():
        return None

    from services import photo_validation

    landmarks = photo_validation.get_face_landmarks(image_path.read_bytes())
    if landmarks is None:
        return None

    try:
        return _run_real_skin_type_inference(image_path, landmarks)
    except Exception as exc:
        print(f"[inference] Real skin-type inference failed: {exc}")
        return None


def skin_type_model_available() -> bool:
    """Cheap capability check (does not force a load) — used by tests and, if needed,
    a future "is the model up" indicator. Loading only happens on first real use."""
    if FORCE_REAL_MODELS is False:
        return False
    return SKIN_TYPE_MODEL_PATH.exists()
