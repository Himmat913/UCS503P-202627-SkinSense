"""GET /api/progress — the signed-in user's weekly skin tracking."""
from fastapi import APIRouter, Depends

from db.models import AnalysisResult, User
from db.session import session_scope
from schemas.progress import ProgressResponse
from services.auth import get_current_user
from services.progress import build_progress

router = APIRouter(prefix="/api", tags=["progress"])


@router.get("/progress", response_model=ProgressResponse)
def get_progress(user: User = Depends(get_current_user)):
    """Weekly trend, streaks and plain-language feedback, built from the
    caller's own saved analyses only."""
    with session_scope() as session:
        rows = (
            session.query(AnalysisResult)
            .filter(AnalysisResult.user_id == user.id)
            .order_by(AnalysisResult.created_at.asc())
            .all()
        )
        payload = build_progress(rows)
    return ProgressResponse(**payload)
