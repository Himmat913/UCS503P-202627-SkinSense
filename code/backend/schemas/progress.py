"""Response schemas for GET /api/progress."""
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class WeekPoint(BaseModel):
    """One tracked week. Only weeks the user actually checked in appear."""
    week_start: date
    week_label: str
    week_index: int
    checks: int
    skin_type: str
    skin_type_confidence: float
    skin_type_source: str
    acne_severity: str
    severity_level: int  # 1 mild, 2 moderate, 3 severe
    source: str
    referral_needed: bool
    last_checked_at: datetime


class Insight(BaseModel):
    tone: str  # "good" | "watch" | "info"
    title: str
    text: str


class ProgressSummary(BaseModel):
    total_checks: int
    weeks_tracked: int
    current_streak: int
    longest_streak: int
    first_severity: Optional[str] = None
    latest_severity: Optional[str] = None
    severity_change: int = 0  # negative means the acne reading improved
    direction: str = "none"  # "improving" | "steady" | "worsening" | "none"
    headline: str = ""
    detail: str = ""
    skin_type_stable: bool = True
    dominant_skin_type: Optional[str] = None
    last_checked_at: Optional[datetime] = None
    next_due: Optional[date] = None
    days_until_due: Optional[int] = None
    status: str = "none"  # "none" | "on_track" | "due_soon" | "due" | "overdue"
    weeks_to_next_milestone: Optional[int] = None


class ProgressResponse(BaseModel):
    cadence_days: int = 7
    weeks: list[WeekPoint] = Field(default_factory=list)
    summary: ProgressSummary
    insights: list[Insight] = Field(default_factory=list)
