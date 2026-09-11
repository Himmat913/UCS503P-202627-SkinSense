"""
Seeds the database from data/*.json. Idempotent — re-running it updates
existing rows rather than duplicating them, so it's safe to call after every
catalog edit (UC-0006) without wiping history.

Run directly:  python -m db.seed
Or imported:   from db.seed import run_seed; run_seed()
"""
from __future__ import annotations

import json
from pathlib import Path

from db.models import Product, Ingredient, IngredientConflict
from db.session import init_db, session_scope

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


class SeedValidationError(Exception):
    """Raised when a catalog entry fails the rules UC-0006 enforces at write
    time — kept as a real exception (not just a print) so CI can catch it."""


def _load(name: str) -> list[dict]:
    path = DATA_DIR / name
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _validate_conflict(row: dict) -> None:
    # This is the one rule that matters most: every conflict rule must be
    # sourced, or the engine's "deterministic and traceable" argument breaks.
    if not row.get("source", "").strip():
        raise SeedValidationError(
            f"Conflict pair {row.get('ingredient_a')} / {row.get('ingredient_b')} "
            "has no cited source — refusing to seed it."
        )


def run_seed() -> dict:
    init_db()
    counts = {"ingredients": 0, "products": 0, "conflicts": 0}

    with session_scope() as session:
        # ---- ingredients first (products and conflicts both reference them)
        for row in _load("ingredients.json"):
            existing = session.get(Ingredient, row["name"])
            if existing:
                existing.type = row["type"]
                existing.role = row["role"]
                existing.caution = row.get("caution", "")
            else:
                session.add(Ingredient(
                    name=row["name"], type=row["type"],
                    role=row["role"], caution=row.get("caution", ""),
                ))
            counts["ingredients"] += 1
        session.flush()

        # ---- products
        ingredient_cache = {i.name: i for i in session.query(Ingredient).all()}
        for row in _load("products.json"):
            existing = session.get(Product, row["id"])
            product = existing or Product(id=row["id"])
            product.name = row["name"]
            product.brand = row["brand"]
            product.category = row["category"]
            product.price = row["price"]
            product.currency = row.get("currency", "INR")
            product.step_time = row["step_time"]
            product.skin_types = row["skin_types"]
            product.severities = row["severities"]
            product.base_reason = row["base_reason"]
            product.active = 1
            product.ingredients = [
                ingredient_cache[name] for name in row["key_ingredients"]
                if name in ingredient_cache
            ]
            if not existing:
                session.add(product)
            counts["products"] += 1
        session.flush()

        # ---- conflict pairs (validated — see _validate_conflict)
        session.query(IngredientConflict).delete()  # small table, full replace is simplest
        for row in _load("conflicts.json"):
            _validate_conflict(row)
            session.add(IngredientConflict(
                ingredient_a=row["ingredient_a"],
                ingredient_b=row["ingredient_b"],
                severity=row["severity"],
                reason=row["reason"],
                handling=row["handling"],
                source=row["source"],
            ))
            counts["conflicts"] += 1

    return counts


if __name__ == "__main__":
    result = run_seed()
    print(f"Seeded: {result['ingredients']} ingredients, "
          f"{result['products']} products, {result['conflicts']} conflict pairs.")
