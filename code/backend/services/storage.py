"""Stores uploaded images and hands back an image_id."""
import uuid
from pathlib import Path

from fastapi import UploadFile

from config import UPLOAD_DIR


def _extension_for(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    return suffix if suffix in (".jpg", ".jpeg", ".png", ".webp") else ".jpg"


async def save_upload(file: UploadFile) -> tuple[str, Path]:
    image_id = f"img_{uuid.uuid4().hex[:12]}"
    dest = UPLOAD_DIR / f"{image_id}{_extension_for(file.filename or '')}"
    contents = await file.read()
    dest.write_bytes(contents)
    return image_id, dest


def path_for(image_id: str) -> Path | None:
    matches = list(UPLOAD_DIR.glob(f"{image_id}.*"))
    return matches[0] if matches else None