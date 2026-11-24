"""Shared skin-type preprocessing: used by BOTH the training notebook and this backend.
This file must stay byte-for-byte identical to the copy used to train the checkpoint in
ml_models/skin_type/ — any change here changes what the model sees and invalidates it.

preprocess(img, landmarks) -> 224x224 RGB image containing only skin:
  1. rotate so the eyes are level,
  2. crop around the face and scale width and height separately, so every face fills the
     square the same way (removes stretched sources and face-shape differences),
  3. paint everything that is not skin (outside the face outline, eyes and eyebrows,
     lips and mouth, the top of the forehead where hair/hats usually are) with the
     ImageNet mean colour, so it becomes ~0 after normalization,
  4. if a sharpness target is set, blur sharper faces down to that target, so the model
     cannot tell sources apart by how sharp the photo is.

Inputs:
  img        PIL.Image, already EXIF-transposed, any size
  landmarks  array (468, >=2) of MediaPipe FaceMesh landmarks, normalized x,y in [0,1]
             (relative to img; normalized coords do not depend on the image being resized)

Only numpy and Pillow are needed, so it runs on Kaggle (Python 3.13) and in the backend (3.11).
"""
from __future__ import annotations

import math

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

VERSION = "skin-preprocess-2"
OUT_SIZE = 224
MARGIN = 0.05                  # extra space around the face box, per side, as a fraction of its size
FILL = (124, 116, 104)         # ImageNet mean RGB -> ~0 after normalization
EXCLUDE_GROW_PX = 9            # how far the eye/brow/lip masks are grown (odd number, in output pixels)
OVAL_SHRINK_PX = 5             # shrink the face outline slightly to drop hairline/background edge pixels
FOREHEAD_KEEP = 0.6            # keep this fraction of the forehead (brows -> top of outline); the top part is
                               # often hair, a fringe or a hat
NORMALIZE_ASPECT = True        # scale x and y separately so the face outline fills the square
SHARPNESS_TARGET = None        # set from the training data (see preprocess_config.json); None = no blurring
SHARPNESS_CORE_PX = 7          # skin mask is shrunk by this before measuring sharpness (avoids mask edges)

# MediaPipe FaceMesh landmark indices
FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377,
             152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
LIPS_OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185]
EYE_A = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
EYE_B = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]
BROW_A = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46]
BROW_B = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276]
EYE_A_CORNERS = [33, 133]
EYE_B_CORNERS = [362, 263]


def _convex_hull(points: np.ndarray) -> list[tuple[float, float]]:
    """Monotone-chain convex hull of 2D points."""
    pts = sorted(map(tuple, points.tolist()))
    if len(pts) <= 2:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def align_crop(img: Image.Image, landmarks: np.ndarray, size: int = OUT_SIZE):
    """Rotate (eyes level), crop a square around the face, resize to `size`.

    Returns (aligned RGB image, landmarks in output pixel coordinates (468, 2), roll angle in degrees,
    boolean array of output pixels that come from inside the original photo).
    """
    img = img.convert("RGB")
    W, H = img.size
    p = landmarks[:, :2].astype(np.float64) * [W, H]               # landmark pixels in the input image

    eye_a = p[EYE_A_CORNERS].mean(axis=0)
    eye_b = p[EYE_B_CORNERS].mean(axis=0)
    left, right = (eye_a, eye_b) if eye_a[0] <= eye_b[0] else (eye_b, eye_a)
    theta = math.atan2(right[1] - left[1], right[0] - left[0])     # roll of the eye line
    c, s = math.cos(theta), math.sin(theta)
    rot = np.array([[c, s], [-s, c]])                                # rotates by -theta (levels the eyes)

    q = p @ rot.T                                                    # all landmarks, rotated frame
    oval = q[FACE_OVAL]
    lo, hi = oval.min(axis=0), oval.max(axis=0)
    center = (lo + hi) / 2
    extent = (hi - lo) * (1 + 2 * MARGIN)
    sides = extent if NORMALIZE_ASPECT else np.array([extent.max(), extent.max()])

    # Downscale very large inputs first so the affine resample is not aliased.
    if sides.max() > 2 * size:
        f = (2 * size) / sides.max()
        img = img.resize((max(1, round(W * f)), max(1, round(H * f))), Image.LANCZOS)
        p, q, center, sides = p * f, q * f, center * f, sides * f

    kx, ky = sides / size                                            # input pixels per output pixel (x, y)
    inv = rot.T                                                      # rotates by +theta
    corner = center - sides / 2
    origin = inv @ corner                                            # input point mapped to output (0, 0)
    coeffs = (kx * inv[0, 0], ky * inv[0, 1], origin[0], kx * inv[1, 0], ky * inv[1, 1], origin[1])
    out = img.transform((size, size), Image.AFFINE, coeffs, resample=Image.BICUBIC, fillcolor=FILL)
    inside = np.asarray(Image.new("L", img.size, 255).transform((size, size), Image.AFFINE, coeffs,
                                                                resample=Image.NEAREST, fillcolor=0)) > 0
    lm_out = (q - corner) / np.array([kx, ky])
    return out, lm_out, math.degrees(theta), inside


def skin_mask(lm_out: np.ndarray, size: int = OUT_SIZE, inside: np.ndarray | None = None) -> np.ndarray:
    """Boolean mask (size, size): True where the pixel is skin we want the model to see.

    `inside` (from align_crop) removes pixels that were outside the original photo.
    """
    keep = Image.new("L", (size, size), 0)
    ImageDraw.Draw(keep).polygon([tuple(xy) for xy in lm_out[FACE_OVAL]], fill=255)
    if OVAL_SHRINK_PX > 1:
        keep = keep.filter(ImageFilter.MinFilter(OVAL_SHRINK_PX))

    excl = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(excl)
    for idx in (EYE_A + BROW_A, EYE_B + BROW_B, LIPS_OUTER):
        draw.polygon(_convex_hull(lm_out[idx]), fill=255)
    if EXCLUDE_GROW_PX > 1:
        excl = excl.filter(ImageFilter.MaxFilter(EXCLUDE_GROW_PX))

    mask = (np.asarray(keep) > 127) & ~(np.asarray(excl) > 127)

    # Cap the forehead: keep only FOREHEAD_KEEP of the distance from the brows up to the outline top.
    brow_top = lm_out[BROW_A + BROW_B, 1].min()
    oval_top = lm_out[FACE_OVAL, 1].min()
    cut = int(round(brow_top - FOREHEAD_KEEP * (brow_top - oval_top)))
    if cut > 0:
        mask[:min(cut, size)] = False
    if inside is not None:
        mask &= inside
    return mask


def skin_sharpness(img: Image.Image, mask: np.ndarray) -> float:
    """Variance of the Laplacian over the inner skin area (higher = sharper)."""
    core = np.asarray(Image.fromarray(mask.astype(np.uint8) * 255).filter(ImageFilter.MinFilter(SHARPNESS_CORE_PX))) > 127
    g = np.asarray(img.convert("L"), np.float32)
    lap = -4 * g[1:-1, 1:-1] + g[:-2, 1:-1] + g[2:, 1:-1] + g[1:-1, :-2] + g[1:-1, 2:]
    core = core[1:-1, 1:-1]
    return float(lap[core].var()) if core.sum() > 50 else float("nan")


def match_sharpness(img: Image.Image, mask: np.ndarray, target: float, iters: int = 12):
    """Gaussian-blur `img` just enough that its skin sharpness drops to `target`. Never sharpens."""
    s0 = skin_sharpness(img, mask)
    if not (s0 > target):
        return img, s0, 0.0
    lo, hi = 0.0, 6.0
    best = img.filter(ImageFilter.GaussianBlur(hi))
    for _ in range(iters):
        mid = (lo + hi) / 2
        cand = img.filter(ImageFilter.GaussianBlur(mid))
        if skin_sharpness(cand, mask) > target:
            lo = mid
        else:
            hi, best = mid, cand
    return best, s0, hi


def preprocess(img: Image.Image, landmarks: np.ndarray, size: int = OUT_SIZE, return_details: bool = False,
               sharpness_target: float | None = "default"):
    """Align, crop, mask and (optionally) match sharpness. Returns the 224x224 RGB model input."""
    if sharpness_target == "default":
        sharpness_target = SHARPNESS_TARGET
    aligned, lm_out, roll, inside = align_crop(img, landmarks, size)
    mask = skin_mask(lm_out, size, inside)
    if sharpness_target is not None:
        aligned, sharp_before, blur_radius = match_sharpness(aligned, mask, sharpness_target)
    else:
        sharp_before, blur_radius = skin_sharpness(aligned, mask), 0.0
    arr = np.asarray(aligned).copy()
    arr[~mask] = FILL
    masked = Image.fromarray(arr)
    if return_details:
        return masked, {"aligned": aligned, "mask": mask, "landmarks": lm_out, "roll_deg": roll,
                        "skin_fraction": float(mask.mean()), "sharpness_before": sharp_before,
                        "sharpness_after": skin_sharpness(aligned, mask), "blur_radius": blur_radius}
    return masked
