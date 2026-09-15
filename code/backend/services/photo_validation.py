"""Photo validation stub. Real MediaPipe implementation (face count, head
angle, brightness, blur) replaces this wholesale — the frozen signature
below stays the same either way."""
VALIDATOR_VERSION = "stub-0.1"


def validate_photo(image_bytes: bytes) -> dict:
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