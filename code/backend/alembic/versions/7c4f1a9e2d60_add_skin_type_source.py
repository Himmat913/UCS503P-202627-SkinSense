"""add skin_type_source to analysis_results

Revision ID: 7c4f1a9e2d60
Revises: 4b1e9c2a7f30
Create Date: 2026-11-03 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7c4f1a9e2d60"
down_revision: Union[str, None] = "4b1e9c2a7f30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "analysis_results",
        sa.Column("skin_type_source", sa.String(length=16), nullable=False, server_default="manual"),
    )
    # Note: the server default is intentionally left in place. Dropping it needs
    # ALTER COLUMN, which SQLite doesn't support (only Postgres does), and the
    # default is harmless to keep — every real insert supplies this value explicitly.
    op.alter_column("analysis_results", "skin_type_source", server_default=None)


def downgrade() -> None:
    op.drop_column("analysis_results", "skin_type_source")
