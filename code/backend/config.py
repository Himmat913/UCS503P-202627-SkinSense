"""
App-wide configuration. Single source of truth for paths and feature flags —
services import from here rather than hardcoding paths, so moving a model
checkpoint or changing a threshold is a one-line change.
"""
from __future__ import annotations

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent

# ------------------------------------------------------------- storage
UPLOAD_DIR = BACKEND_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB, matches the frontend's own limit

# ------------------------------------------------------------- ML models
# Real inference turns on automatically the moment a checkpoint file appears
# at these paths — see services/inference.py. No code change needed to go
# from stub to real; just drop the .pt file in and restart.
ACNE_MODEL_PATH = BACKEND_DIR / "ml_models" / "acne" / "resnet50_acne.pt"
SKIN_TYPE_MODEL_PATH = BACKEND_DIR / "ml_models" / "skin_type" / "mobilenetv2_skintype.pt"

# Explicit override: set SKINSENSE_USE_REAL_MODELS=0 to force stub mode even
# if checkpoints are present (useful for demos where you want deterministic
# output). Unset or "1" means "auto-detect from checkpoint presence".
_force_flag = os.environ.get("SKINSENSE_USE_REAL_MODELS")
FORCE_REAL_MODELS: bool | None = None if _force_flag is None else _force_flag == "1"

# ------------------------------------------------------------- referral
LOW_CONFIDENCE_THRESHOLD = 0.60

# ------------------------------------------------------------- CORS
FRONTEND_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
_extra_origin = os.environ.get("SKINSENSE_FRONTEND_ORIGIN")
if _extra_origin:
    FRONTEND_ORIGINS.append(_extra_origin)
