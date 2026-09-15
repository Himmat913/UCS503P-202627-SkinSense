"""POST /api/recommendations and GET /api/ingredients."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db.models import User
from db.session import get_session
from recommendations.engine import get_recommendations, get_ingredients_catalog
from schemas.recommendations import RecommendationRequest, RecommendationResponse, IngredientsResponse
from services.auth import get_current_user

router = APIRouter(prefix="/api", tags=["recommendations"])


@router.post("/recommendations", response_model=RecommendationResponse)
def recommendations(
    payload: RecommendationRequest,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
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
    # Public reference data — no personal information, no auth required.
    result = get_ingredients_catalog(session)
    return IngredientsResponse(**result)