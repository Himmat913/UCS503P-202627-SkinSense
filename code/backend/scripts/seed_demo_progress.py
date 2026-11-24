"""Creates demo accounts that already have weeks of tracked check-ins.

Real tracking data takes months to accumulate, so this fills in a believable
history for demonstrations. Run it once against a development database:

    python -m scripts.seed_demo_progress

Re-running wipes and rebuilds only these demo accounts; real accounts are
never touched. Pass --clear to remove them again.
"""
from __future__ import annotations

import argparse
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from db.models import AnalysisResult, User  # noqa: E402
from db.session import init_db, session_scope  # noqa: E402

DEMO_PASSWORD = "skinsense2026"

# Each profile is a weekly path of acne readings, oldest week first.
PROFILES = [
    {
        "email": "priya@demo.skinsense",
        "skin_type": "oily",
        "severity": ["severe", "severe", "moderate", "moderate", "moderate", "mild", "mild", "mild", "mild", "mild"],
        "skin_wobble": {5: "normal"},  # one week the model read it differently
    },
    {
        "email": "arjun@demo.skinsense",
        "skin_type": "dry",
        "severity": ["moderate", "moderate", "mild", "mild", "moderate", "moderate", "mild", "mild"],
        "skin_wobble": {},
    },
    {
        "email": "neha@demo.skinsense",
        "skin_type": "normal",
        "severity": ["mild", "mild", "moderate", "moderate", "moderate", "severe"],
        "skin_wobble": {3: "oily"},
    },
]


def _hash_password(raw: str) -> str:
    """Uses the app's own hasher so these accounts can really log in."""
    from services import auth as auth_service

    for name in ("hash_password", "get_password_hash", "hash_pw"):
        fn = getattr(auth_service, name, None)
        if callable(fn):
            return fn(raw)
    context = getattr(auth_service, "pwd_context", None)
    if context is not None:
        return context.hash(raw)
    raise RuntimeError("Could not find the password hasher in services/auth.py.")


def _confidence(rng: random.Random, source: str) -> float:
    if source == "manual":
        return 1.0
    return round(rng.uniform(0.63, 0.91), 4)


def clear_demo_users(session) -> int:
    emails = [profile["email"] for profile in PROFILES]
    users = session.query(User).filter(User.email.in_(emails)).all()
    removed = 0
    for user in users:
        session.query(AnalysisResult).filter(AnalysisResult.user_id == user.id).delete()
        session.delete(user)
        removed += 1
    return removed


def seed(clear_only: bool = False) -> None:
    init_db()
    rng = random.Random(20261103)  # fixed seed: the same demo data every run
    now = datetime.now(timezone.utc)
    # Anchor to this week's Monday so the newest check always looks current.
    this_monday = (now - timedelta(days=now.weekday())).replace(hour=9, minute=15, second=0, microsecond=0)

    with session_scope() as session:
        removed = clear_demo_users(session)
        if clear_only:
            print(f"Removed {removed} demo account(s).")
            return

        for profile in PROFILES:
            user = User(
                email=profile["email"],
                password_hash=_hash_password(DEMO_PASSWORD),
                token_version=0,
                created_at=this_monday - timedelta(weeks=len(profile["severity"]) + 1),
            )
            session.add(user)
            session.flush()  # assigns user.id

            weeks = len(profile["severity"])
            for index, severity in enumerate(profile["severity"]):
                weeks_ago = weeks - 1 - index
                # Scatter each check across its week so it doesn't look generated.
                checked_at = (
                    this_monday
                    - timedelta(weeks=weeks_ago)
                    + timedelta(days=rng.randint(0, 5), hours=rng.randint(0, 9), minutes=rng.randint(0, 59))
                )
                if checked_at > now:
                    checked_at = now - timedelta(hours=2)

                source = "manual" if rng.random() < 0.12 else "model"
                skin_type = profile["skin_wobble"].get(index, profile["skin_type"])
                skin_source = "manual" if source == "manual" else "model"
                acne_confidence = _confidence(rng, source)
                referral = severity == "severe" or acne_confidence < 0.60

                session.add(
                    AnalysisResult(
                        user_id=user.id,
                        image_id=None if source == "manual" else f"demo_{user.id}_{index}",
                        skin_type=skin_type,
                        skin_type_confidence=_confidence(rng, skin_source),
                        skin_type_source=skin_source,
                        acne_severity=severity,
                        acne_severity_confidence=acne_confidence,
                        lesion_count_estimate=None,
                        source=source,
                        referral_needed=1 if referral else 0,
                        created_at=checked_at,
                    )
                )

            print(f"  {profile['email']}: {weeks} weekly check-ins")

    print(f"\nDone. Log in with any of the emails above, password: {DEMO_PASSWORD}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed or clear SkinSense demo tracking history.")
    parser.add_argument("--clear", action="store_true", help="Remove the demo accounts and exit.")
    args = parser.parse_args()
    seed(clear_only=args.clear)
