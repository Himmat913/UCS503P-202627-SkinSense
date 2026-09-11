"""
Photo validation.

OWNERSHIP NOTE: this file belongs to Muskan (docs/planning/work-division.md
§2.1) — the real MediaPipe implementation (face count, head angle,
brightness, blur) is her W6 task. This is a placeholder that satisfies the
frozen signature in §4.2 exactly, so the rest of the pipeline (upload ->
validate -> predict) is wired and testable today. When her real
implementation lands, this file is replaced wholesale — nothing that calls
validate_photo() needs to change, because the signature and return shape
don't change.

Do not extend this stub with partial real logic; either it's the full
MediaPipe implementation or it's this placeholder. A half-real validator is
worse than an honest stub, because it would fail unpredictably instead of
predictably.
"""
from __future__ import annotations

VALIDATOR_VERSION = "stub-0.1"


def validate_photo(image_bytes: bytes) -> dict:
    """Always passes. Real checks (face count, yaw, brightness, blur) land
    with Muskan's MediaPipe implementation."""
    return {
        "ok": True,
        "reasons": [],
        "checks": {
            "face_count": None,
            "brightness": None,
            "yaw_deg": None,
            "blur_score": None,
        },
        "validator_version": VALIDATOR_VERSION,
    }
