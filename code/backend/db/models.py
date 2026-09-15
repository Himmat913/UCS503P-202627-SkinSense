"""SQLAlchemy models for the product/ingredient catalog and user accounts."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    Column, Integer, String, Float, ForeignKey, Table, Text, UniqueConstraint,
    DateTime,
)
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    token_version = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))


product_ingredient = Table(
    "product_ingredient",
    Base.metadata,
    Column("product_id", String(16), ForeignKey("products.id"), primary_key=True),
    Column("ingredient_name", String(64), ForeignKey("ingredients.name"), primary_key=True),
)


class Product(Base):
    __tablename__ = "products"

    id = Column(String(16), primary_key=True)
    name = Column(String(128), nullable=False)
    brand = Column(String(64), nullable=False)
    category = Column(String(32), nullable=False)
    price = Column(Integer, nullable=False)
    currency = Column(String(8), nullable=False, default="INR")
    step_time = Column(String(8), nullable=False)
    skin_types = Column(String(64), nullable=False)
    severities = Column(String(64), nullable=False)
    base_reason = Column(Text, nullable=False)
    active = Column(Integer, nullable=False, default=1)

    ingredients = relationship("Ingredient", secondary=product_ingredient, back_populates="products")

    def skin_type_list(self) -> list[str]:
        return [s.strip() for s in self.skin_types.split(",") if s.strip()]

    def severity_list(self) -> list[str]:
        return [s.strip() for s in self.severities.split(",") if s.strip()]

    def ingredient_names(self) -> list[str]:
        return [i.name for i in self.ingredients]


class Ingredient(Base):
    __tablename__ = "ingredients"

    name = Column(String(64), primary_key=True)
    type = Column(String(32), nullable=False)
    role = Column(Text, nullable=False)
    caution = Column(Text, nullable=True)

    products = relationship("Product", secondary=product_ingredient, back_populates="ingredients")


class IngredientConflict(Base):
    __tablename__ = "ingredient_conflicts"
    __table_args__ = (UniqueConstraint("ingredient_a", "ingredient_b", name="uq_conflict_pair"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    ingredient_a = Column(String(64), ForeignKey("ingredients.name"), nullable=False)
    ingredient_b = Column(String(64), ForeignKey("ingredients.name"), nullable=False)
    severity = Column(String(16), nullable=False)
    reason = Column(Text, nullable=False)
    handling = Column(Text, nullable=False)
    source = Column(Text, nullable=False)