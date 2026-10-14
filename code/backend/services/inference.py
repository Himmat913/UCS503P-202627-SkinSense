"""Runs acne-severity inference on a stored image, using the real trained
checkpoint when present, falling back to a deterministic, image-derived stub
otherwise. Skin type is NOT model-predicted — no skin-type checkpoint is
trained yet, so it's always supplied manually (see predict_manual and the
skin_type field on PredictRequest), even when the acne read comes from a
real photo. Set SKINSENSE_USE_REAL_MODELS=0 to force stub mode."""
import hashlib
from pathlib import Path

from config import ACNE_MODEL_PATH, FORCE_REAL_MODELS

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
        "acne_severity": acne_severity,
        "acne_severity_confidence": 1.0,
        "lesion_count_estimate": None,
        "skin_tone": None,
        "source": "manual",
    }