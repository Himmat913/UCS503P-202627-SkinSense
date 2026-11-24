"""Turns a user's saved analyses into a weekly progress view.

Skincare changes slowly: an active ingredient usually needs four to twelve
weeks before its effect on acne is readable, and checking daily mostly
measures lighting and mood rather than skin. So SkinSense tracks on a weekly
cadence. Each calendar week (Monday to Sunday, UTC) is one tracked point,
represented by the most recent check in that week.
"""
from __future__ import annotations

from collections import Counter
from datetime import date, datetime, timedelta, timezone

CADENCE_DAYS = 7
SEVERITY_LEVEL = {"mild": 1, "moderate": 2, "severe": 3}
LEVEL_NAME = {1: "mild", 2: "moderate", 3: "severe"}

# A run of consistent weeks worth calling out. Four weeks is roughly when a
# new routine starts showing an effect, twelve is a full treatment cycle.
MILESTONES = (4, 8, 12, 24)


def _as_utc(value: datetime) -> datetime:
    """Rows written by SQLite come back naive; treat those as UTC."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _week_start(moment: datetime) -> date:
    day = _as_utc(moment).date()
    return day - timedelta(days=day.weekday())


def _week_label(start: date) -> str:
    end = start + timedelta(days=6)
    if start.month == end.month:
        return f"{start.day}–{end.day} {start:%b}"
    return f"{start:%d %b} – {end:%d %b}"


def _streaks(week_starts: list[date], today: date) -> tuple[int, int]:
    """Consecutive tracked weeks: the run ending now, and the longest ever."""
    if not week_starts:
        return 0, 0

    longest = 1
    run = 1
    for earlier, later in zip(week_starts, week_starts[1:]):
        if (later - earlier).days == CADENCE_DAYS:
            run += 1
            longest = max(longest, run)
        else:
            run = 1

    this_week = today - timedelta(days=today.weekday())
    last_week = this_week - timedelta(days=CADENCE_DAYS)
    # A streak stays alive while the current week is still open to a check-in.
    if week_starts[-1] not in (this_week, last_week):
        return 0, longest

    current = 1
    for earlier, later in zip(reversed(week_starts[:-1]), reversed(week_starts[1:])):
        if (later - earlier).days == CADENCE_DAYS:
            current += 1
        else:
            break
    return current, longest


def _direction(weeks: list[dict]) -> tuple[str, int]:
    """Compares the latest week against the start, on the severity scale."""
    if len(weeks) < 2:
        return "none", 0
    change = weeks[-1]["severity_level"] - weeks[0]["severity_level"]
    if change < 0:
        return "improving", change
    if change > 0:
        return "worsening", change
    return "steady", 0


def _headline(direction: str, weeks: list[dict], change: int) -> tuple[str, str]:
    if not weeks:
        return (
            "No check-ins yet",
            "Run your first skin check to start tracking. One check a week is enough to see a trend.",
        )
    if len(weeks) == 1:
        return (
            "Tracking started",
            "One check recorded. Check in again next week and SkinSense will start comparing readings.",
        )

    span = len(weeks)
    first = weeks[0]["acne_severity"]
    latest = weeks[-1]["acne_severity"]
    steps = abs(change)
    step_word = "a step" if steps == 1 else f"{steps} steps"

    if direction == "improving":
        return (
            f"Improving over {span} weeks",
            f"Your acne reading has come down {step_word}, from {first} to {latest}. Keep the routine steady.",
        )
    if direction == "worsening":
        return (
            f"Worse than when you started",
            f"Your acne reading has gone up {step_word}, from {first} to {latest}. "
            "Give any new active six to eight weeks before judging it, and see a dermatologist if it keeps climbing.",
        )
    return (
        f"Holding steady at {latest}",
        f"Your acne reading has stayed {latest} across {span} tracked weeks. "
        "Steady is normal early on; most actives need six weeks or more to show.",
    )


def _build_insights(weeks: list[dict], summary: dict) -> list[dict]:
    insights: list[dict] = []

    if not weeks:
        return [
            {
                "tone": "info",
                "title": "Weekly is the right rhythm",
                "text": "Skin responds over weeks, not days. One check a week in similar lighting gives a trend you can actually read.",
            }
        ]

    recent = weeks[-4:]
    if len(recent) >= 2:
        recent_change = recent[-1]["severity_level"] - recent[0]["severity_level"]
        if recent_change < 0:
            insights.append({
                "tone": "good",
                "title": "Moving the right way recently",
                "text": f"Across your last {len(recent)} tracked weeks the reading improved from {recent[0]['acne_severity']} to {recent[-1]['acne_severity']}.",
            })
        elif recent_change > 0:
            insights.append({
                "tone": "watch",
                "title": "A recent step back",
                "text": f"Your last {len(recent)} tracked weeks went from {recent[0]['acne_severity']} to {recent[-1]['acne_severity']}. "
                        "A flare can follow a new active, a change in weather, or stress.",
            })

    streak = summary["current_streak"]
    if streak >= 2:
        insights.append({
            "tone": "good",
            "title": f"{streak} weeks in a row",
            "text": "Consistent check-ins are what make the trend trustworthy. Keep going.",
        })
    elif summary["status"] in {"due", "overdue"}:
        insights.append({
            "tone": "watch",
            "title": "A check-in is due",
            "text": "Gaps make the trend harder to read. A new check takes about a minute.",
        })

    if not summary["skin_type_stable"]:
        insights.append({
            "tone": "info",
            "title": "Skin type readings have varied",
            "text": "Different lighting changes how oily skin looks to the model. Photograph in similar light each week for a steadier reading.",
        })

    if any(week["referral_needed"] for week in weeks[-4:]):
        insights.append({
            "tone": "watch",
            "title": "A dermatologist was suggested recently",
            "text": "One or more recent checks were flagged as severe or low confidence. SkinSense supports everyday care, it doesn't replace a professional assessment.",
        })

    photo_weeks = sum(1 for week in weeks if week["source"] != "manual")
    if weeks and photo_weeks == 0:
        insights.append({
            "tone": "info",
            "title": "All readings are self-reported",
            "text": "Checks with a photo are graded by the model, which makes week-to-week comparisons more consistent.",
        })

    return insights[:4]


def build_progress(rows: list) -> dict:
    """`rows` are AnalysisResult records for one user, in any order."""
    today = datetime.now(timezone.utc).date()

    by_week: dict[date, list] = {}
    for row in sorted(rows, key=lambda r: _as_utc(r.created_at)):
        by_week.setdefault(_week_start(row.created_at), []).append(row)

    weeks: list[dict] = []
    for index, start in enumerate(sorted(by_week)):
        entries = by_week[start]
        latest = entries[-1]  # the week's most recent check represents it
        weeks.append({
            "week_start": start,
            "week_label": _week_label(start),
            "week_index": index + 1,
            "checks": len(entries),
            "skin_type": latest.skin_type,
            "skin_type_confidence": latest.skin_type_confidence,
            "skin_type_source": latest.skin_type_source,
            "acne_severity": latest.acne_severity,
            "severity_level": SEVERITY_LEVEL.get(latest.acne_severity, 0),
            "source": latest.source,
            "referral_needed": bool(latest.referral_needed),
            "last_checked_at": _as_utc(latest.created_at),
        })

    week_starts = [week["week_start"] for week in weeks]
    current_streak, longest_streak = _streaks(week_starts, today)
    direction, change = _direction(weeks)
    headline, detail = _headline(direction, weeks, change)

    skin_types = Counter(week["skin_type"] for week in weeks)
    last_checked = weeks[-1]["last_checked_at"] if weeks else None

    next_due = None
    days_until_due = None
    status = "none"
    if last_checked:
        next_due = last_checked.date() + timedelta(days=CADENCE_DAYS)
        days_until_due = (next_due - today).days
        if days_until_due > 1:
            status = "on_track"
        elif days_until_due == 1:
            status = "due_soon"
        elif days_until_due >= -3:
            status = "due"
        else:
            status = "overdue"

    next_milestone = next((m for m in MILESTONES if m > current_streak), None)

    summary = {
        "total_checks": len(rows),
        "weeks_tracked": len(weeks),
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "first_severity": weeks[0]["acne_severity"] if weeks else None,
        "latest_severity": weeks[-1]["acne_severity"] if weeks else None,
        "severity_change": change,
        "direction": direction,
        "headline": headline,
        "detail": detail,
        "skin_type_stable": len(skin_types) <= 1,
        "dominant_skin_type": skin_types.most_common(1)[0][0] if skin_types else None,
        "last_checked_at": last_checked,
        "next_due": next_due,
        "days_until_due": days_until_due,
        "status": status,
        "weeks_to_next_milestone": (next_milestone - current_streak) if next_milestone and current_streak else None,
    }

    return {
        "cadence_days": CADENCE_DAYS,
        "weeks": weeks,
        "summary": summary,
        "insights": _build_insights(weeks, summary),
    }
