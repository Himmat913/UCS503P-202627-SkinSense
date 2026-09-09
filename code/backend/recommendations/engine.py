"""
The recommendation engine. Signature and return shape are frozen per
docs/planning/work-division.md §4.1 — see schemas/recommendations.py for the
Pydantic mirror of this exact shape.

engine_version bumps from "stub-0.1" to "rules-1.0" here: this is the real
rule-based implementation, not the W5 hardcoded placeholder. Everything
downstream (the router, the frontend) needs no changes — that was the point
of freezing the contract before either side was built.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from db.models import Product, IngredientConflict
from recommendations.rules import Candidate, Excluded, allergy_filter, budget_filter, conflict_filter
from recommendations.routine import build_routine

ENGINE_VERSION = "rules-1.0"


def _match_score(product: Product) -> float:
    """More narrowly-tagged products score higher — a product tagged only
    for exactly this skin type and severity is a better fit than one tagged
    for all three of each. Deliberately simple and auditable: no ML, no
    hidden weights, matching the proposal's commitment to a fully traceable
    engine."""
    n_types = len(product.skin_type_list()) or 1
    n_sev = len(product.severity_list()) or 1
    type_specificity = 1 - (n_types - 1) / 2   # 1 type -> 1.0, 3 types -> 0.0
    sev_specificity = 1 - (n_sev - 1) / 2
    score = 0.5 + 0.25 * type_specificity + 0.25 * sev_specificity
    return round(max(0.0, min(1.0, score)), 2)


def _build_reasons(product: Product, skin_type: str, acne_severity: str) -> list[str]:
    reasons = [product.base_reason]
    if len(product.skin_type_list()) == 1:
        reasons.append(f"Formulated specifically for {skin_type} skin.")
    if len(product.severity_list()) <= 2 and acne_severity in product.severity_list():
        reasons.append(f"Suited to {acne_severity} acne.")
    return reasons


def get_recommendations(
    session: Session,
    skin_type: str,
    acne_severity: str,
    allergies: list[str] | None = None,
    budget_max: int | None = None,
    max_products: int = 8,
) -> dict:
    """
    Guarantees held regardless of input (see work-division.md §4.1):
      - always returns the full dict shape, never None, never raises for valid inputs
      - products may be empty; if so, notes explains why
      - every id in routine.am / routine.pm appears in products
      - no product in products contains any listed allergen
      - every filtered-out product appears in excluded with a stated reason
      - every product carries at least one reason
    """
    allergies = allergies or []
    notes: list[str] = []

    # ---- 1. match: active products tagged for this skin type AND severity
    rows = (
        session.query(Product)
        .filter(Product.active == 1)
        .all()
    )
    matched = [
        p for p in rows
        if skin_type in p.skin_type_list() and acne_severity in p.severity_list()
    ]

    candidates = [
        Candidate(
            id=p.id, name=p.name, brand=p.brand, category=p.category,
            price=p.price, currency=p.currency, step_time=p.step_time,
            ingredient_names=p.ingredient_names(), base_reason=p.base_reason,
            match_score=_match_score(p),
        )
        for p in matched
    ]

    excluded: list[Excluded] = []

    # ---- 2. allergy exclusion filter
    candidates, dropped = allergy_filter(candidates, allergies)
    excluded += dropped

    # ---- 3. ingredient-conflict resolution (before budget, so a dropped
    #         conflict loser doesn't also need a budget reason)
    conflict_rows = [
        {
            "ingredient_a": row.ingredient_a, "ingredient_b": row.ingredient_b,
            "severity": row.severity, "reason": row.reason, "handling": row.handling,
        }
        for row in session.query(IngredientConflict).all()
    ]
    candidates, dropped = conflict_filter(candidates, conflict_rows)
    excluded += dropped

    # ---- 4. budget ceiling
    candidates, dropped = budget_filter(candidates, budget_max)
    excluded += dropped

    # ---- 5. rank and cap
    candidates.sort(key=lambda c: c.match_score, reverse=True)
    kept = candidates[:max_products]
    overflow = candidates[max_products:]
    for c in overflow:
        excluded.append(Excluded(c.id, c.name, f"Ranked below the top {max_products} matches for your profile."))

    # ---- 6. reasons (attach to the product model, not the candidate, since
    #         base_reason lives on Product and Candidate only carries a copy)
    product_by_id = {p.id: p for p in matched}
    for c in kept:
        c.reasons = _build_reasons(product_by_id[c.id], skin_type, acne_severity)

    # ---- 7. routine
    routine = build_routine(kept)

    if not kept:
        notes.append(
            "No products matched your filters. Try raising the budget or removing an ingredient exclusion."
        )

    return {
        "engine_version": ENGINE_VERSION,
        "products": [
            {
                "id": c.id, "name": c.name, "brand": c.brand, "category": c.category,
                "price": c.price, "currency": c.currency,
                "key_ingredients": c.ingredient_names, "reasons": c.reasons,
                "match_score": c.match_score,
            }
            for c in kept
        ],
        "routine": routine,
        "excluded": [{"id": e.id, "name": e.name, "reason": e.reason} for e in excluded],
        "notes": notes,
    }


def get_ingredients_catalog(session: Session) -> dict:
    """Backs GET /api/ingredients — the Ingredients reference page."""
    from db.models import Ingredient

    ingredients = session.query(Ingredient).all()
    conflicts = session.query(IngredientConflict).all()
    return {
        "ingredients": [
            {"name": i.name, "type": i.type, "role": i.role, "caution": i.caution or ""}
            for i in ingredients
        ],
        "conflicts": [
            {
                "a": c.ingredient_a, "b": c.ingredient_b, "severity": c.severity,
                "reason": c.reason, "handling": c.handling,
            }
            for c in conflicts
        ],
        "catalog_version": ENGINE_VERSION,
    }
