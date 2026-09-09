"""
SQLAlchemy models for the product/ingredient catalog.

Ownership: Ansh (backend/db/). Backing store is SQLite for local dev; the same
models run unchanged against PostgreSQL in staging (W12) — every column here
uses plain, portable SQLAlchemy types on purpose. No SQLite-only column types.

Tables mirror the frozen contract in docs/planning/work-division.md §4.1:
whatever get_recommendations() returns is assembled from rows in these tables.
"""
from __future__ import annotations

from sqlalchemy import (
    Column, Integer, String, Float, ForeignKey, Table, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

# ----------------------------------------------------------------- products

# Many-to-many: a product can list several key ingredients, and the same
# ingredient (e.g. "niacinamide") appears in many products.
product_ingredient = Table(
    "product_ingredient",
    Base.metadata,
    Column("product_id", String(16), ForeignKey("products.id"), primary_key=True),
    Column("ingredient_name", String(64), ForeignKey("ingredients.name"), primary_key=True),
)


class Product(Base):
    """One catalog entry. `skin_types` and `severities` are stored as a
    comma-separated tag string (e.g. "oily,normal") rather than a join table —
    the tag set is small, fixed, and never queried independently of a product,
    so a join table would add ceremony without adding capability."""
    __tablename__ = "products"

    id = Column(String(16), primary_key=True)          # e.g. "p_001"
    name = Column(String(128), nullable=False)
    brand = Column(String(64), nullable=False)
    category = Column(String(32), nullable=False)        # cleanser|toner|serum|treatment|moisturiser|sunscreen
    price = Column(Integer, nullable=False)               # whole INR
    currency = Column(String(8), nullable=False, default="INR")
    step_time = Column(String(8), nullable=False)          # "am" | "pm" | "both"
    skin_types = Column(String(64), nullable=False)        # csv: "oily,dry,normal"
    severities = Column(String(64), nullable=False)        # csv: "mild,moderate,severe"
    base_reason = Column(Text, nullable=False)             # plain-language "why this fits" seed text
    active = Column(Integer, nullable=False, default=1)    # 1=active, 0=retired (UC-0006 "retire, don't delete")

    ingredients = relationship("Ingredient", secondary=product_ingredient, back_populates="products")

    def skin_type_list(self) -> list[str]:
        return [s.strip() for s in self.skin_types.split(",") if s.strip()]

    def severity_list(self) -> list[str]:
        return [s.strip() for s in self.severities.split(",") if s.strip()]

    def ingredient_names(self) -> list[str]:
        return [i.name for i in self.ingredients]


class Ingredient(Base):
    __tablename__ = "ingredients"

    name = Column(String(64), primary_key=True)   # lowercase, canonical form
    type = Column(String(32), nullable=False)       # e.g. "BHA", "Retinoid", "Humectant"
    role = Column(Text, nullable=False)              # what it does
    caution = Column(Text, nullable=True)            # usage note, may be empty

    products = relationship("Product", secondary=product_ingredient, back_populates="ingredients")


class IngredientConflict(Base):
    """A sourced conflict rule. Every row must carry a `source` — this is
    enforced in db/seed.py and re-checked by the Admin-facing validation in
    UC-0006, not just at seed time, because an unsourced rule undermines the
    whole argument for a deterministic, traceable recommendation engine."""
    __tablename__ = "ingredient_conflicts"
    __table_args__ = (UniqueConstraint("ingredient_a", "ingredient_b", name="uq_conflict_pair"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    ingredient_a = Column(String(64), ForeignKey("ingredients.name"), nullable=False)
    ingredient_b = Column(String(64), ForeignKey("ingredients.name"), nullable=False)
    severity = Column(String(16), nullable=False)     # "avoid together" | "separate" | "caution"
    reason = Column(Text, nullable=False)
    handling = Column(Text, nullable=False)             # what the engine does about it
    source = Column(Text, nullable=False)                # citation — required, never blank
