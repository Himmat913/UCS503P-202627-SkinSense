"""
Stores uploaded images and hands back an image_id. Local filesystem for dev;
swapping to S3-compatible storage later only touches this file — nothing
above it (the router) knows or cares where bytes actually live.
"""
from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import UploadFile

from config import UPLOAD_DIR


def _extension_for(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    return suffix if suffix in (".jpg", ".jpeg", ".png", ".webp") else ".jpg"


async def save_upload(file: UploadFile) -> tuple[str, Path]:
    """Writes the upload to disk and returns (image_id, path_on_disk)."""
    image_id = f"img_{uuid.uuid4().hex[:12]}"
    dest = UPLOAD_DIR / f"{image_id}{_extension_for(file.filename or '')}"
    contents = await file.read()
    dest.write_bytes(contents)
    return image_id, dest


def path_for(image_id: str) -> Path | None:
    """Resolves an image_id back to its file on disk, regardless of which
    extension it was stored with. Returns None if it doesn't exist."""
    matches = list(UPLOAD_DIR.glob(f"{image_id}.*"))
    return matches[0] if matches else None
