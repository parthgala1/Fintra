"""Budget core dataflow refactor

Revision ID: 003
Revises: 002
Create Date: 2026-05-12

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())

    category_type_enum = postgresql.ENUM(name="categorytype", create_type=False)

    if "budget_categories" not in table_names:
        op.create_table(
            "budget_categories",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("budget_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("category_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("category_type", category_type_enum, nullable=False),
            sa.Column("budgeted_amount", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["budget_id"], ["budgets.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["category_id"], ["categories.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    op.execute("CREATE INDEX IF NOT EXISTS ix_budget_categories_budget_id ON budget_categories (budget_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_budget_categories_category_id ON budget_categories (category_id)")
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_budget_categories_budget_category ON budget_categories (budget_id, category_id)"
    )

    budget_report_columns = {column["name"] for column in inspector.get_columns("budget_reports")}
    if "remaining_budget" not in budget_report_columns:
        op.add_column("budget_reports", sa.Column("remaining_budget", sa.Numeric(precision=15, scale=2), nullable=True))
    if "last_calculated_at" not in budget_report_columns:
        op.add_column("budget_reports", sa.Column("last_calculated_at", sa.DateTime(timezone=True), nullable=True))

    # backfill allocation rows for active budgets using even split by category type
    op.execute(
        """
        WITH eligible AS (
            SELECT
                b.id AS budget_id,
                c.id AS category_id,
                c.category_type::text AS category_type_text,
                CASE
                    WHEN lower(c.category_type::text) = 'needs' THEN COALESCE(b.needs_amount, 0)
                    WHEN lower(c.category_type::text) = 'wants' THEN COALESCE(b.wants_amount, 0)
                    ELSE COALESCE(b.savings_amount, 0)
                END AS bucket_amount,
                COUNT(*) OVER (PARTITION BY b.id, c.category_type::text) AS bucket_count,
                ROW_NUMBER() OVER (PARTITION BY b.id, c.category_type::text ORDER BY c.name, c.id) AS sort_order
            FROM budgets b
            JOIN categories c
              ON (c.user_id = b.user_id OR c.is_system = true)
             AND c.is_active = true
             AND lower(c.category_type::text) IN ('needs', 'wants', 'savings')
            WHERE b.is_active = true
        )
        INSERT INTO budget_categories (
            id,
            budget_id,
            category_id,
            category_type,
            budgeted_amount,
            sort_order,
            created_at,
            updated_at
        )
        SELECT
            md5(random()::text || clock_timestamp()::text)::uuid,
            budget_id,
            category_id,
            category_type_text::categorytype,
            ROUND(bucket_amount / NULLIF(bucket_count, 0), 2),
            sort_order,
            NOW(),
            NOW()
        FROM eligible
        ON CONFLICT (budget_id, category_id) DO NOTHING
        """
    )

    # backfill report metadata
    op.execute(
        """
        UPDATE budget_reports
        SET
            remaining_budget = COALESCE(total_budgeted, 0) - COALESCE(total_spent, 0),
            last_calculated_at = COALESCE(last_calculated_at, created_at)
        """
    )


def downgrade() -> None:
    op.drop_column("budget_reports", "last_calculated_at")
    op.drop_column("budget_reports", "remaining_budget")

    op.drop_index("uq_budget_categories_budget_category", table_name="budget_categories")
    op.drop_index("ix_budget_categories_category_id", table_name="budget_categories")
    op.drop_index("ix_budget_categories_budget_id", table_name="budget_categories")
    op.drop_table("budget_categories")
