"""Request/response schemas for POST /api/upload, POST /api/predict and GET /api/analyses."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator, model_validator


class ValidationResult(BaseModel):
    ok: bool
    reasons: list[str] = Field(default_factory=list)
    checks: dict = Field(default_factory=dict)
    validator_version: str


class UploadResponse(BaseModel):
    image_id: str
    filename: str
    validation: ValidationResult


class ManualInput(BaseModel):
    skin_type: str
    acne_severity: str

    @field_validator("skin_type")
    @classmethod
    def _valid_skin_type(cls, v: str) -> str:
        allowed = {"oily", "dry", "normal"}
        if v not in allowed:
            raise ValueError(f"skin_type must be one of {sorted(allowed)}")
        return v

    @field_validator("acne_severity")
    @classmethod
    def _valid_severity(cls, v: str) -> str:
        allowed = {"mild", "moderate", "severe"}
        if v not in allowed:
            raise ValueError(f"acne_severity must be one of {sorted(allowed)}")
        return v


class PredictRequest(BaseModel):
    image_id: Optional[str] = None
    # Optional manual override for the image path. Omit it to let the skin-type model
    # predict from the photo; the server falls back to requiring this (409) if no
    # model is available right now. Always required (via ManualInput) on the no-photo path.
    skin_type: Optional[str] = None
    manual: Optional[ManualInput] = None

    @field_validator("skin_type")
    @classmethod
    def _valid_skin_type_override(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        allowed = {"oily", "dry", "normal"}
        if v not in allowed:
            raise ValueError(f"skin_type must be one of {sorted(allowed)}")
        return v

    @model_validator(mode="after")
    def _exactly_one_source(self) -> "PredictRequest":
        if bool(self.image_id) == bool(self.manual):
            raise ValueError("Provide exactly one of image_id or manual, not both or neither.")
        if self.manual is not None and self.skin_type is not None:
            raise ValueError("skin_type override is only valid with image_id, not with manual.")
        return self


class SkinToneOut(BaseModel):
    undertone: str
    fitzpatrick: str
    hex: str
    note: str


class ReferralOut(BaseModel):
    needed: bool
    reasons: list[str] = Field(default_factory=list)


class PredictResponse(BaseModel):
    image_id: Optional[str] = None
    skin_type: str
    skin_type_confidence: float
    skin_type_source: str  # "model" | "manual" — independent of acne severity's `source`
    acne_severity: str
    acne_severity_confidence: float
    lesion_count_estimate: Optional[int] = None
    skin_tone: Optional[SkinToneOut] = None
    source: str  # acne severity's source: "model" | "stub" | "manual"
    referral: ReferralOut


class AnalysisHistoryItem(BaseModel):
    id: int
    created_at: datetime
    skin_type: str
    skin_type_confidence: float
    skin_type_source: str
    acne_severity: str
    acne_severity_confidence: float
    source: str
    referral_needed: bool


class AnalysisHistoryResponse(BaseModel):
    items: list[AnalysisHistoryItem]
    total: int
