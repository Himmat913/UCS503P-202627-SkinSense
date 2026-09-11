"""
Filtering rules applied by the recommendation engine, in order:
allergy exclusion -> budget ceiling -> ingredient-conflict resolution.

Kept separate from engine.py so each rule is independently unit-testable
(see tests/test_recommendations.py) — the engine's job is only to sequence
these, not to contain the filtering logic itself.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Candidate:
    """A product carried through the filter pipeline, picking up a
    match_score and a forced AM/PM slot (if a conflict resolution pins it)
    along the way."""
    id: str
    name: str
    brand: str
    category: str
    price: int
    currency: str
    step_time: str          # "am" | "pm" | "both" — from the catalog
    ingredient_names: list[str]
    base_reason: str
    match_score: float
    forced_time: str | None = None   # set by conflict resolution when needed
    reasons: list[str] = field(default_factory=list)


@dataclass
class Excluded:
    id: str
    name: str
    reason: str


def allergy_filter(candidates: list[Candidate], allergies: list[str]) -> tuple[list[Candidate], list[Excluded]]:
    if not allergies:
        return candidates, []
    allergy_set = {a.lower() for a in allergies}
    kept, dropped = [], []
    for c in candidates:
        hit = next((ing for ing in c.ingredient_names if ing.lower() in allergy_set), None)
        if hit:
            dropped.append(Excluded(c.id, c.name, f"Contains {hit}, which you listed as an ingredient to avoid."))
        else:
            kept.append(c)
    return kept, dropped


def budget_filter(candidates: list[Candidate], budget_max: int | None) -> tuple[list[Candidate], list[Excluded]]:
    if budget_max is None:
        return candidates, []
    kept, dropped = [], []
    for c in candidates:
        if c.price > budget_max:
            dropped.append(Excluded(c.id, c.name, f"₹{c.price} is above your ₹{budget_max} per-product budget."))
        else:
            kept.append(c)
    return kept, dropped


def conflict_filter(
    candidates: list[Candidate],
    conflict_rows: list[dict],
) -> tuple[list[Candidate], list[Excluded]]:
    """
    conflict_rows: [{ingredient_a, ingredient_b, severity, reason, handling}, ...]

    "avoid together"  -> the lower-ranked product in the pair is dropped entirely.
    "separate"        -> both are kept, but if both are tagged step_time="both"
                          (or already pinned to the SAME single slot), the
                          lower-ranked one is pinned to the opposite slot from
                          the higher-ranked one so they never land in the same
                          routine half. If they can't be separated (both fixed
                          to the same single slot already), the lower-ranked
                          one is dropped — a same-slot clash can't be resolved
                          by timing alone.
    "caution"         -> both kept unchanged; no forced separation.
    """
    by_ingredient: dict[str, list[Candidate]] = {}
    for c in candidates:
        for ing in c.ingredient_names:
            by_ingredient.setdefault(ing.lower(), []).append(c)

    dropped_ids: set[str] = set()
    dropped: list[Excluded] = []

    for row in conflict_rows:
        a_products = by_ingredient.get(row["ingredient_a"].lower(), [])
        b_products = by_ingredient.get(row["ingredient_b"].lower(), [])
        for pa in a_products:
            if pa.id in dropped_ids:
                continue
            for pb in b_products:
                if pb.id == pa.id or pb.id in dropped_ids:
                    continue

                higher, lower = (pa, pb) if pa.match_score >= pb.match_score else (pb, pa)

                if row["severity"] == "avoid together":
                    dropped_ids.add(lower.id)
                    dropped.append(Excluded(lower.id, lower.name, row["reason"]))
                    continue

                if row["severity"] == "separate":
                    higher_slot = higher.forced_time or (higher.step_time if higher.step_time != "both" else None)
                    lower_slot = lower.forced_time or (lower.step_time if lower.step_time != "both" else None)

                    if higher_slot and lower_slot and higher_slot == lower_slot:
                        # both pinned to the same single slot already — can't separate by timing
                        dropped_ids.add(lower.id)
                        dropped.append(Excluded(lower.id, lower.name, row["reason"] + " (could not be scheduled apart)"))
                        continue

                    if higher_slot is None:
                        higher.forced_time = "am"
                    if lower.forced_time is None and lower.step_time == "both":
                        lower.forced_time = "pm" if higher.forced_time == "am" or higher_slot == "am" else "am"
                # "caution": no action needed

    kept = [c for c in candidates if c.id not in dropped_ids]
    return kept, dropped
