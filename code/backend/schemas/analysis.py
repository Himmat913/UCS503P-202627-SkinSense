"""
Request/response schemas for POST /api/upload and POST /api/predict.

Shapes are frozen per docs/planning/work-division.md §4.3. The `manual` block
is what powers the permanent no-photo fallback path in the frontend — it is
not a temporary scaffolding measure, so its shape is held to the same
stability bar as the rest of this contract.
"""
from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field, field_validator, model_validator


# --------------------------------------------------------------- /api/upload

class ValidationResult(BaseModel):
    ok: bool
    reasons: list[str] = Field(default_factory=list)
    checks: dict = Field(default_factory=dict)
    validator_version: str


class UploadResponse(BaseModel):
    image_id: str
    filename: str
    validation: ValidationResult


# -------------------------------------------------------------- /api/predict

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
    manual: Optional[ManualInput] = None

    @model_validator(mode="after")
    def _exactly_one_source(self) -> "PredictRequest":
        if bool(self.image_id) == bool(self.manual):
            raise ValueError("Provide exactly one of image_id or manual, not both or neither.")
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
    acne_severity: str
    acne_severity_confidence: float
    lesion_count_estimate: Optional[int] = None
    skin_tone: Optional[SkinToneOut] = None
    source: str  # "model" | "manual" | "stub"
    referral: ReferralOut
