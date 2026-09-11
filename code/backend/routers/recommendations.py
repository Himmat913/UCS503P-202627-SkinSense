"""
POST /api/recommendations and GET /api/ingredients.

Ownership: Ansh (recommendation engine + product database). Per the
crossing-point protocol in work-division.md §3, this file and its schema are
the only things Ansh contributes to backend/main.py's route table — the
include_router() call itself is Himant's.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db.session import get_session
from recommendations.engine import get_recommendations, get_ingredients_catalog
from schemas.recommendations import RecommendationRequest, RecommendationResponse, IngredientsResponse

router = APIRouter(prefix="/api", tags=["recommendations"])


@router.post("/recommendations", response_model=RecommendationResponse)
def recommendations(payload: RecommendationRequest, session: Session = Depends(get_session)):
    result = get_recommendations(
        session=session,
        skin_type=payload.skin_type,
        acne_severity=payload.acne_severity,
        allergies=payload.allergies,
        budget_max=payload.budget_max,
        max_products=payload.max_products,
    )
    return RecommendationResponse(**result)


@router.get("/ingredients", response_model=IngredientsResponse)
def ingredients(session: Session = Depends(get_session)):
    result = get_ingredients_catalog(session)
    return IngredientsResponse(**result)
