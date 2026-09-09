"""
POST /api/upload and POST /api/predict.

Ownership: Himant (backend integration lead). Shapes are frozen per
docs/planning/work-division.md §4.3.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, UploadFile, File

from schemas.analysis import PredictRequest, PredictResponse, UploadResponse, ValidationResult
from services import storage, inference, referral, photo_validation
from config import MAX_UPLOAD_BYTES

router = APIRouter(prefix="/api", tags=["analysis"])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post("/upload", response_model=UploadResponse)
async def upload_photo(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="File must be a JPG, PNG, or WEBP image.")

    # Peek the size without fully trusting the client-reported content-length.
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Image exceeds the 10 MB limit.")
    await file.seek(0)

    image_id, dest_path = await storage.save_upload(file)
    validation_dict = photo_validation.validate_photo(contents)

    return UploadResponse(
        image_id=image_id,
        filename=file.filename or "",
        validation=ValidationResult(**validation_dict),
    )


@router.post("/predict", response_model=PredictResponse)
async def predict(payload: PredictRequest):
    if payload.manual is not None:
        result = inference.predict_manual(payload.manual.skin_type, payload.manual.acne_severity)
        result["image_id"] = None
    else:
        image_path = storage.path_for(payload.image_id)
        if image_path is None:
            raise HTTPException(status_code=404, detail=f"No stored image for image_id '{payload.image_id}'.")
        result = inference.predict(image_path)
        result["image_id"] = payload.image_id

    referral_result = referral.compute_referral(
        acne_severity=result["acne_severity"],
        skin_type_confidence=result["skin_type_confidence"],
        acne_severity_confidence=result["acne_severity_confidence"],
    )
    result["referral"] = referral_result

    return PredictResponse(**result)
