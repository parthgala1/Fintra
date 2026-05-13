"""Widen deviation_percentage column to handle large overruns

Revision ID: 004
Revises: 003
Create Date: 2026-05-13

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "budget_category_breakdowns",
        "deviation_percentage",
        type_=sa.Numeric(precision=10, scale=2),
        existing_type=sa.Numeric(precision=5, scale=2),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "budget_category_breakdowns",
        "deviation_percentage",
        type_=sa.Numeric(precision=5, scale=2),
        existing_type=sa.Numeric(precision=10, scale=2),
        nullable=True,
    )
