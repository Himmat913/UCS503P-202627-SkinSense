"""Filtering rules applied by the recommendation engine, in order: allergy
exclusion, budget ceiling, ingredient-conflict resolution."""
from dataclasses import dataclass, field


@dataclass
class Candidate:
    id: str
    name: str
    brand: str
    category: str
    price: int
    currency: str
    step_time: str
    ingredient_names: list[str]
    base_reason: str
    match_score: float
    forced_time: str | None = None
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
    "avoid together" drops the lower-ranked product in the pair.
    "separate" pins the lower-ranked product to the opposite AM/PM slot from
    the higher-ranked one; if both are already fixed to the same single slot,
    the lower-ranked one is dropped instead.
    "caution" changes nothing.
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
                        dropped_ids.add(lower.id)
                        dropped.append(Excluded(lower.id, lower.name, row["reason"] + " (could not be scheduled apart)"))
                        continue

                    if higher_slot is None:
                        higher.forced_time = "am"
                    if lower.forced_time is None and lower.step_time == "both":
                        lower.forced_time = "pm" if higher.forced_time == "am" or higher_slot == "am" else "am"

    kept = [c for c in candidates if c.id not in dropped_ids]
    return kept, dropped