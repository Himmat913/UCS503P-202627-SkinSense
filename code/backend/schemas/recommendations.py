"""
Request/response schemas for POST /api/recommendations.

Shapes are frozen per docs/planning/work-division.md §4.1 — the frontend's
src/api/client.js and src/api/mock.js already assume exactly this shape, so
changing a field name here breaks the frontend silently. Change the contract
in the planning doc first, then here, then in the frontend.
"""
from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field, field_validator


class RecommendationRequest(BaseModel):
    skin_type: str = Field(..., description="oily | dry | normal")
    acne_severity: str = Field(..., description="mild | moderate | severe")
    allergies: list[str] = Field(default_factory=list)
    budget_max: Optional[int] = Field(default=None, description="Per-product ceiling in INR; null = no ceiling")
    max_products: int = Field(default=8, ge=1, le=20)

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

    @field_validator("allergies")
    @classmethod
    def _lowercase_allergies(cls, v: list[str]) -> list[str]:
        return [a.strip().lower() for a in v if a.strip()]


class ProductOut(BaseModel):
    id: str
    name: str
    brand: str
    category: str
    price: int
    currency: str = "INR"
    key_ingredients: list[str]
    reasons: list[str]
    match_score: float


class ExcludedOut(BaseModel):
    id: str
    name: str
    reason: str


class RoutineOut(BaseModel):
    am: list[str]
    pm: list[str]


class RecommendationResponse(BaseModel):
    engine_version: str
    products: list[ProductOut]
    routine: RoutineOut
    excluded: list[ExcludedOut]
    notes: list[str] = Field(default_factory=list)


class IngredientOut(BaseModel):
    name: str
    type: str
    role: str
    caution: str


class ConflictOut(BaseModel):
    a: str
    b: str
    severity: str
    reason: str
    handling: str


class IngredientsResponse(BaseModel):
    ingredients: list[IngredientOut]
    conflicts: list[ConflictOut]
    catalog_version: str
