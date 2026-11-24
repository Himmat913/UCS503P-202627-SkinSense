"""Request/response schemas for POST /api/feedback."""
from typing import Optional

from pydantic import BaseModel, Field


class FeedbackRequest(BaseModel):
    clarity_rating: int = Field(..., ge=1, le=5)
    comment: str = Field(default="", max_length=2000)
    skin_type: Optional[str] = Field(default=None, max_length=16)
    acne_severity: Optional[str] = Field(default=None, max_length=16)
    engine_version: Optional[str] = Field(default=None, max_length=32)
    product_count: Optional[int] = Field(default=None, ge=0)


class FeedbackResponse(BaseModel):
    id: int
    received: bool = True
