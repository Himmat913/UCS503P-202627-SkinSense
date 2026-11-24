"""POST /api/upload, POST /api/predict and GET /api/analyses."""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File

from db.models import User, AnalysisResult
from db.session import session_scope

from schemas.analysis import (
    AnalysisHistoryItem,
    AnalysisHistoryResponse,
    PredictRequest,
    PredictResponse,
    UploadResponse,
    ValidationResult,
)

from services import storage, inference, referral, photo_validation
from services.auth import get_current_user
from config import MAX_UPLOAD_BYTES


router = APIRouter(prefix="/api", tags=["analysis"])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post("/upload", response_model=UploadResponse)
async def upload_photo(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="File must be a JPG, PNG, or WEBP image.",
        )

    contents = await file.read()

    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=400,
            detail="Image exceeds the 10 MB limit.",
        )

    await file.seek(0)

    image_id, dest_path = await storage.save_upload(file)

    validation_dict = photo_validation.validate_photo(contents)

    return UploadResponse(
        image_id=image_id,
        filename=file.filename or "",
        validation=ValidationResult(**validation_dict),
    )


@router.post("/predict", response_model=PredictResponse)
async def predict(
    payload: PredictRequest,
    user: User = Depends(get_current_user),
):
    # ---------------------------------------------------------
    # MANUAL ANALYSIS
    # ---------------------------------------------------------
    if payload.manual is not None:
        result = inference.predict_manual(
            payload.manual.skin_type,
            payload.manual.acne_severity,
        )

        result["image_id"] = None

    # ---------------------------------------------------------
    # IMAGE ANALYSIS
    # ---------------------------------------------------------
    else:
        image_path = storage.path_for(payload.image_id)

        if image_path is None:
            raise HTTPException(
                status_code=404,
                detail=f"No stored image for image_id '{payload.image_id}'.",
            )

        acne_result = inference.predict_acne(image_path)

        if payload.skin_type is not None:
            # Explicit override: always honoured, even if the model is also available.
            skin_result = {
                "skin_type": payload.skin_type,
                "skin_type_confidence": 1.0,
                "skin_type_source": "manual",
            }
        else:
            skin_result = inference.predict_skin_type(image_path)
            if skin_result is None:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "No skin-type model is available on the server right now. "
                        "Include skin_type in the request to continue."
                    ),
                )

        result = {
            "skin_tone": None,
            **skin_result,
            **acne_result,
        }

        result["image_id"] = payload.image_id

    # ---------------------------------------------------------
    # REFERRAL CALCULATION
    # ---------------------------------------------------------
    referral_result = referral.compute_referral(
        acne_severity=result["acne_severity"],
        skin_type_confidence=result["skin_type_confidence"],
        acne_severity_confidence=result["acne_severity_confidence"],
    )

    result["referral"] = referral_result

    # ---------------------------------------------------------
    # SAVE ANALYSIS RESULT TO DATABASE
    # ---------------------------------------------------------
    with session_scope() as session:
        analysis = AnalysisResult(
            user_id=user.id,
            image_id=result["image_id"],
            skin_type=result["skin_type"],
            skin_type_confidence=result["skin_type_confidence"],
            skin_type_source=result["skin_type_source"],
            acne_severity=result["acne_severity"],
            acne_severity_confidence=result["acne_severity_confidence"],
            lesion_count_estimate=result.get("lesion_count_estimate"),
            source=result["source"],
            referral_needed=1 if result["referral"]["needed"] else 0,
        )

        session.add(analysis)

    # ---------------------------------------------------------
    # RETURN RESULT TO FRONTEND
    # ---------------------------------------------------------
    return PredictResponse(**result)


@router.get("/analyses", response_model=AnalysisHistoryResponse)
def list_analyses(
    limit: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
):
    """The signed-in user's saved analyses, newest first. Only ever returns
    rows belonging to the caller."""
    with session_scope() as session:
        query = session.query(AnalysisResult).filter(AnalysisResult.user_id == user.id)
        total = query.count()
        rows = query.order_by(AnalysisResult.created_at.desc(), AnalysisResult.id.desc()).limit(limit).all()
        items = [
            AnalysisHistoryItem(
                id=row.id,
                created_at=row.created_at,
                skin_type=row.skin_type,
                skin_type_confidence=row.skin_type_confidence,
                skin_type_source=row.skin_type_source,
                acne_severity=row.acne_severity,
                acne_severity_confidence=row.acne_severity_confidence,
                source=row.source,
                referral_needed=bool(row.referral_needed),
            )
            for row in rows
        ]
    return AnalysisHistoryResponse(items=items, total=total)
