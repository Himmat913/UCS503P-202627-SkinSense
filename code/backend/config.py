"""App configuration and feature flags."""
import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent

UPLOAD_DIR = BACKEND_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
MAX_UPLOAD_BYTES = 10 * 1024 * 1024

ACNE_MODEL_PATH = BACKEND_DIR / "ml_models" / "acne" / "resnet50_acne.pt"
SKIN_TYPE_MODEL_PATH = BACKEND_DIR / "ml_models" / "skin_type" / "mobilenetv2_skintype.pt"

_force_flag = os.environ.get("SKINSENSE_USE_REAL_MODELS")
FORCE_REAL_MODELS: bool | None = None if _force_flag is None else _force_flag == "1"

LOW_CONFIDENCE_THRESHOLD = 0.60

# Set SKINSENSE_JWT_SECRET to a real random value in staging/production —
# `python -c "import secrets; print(secrets.token_hex(32))"` generates one.
_DEV_ONLY_INSECURE_DEFAULT = "dev-only-insecure-secret-change-me-a1b2c3"
JWT_SECRET_KEY = os.environ.get("SKINSENSE_JWT_SECRET", _DEV_ONLY_INSECURE_DEFAULT)
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7
USING_DEV_JWT_SECRET = JWT_SECRET_KEY == _DEV_ONLY_INSECURE_DEFAULT

FRONTEND_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
_extra_origin = os.environ.get("SKINSENSE_FRONTEND_ORIGIN")
if _extra_origin:
    FRONTEND_ORIGINS.append(_extra_origin)