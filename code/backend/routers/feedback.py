"""POST /api/feedback — store a signed-in user's clarity rating."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from db.models import Feedback, User
from db.session import get_session
from schemas.feedback import FeedbackRequest, FeedbackResponse
from services.auth import get_current_user

router = APIRouter(prefix="/api", tags=["feedback"])


@router.post("/feedback", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
def submit_feedback(
    payload: FeedbackRequest,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    entry = Feedback(
        user_id=user.id,
        clarity_rating=payload.clarity_rating,
        comment=payload.comment.strip() or None,
        skin_type=payload.skin_type,
        acne_severity=payload.acne_severity,
        engine_version=payload.engine_version,
        product_count=payload.product_count,
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return FeedbackResponse(id=entry.id)
