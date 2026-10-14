"""Photo validation (UC-03): decide whether an uploaded selfie is usable
before it reaches the acne model.

Checks, in order: image decodes -> exactly one face -> face fully in frame and
large enough -> head angle (yaw) -> brightness -> sharpness. Every failed check
adds one plain-language reason the frontend shows to the user.

Frozen contract (do not change): validate_photo(image_bytes) -> dict with keys
ok, reasons, checks, validator_version. `checks` may gain extra keys.

Face landmarks come from MediaPipe FaceMesh (legacy `mp.solutions` API, which
ships its models inside the wheel, so no model download is needed). If mediapipe
cannot be imported the validator degrades to "pass everything" and says so in
validator_version, so a broken install never blocks the demo.
"""
from __future__ import annotations

import io
import logging
import math
import threading

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

logger = logging.getLogger(__name__)

VALIDATOR_VERSION = "mediapipe-0.1"
UNAVAILABLE_VERSION = "mediapipe-unavailable"

# --- Thresholds (tune against real selfies; plain numbers on purpose) ---
MAX_SIDE_PX = 640              # images are downscaled to this before analysis
MIN_FACE_AREA_FRACTION = 0.08  # face box / image area; below this -> "move closer"
MAX_YAW_DEG = 25.0             # head turned more than this -> reject
MIN_BRIGHTNESS = 45.0          # mean luminance (0-255) of the face region
MAX_BRIGHTNESS = 215.0
MIN_BLUR_SCORE = 10.0          # variance of Laplacian on a 256px face crop (sharp ~30+, blurred <5)
FACE_CROP_PX = 256
EDGE_MARGIN = 0.01             # allow the face box to touch the frame by this much

# FaceMesh landmark indices: nose tip and the two outermost cheek points.
_NOSE_TIP = 1
_CHEEK_A = 234
_CHEEK_B = 454

_mesh = None
_mesh_failed = False
_mesh_lock = threading.Lock()


def _get_mesh():
    """Create the FaceMesh once, lazily. Returns None if mediapipe is missing."""
    global _mesh, _mesh_failed
    if _mesh is not None or _mesh_failed:
        return _mesh
    with _mesh_lock:
        if _mesh is None and not _mesh_failed:
            try:
                import mediapipe as mp

                _mesh = mp.solutions.face_mesh.FaceMesh(
                    static_image_mode=True,
                    max_num_faces=2,  # 2 is enough to detect "more than one face"
                    refine_landmarks=False,
                    min_detection_confidence=0.5,
                )
            except Exception as exc:  # ImportError, missing solutions API, etc.
                logger.warning("MediaPipe unavailable, photo validation disabled: %s", exc)
                _mesh_failed = True
    return _mesh


def _detect_faces(rgb: np.ndarray):
    """Return one (468, 3) array of normalised (x, y, z) landmarks per face.

    Returns None when MediaPipe is unavailable. Kept as its own function so
    tests can replace it without needing mediapipe or a real face photo.
    """
    mesh = _get_mesh()
    if mesh is None:
        return None
    with _mesh_lock:  # FaceMesh instances are not thread-safe
        result = mesh.process(rgb)
    if not result.multi_face_landmarks:
        return []
    return [
        np.array([[p.x, p.y, p.z] for p in face.landmark], dtype=np.float32)
        for face in result.multi_face_landmarks
    ]


def _load_rgb(image_bytes: bytes):
    """Decode, fix phone-camera EXIF rotation, downscale, return RGB uint8."""
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img = ImageOps.exif_transpose(img).convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError):
        return None
    if max(img.size) > MAX_SIDE_PX:
        scale = MAX_SIDE_PX / max(img.size)
        img = img.resize(
            (max(1, round(img.width * scale)), max(1, round(img.height * scale))),
            Image.LANCZOS,
        )
    return np.asarray(img)


def _estimate_yaw_deg(landmarks: np.ndarray) -> float:
    """Approximate absolute head yaw from where the nose sits between the cheeks.

    Frontal face: nose midway between the cheek edges -> 0 degrees. As the head
    turns, the nose shifts toward one cheek; asin of that offset (relative to
    half the face width) gives a rough angle. An estimate, not a measurement.
    """
    nose_x = float(landmarks[_NOSE_TIP, 0])
    a_x = float(landmarks[_CHEEK_A, 0])
    b_x = float(landmarks[_CHEEK_B, 0])
    half_width = abs(b_x - a_x) / 2.0
    if half_width < 1e-6:
        return 90.0
    mid = (a_x + b_x) / 2.0
    offset = max(-1.0, min(1.0, (nose_x - mid) / half_width))
    return abs(math.degrees(math.asin(offset)))


def _face_box(landmarks: np.ndarray):
    """Normalised bounding box (x0, y0, x1, y1) of the landmarks."""
    xs, ys = landmarks[:, 0], landmarks[:, 1]
    return float(xs.min()), float(ys.min()), float(xs.max()), float(ys.max())


def _crop_gray(rgb: np.ndarray, box) -> np.ndarray:
    h, w = rgb.shape[:2]
    x0 = max(0, int(box[0] * w))
    y0 = max(0, int(box[1] * h))
    x1 = min(w, max(x0 + 1, int(box[2] * w)))
    y1 = min(h, max(y0 + 1, int(box[3] * h)))
    crop = Image.fromarray(rgb[y0:y1, x0:x1]).convert("L")
    return np.asarray(crop.resize((FACE_CROP_PX, FACE_CROP_PX), Image.LANCZOS), dtype=np.float32)


def _brightness(gray_crop: np.ndarray) -> float:
    return float(gray_crop.mean())


def _blur_score(gray_crop: np.ndarray) -> float:
    """Variance of the Laplacian: higher = sharper."""
    g = gray_crop
    lap = -4.0 * g[1:-1, 1:-1] + g[:-2, 1:-1] + g[2:, 1:-1] + g[1:-1, :-2] + g[1:-1, 2:]
    return float(lap.var())


def _result(ok: bool, reasons: list, checks: dict, version: str = VALIDATOR_VERSION) -> dict:
    return {"ok": ok, "reasons": reasons, "checks": checks, "validator_version": version}


def validate_photo(image_bytes: bytes) -> dict:
    checks: dict = {
        "face_count": None,
        "brightness": None,
        "yaw_deg": None,
        "blur_score": None,
        "face_area_fraction": None,
    }

    rgb = _load_rgb(image_bytes)
    if rgb is None:
        return _result(False, ["We couldn't read that file as an image. Try a different JPG or PNG."], checks)

    faces = _detect_faces(rgb)
    if faces is None:  # MediaPipe not installed/loadable
        return _result(True, [], checks, UNAVAILABLE_VERSION)

    checks["face_count"] = len(faces)
    if len(faces) == 0:
        return _result(False, ["No face detected. Face the camera directly with your whole face in frame."], checks)
    if len(faces) > 1:
        return _result(False, ["More than one face detected. Take a photo with only you in it."], checks)

    landmarks = faces[0]
    box = _face_box(landmarks)
    x0, y0, x1, y1 = box
    area_fraction = max(0.0, (x1 - x0) * (y1 - y0))
    checks["face_area_fraction"] = round(area_fraction, 3)

    reasons: list = []

    if x0 < -EDGE_MARGIN or y0 < -EDGE_MARGIN or x1 > 1 + EDGE_MARGIN or y1 > 1 + EDGE_MARGIN:
        reasons.append("Your face is cut off at the edge of the photo. Keep your whole face inside the frame.")
    elif area_fraction < MIN_FACE_AREA_FRACTION:
        reasons.append("Your face is too small in the photo. Move closer to the camera.")

    yaw = _estimate_yaw_deg(landmarks)
    checks["yaw_deg"] = round(yaw, 1)
    if yaw > MAX_YAW_DEG:
        reasons.append("Your face is turned too far to the side. Look straight at the camera.")

    gray = _crop_gray(rgb, box)

    brightness = _brightness(gray)
    checks["brightness"] = round(brightness, 1)
    if brightness < MIN_BRIGHTNESS:
        reasons.append("The photo is too dark. Retake it in brighter, even light.")
    elif brightness > MAX_BRIGHTNESS:
        reasons.append("The photo is too bright or washed out. Avoid direct glare or flash.")

    blur = _blur_score(gray)
    checks["blur_score"] = round(blur, 1)
    if blur < MIN_BLUR_SCORE:
        reasons.append("The photo is blurry. Hold the camera steady and tap to focus.")

    return _result(not reasons, reasons, checks)


if __name__ == "__main__":
    # Calibration helper:  py -m services.photo_validation photo1.jpg photo2.jpg
    import json
    import sys

    for path in sys.argv[1:]:
        with open(path, "rb") as fh:
            print(path)
            print(json.dumps(validate_photo(fh.read()), indent=2))
