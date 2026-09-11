"""
Builds the AM/PM routine from a filtered, ranked candidate list.

Canonical step order, both halves of the day:
  cleanser -> toner -> treatment -> serum -> moisturiser -> sunscreen
Sunscreen is AM-only regardless of its catalog tag (it belongs nowhere else).
Everything else follows the product's step_time tag, unless a conflict
resolution pinned it to a specific slot (rules.conflict_filter).
"""
from __future__ import annotations

from recommendations.rules import Candidate

STEP_ORDER = ["cleanser", "toner", "treatment", "serum", "moisturiser", "sunscreen"]


def _slot_for(candidate: Candidate) -> list[str]:
    """Which half-day(s) this product belongs in, after conflict pinning."""
    if candidate.category == "sunscreen":
        return ["am"]
    if candidate.forced_time:
        return [candidate.forced_time]
    if candidate.step_time == "both":
        return ["am", "pm"]
    return [candidate.step_time]


def build_routine(candidates: list[Candidate]) -> dict:
    am_ids, pm_ids = [], []
    for c in candidates:
        for slot in _slot_for(c):
            (am_ids if slot == "am" else pm_ids).append(c.id)

    by_id = {c.id: c for c in candidates}

    def sort_key(cid: str) -> int:
        cat = by_id[cid].category
        return STEP_ORDER.index(cat) if cat in STEP_ORDER else len(STEP_ORDER)

    am_ids.sort(key=sort_key)
    pm_ids.sort(key=sort_key)
    return {"am": am_ids, "pm": pm_ids}
