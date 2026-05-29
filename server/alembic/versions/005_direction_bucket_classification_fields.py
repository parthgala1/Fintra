"""Add direction_type, bucket_type, classification metadata to transactions/categories/budget_reports

Revision ID: 005
Revises: 004
Create Date: 2026-05-15

Adds:
- transactions.direction_type   (income/expense/transfer/refund/adjustment)
- transactions.bucket_type      (needs/wants/savings/none)
- transactions.confidence_score (0.0000–1.0000)
- transactions.classification_source (rule/keyword/ai/manual/system)
- transactions.user_verified
- transactions.needs_review
- categories.bucket_type        (denormalized helper for query performance)
- categories.is_misc_category   (marks Misc Needs/Wants/Savings fallback categories)
- budget_reports: 8 new summary columns for transfers, pending_review, misc, low_confidence

Backfills:
- transactions.direction_type from transaction_type
- transactions.bucket_type from linked category.category_type (for expenses)
- categories.bucket_type from category_type
- categories.is_misc_category for Uncategorized/Misc* names
- Ensures Misc Needs/Wants/Savings system categories exist
- Backfills BudgetCategory rows for Misc categories on existing budgets
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # -----------------------------------------------------------------------
    # 1. Create new PostgreSQL ENUM types
    #    Drop and recreate to fix any partial state from previous failed runs.
    #    CASCADE is safe here because the columns haven't been added yet.
    # -----------------------------------------------------------------------
    bind.execute(sa.text("DROP TYPE IF EXISTS directiontype CASCADE"))
    bind.execute(sa.text("""
        CREATE TYPE directiontype AS ENUM (
            'income', 'expense', 'transfer', 'refund', 'adjustment'
        )
    """))

    bind.execute(sa.text("DROP TYPE IF EXISTS buckettype CASCADE"))
    bind.execute(sa.text("""
        CREATE TYPE buckettype AS ENUM (
            'needs', 'wants', 'savings', 'none'
        )
    """))

    bind.execute(sa.text("DROP TYPE IF EXISTS classificationsource CASCADE"))
    bind.execute(sa.text("""
        CREATE TYPE classificationsource AS ENUM (
            'rule', 'keyword', 'ai', 'manual', 'system'
        )
    """))

    # -----------------------------------------------------------------------
    # 2. Add new columns to transactions
    # -----------------------------------------------------------------------
    tx_columns = {col["name"] for col in inspector.get_columns("transactions")}

    if "direction_type" not in tx_columns:
        op.add_column(
            "transactions",
            sa.Column(
                "direction_type",
                postgresql.ENUM(name="directiontype", create_type=False),
                nullable=True,
            ),
        )

    if "bucket_type" not in tx_columns:
        op.add_column(
            "transactions",
            sa.Column(
                "bucket_type",
                postgresql.ENUM(name="buckettype", create_type=False),
                nullable=True,
            ),
        )

    if "confidence_score" not in tx_columns:
        op.add_column(
            "transactions",
            sa.Column("confidence_score", sa.Numeric(precision=5, scale=4), nullable=True),
        )

    if "classification_source" not in tx_columns:
        op.add_column(
            "transactions",
            sa.Column(
                "classification_source",
                postgresql.ENUM(name="classificationsource", create_type=False),
                nullable=True,
            ),
        )

    if "user_verified" not in tx_columns:
        op.add_column(
            "transactions",
            sa.Column("user_verified", sa.Boolean(), nullable=True, server_default="false"),
        )

    if "needs_review" not in tx_columns:
        op.add_column(
            "transactions",
            sa.Column("needs_review", sa.Boolean(), nullable=True, server_default="false"),
        )

    # -----------------------------------------------------------------------
    # 3. Add new columns to categories
    # -----------------------------------------------------------------------
    cat_columns = {col["name"] for col in inspector.get_columns("categories")}

    if "bucket_type" not in cat_columns:
        op.add_column(
            "categories",
            sa.Column("bucket_type", sa.String(20), nullable=True),
        )

    if "is_misc_category" not in cat_columns:
        op.add_column(
            "categories",
            sa.Column("is_misc_category", sa.Boolean(), nullable=True, server_default="false"),
        )

    # -----------------------------------------------------------------------
    # 4. Add new summary columns to budget_reports
    # -----------------------------------------------------------------------
    br_columns = {col["name"] for col in inspector.get_columns("budget_reports")}

    new_budget_report_cols = [
        ("transfer_total", sa.Numeric(15, 2)),
        ("transfer_transaction_count", sa.Numeric(10, 0)),
        ("pending_review_count", sa.Numeric(10, 0)),
        ("pending_review_amount", sa.Numeric(15, 2)),
        ("misc_categorized_total", sa.Numeric(15, 2)),
        ("misc_categorized_count", sa.Numeric(10, 0)),
        ("low_confidence_total", sa.Numeric(15, 2)),
        ("low_confidence_count", sa.Numeric(10, 0)),
    ]
    for col_name, col_type in new_budget_report_cols:
        if col_name not in br_columns:
            op.add_column(
                "budget_reports",
                sa.Column(col_name, col_type, nullable=True, server_default="0"),
            )

    # -----------------------------------------------------------------------
    # 5. Add new indexes (idempotent via CREATE INDEX IF NOT EXISTS)
    # -----------------------------------------------------------------------
    op.execute("CREATE INDEX IF NOT EXISTS idx_transactions_user_needs_review ON transactions (user_id, needs_review)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_transactions_direction_type ON transactions (direction_type)")

    # -----------------------------------------------------------------------
    # 6. Backfill transactions.direction_type from transaction_type
    # -----------------------------------------------------------------------
    # Transfers
    op.execute("""
        UPDATE transactions
        SET direction_type = 'transfer'::directiontype,
            bucket_type    = 'none'::buckettype
        WHERE transaction_type::text = 'transfer'
          AND direction_type IS NULL
    """)

    # Income
    op.execute("""
        UPDATE transactions
        SET direction_type = 'income'::directiontype,
            bucket_type    = 'none'::buckettype
        WHERE transaction_type::text = 'income'
          AND direction_type IS NULL
    """)

    # Expenses with a category — derive bucket_type from category.category_type
    op.execute("""
        UPDATE transactions t
        SET direction_type = 'expense'::directiontype,
            bucket_type = CASE
                WHEN lower(c.category_type::text) = 'needs'   THEN 'needs'::buckettype
                WHEN lower(c.category_type::text) = 'wants'   THEN 'wants'::buckettype
                WHEN lower(c.category_type::text) = 'savings' THEN 'savings'::buckettype
                ELSE 'none'::buckettype
            END
        FROM categories c
        WHERE t.transaction_type::text = 'expense'
          AND t.category_id = c.id
          AND t.direction_type IS NULL
    """)

    # Expenses with no category (uncategorized)
    op.execute("""
        UPDATE transactions
        SET direction_type = 'expense'::directiontype,
            bucket_type    = 'none'::buckettype
        WHERE transaction_type::text = 'expense'
          AND direction_type IS NULL
    """)

    # -----------------------------------------------------------------------
    # 7. Backfill categories.bucket_type and is_misc_category
    # -----------------------------------------------------------------------
    op.execute("""
        UPDATE categories
        SET bucket_type = CASE
            WHEN lower(category_type::text) = 'needs'   THEN 'needs'
            WHEN lower(category_type::text) = 'wants'   THEN 'wants'
            WHEN lower(category_type::text) = 'savings' THEN 'savings'
            ELSE 'none'
        END
        WHERE bucket_type IS NULL
    """)

    op.execute("""
        UPDATE categories
        SET is_misc_category = TRUE
        WHERE lower(name) IN ('uncategorized', 'misc needs', 'misc wants', 'misc savings')
          AND (is_misc_category IS NULL OR is_misc_category = FALSE)
    """)

    # -----------------------------------------------------------------------
    # 8. Misc Needs/Wants/Savings categories are seeded by create_system_categories.py
    #    after migration runs — skipped here to avoid enum casing conflicts.
    # -----------------------------------------------------------------------

    # -----------------------------------------------------------------------
    # 9. Deactivate legacy Transfer system categories (Bank Transfer, Credit Card Payment)
    # -----------------------------------------------------------------------
    op.execute("""
        UPDATE categories
        SET is_active = FALSE
        WHERE is_system = TRUE
          AND lower(name) IN ('bank transfer', 'credit card payment')
    """)

    # -----------------------------------------------------------------------
    # 10. Backfill BudgetCategory rows for Misc Needs/Wants/Savings
    #     on existing active budgets (0 allocation — user can configure later)
    # -----------------------------------------------------------------------
    op.execute("""
        INSERT INTO budget_categories (
            id, budget_id, category_id, category_type, budgeted_amount, sort_order,
            created_at, updated_at
        )
        SELECT
            md5(random()::text || clock_timestamp()::text)::uuid,
            b.id,
            c.id,
            c.category_type::text::categorytype,
            0,
            999,
            NOW(),
            NOW()
        FROM budgets b
        JOIN categories c ON c.is_system = TRUE
            AND c.is_misc_category = TRUE
            AND lower(c.name) IN ('misc needs', 'misc wants', 'misc savings')
        WHERE b.is_active = TRUE
          AND NOT EXISTS (
              SELECT 1 FROM budget_categories bc
              WHERE bc.budget_id = b.id AND bc.category_id = c.id
          )
    """)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # Drop added indexes
    op.execute("DROP INDEX IF EXISTS idx_transactions_user_needs_review")
    op.execute("DROP INDEX IF EXISTS idx_transactions_direction_type")

    # Drop columns from transactions
    tx_columns = {col["name"] for col in inspector.get_columns("transactions")}
    for col in ("direction_type", "bucket_type", "confidence_score",
                "classification_source", "user_verified", "needs_review"):
        if col in tx_columns:
            op.drop_column("transactions", col)

    # Drop columns from categories
    cat_columns = {col["name"] for col in inspector.get_columns("categories")}
    for col in ("bucket_type", "is_misc_category"):
        if col in cat_columns:
            op.drop_column("categories", col)

    # Drop columns from budget_reports
    br_columns = {col["name"] for col in inspector.get_columns("budget_reports")}
    for col in ("transfer_total", "transfer_transaction_count", "pending_review_count",
                "pending_review_amount", "misc_categorized_total", "misc_categorized_count",
                "low_confidence_total", "low_confidence_count"):
        if col in br_columns:
            op.drop_column("budget_reports", col)

    # Drop enum types (only if no columns reference them)
    bind.execute(sa.text("DROP TYPE IF EXISTS directiontype"))
    bind.execute(sa.text("DROP TYPE IF EXISTS buckettype"))
    bind.execute(sa.text("DROP TYPE IF EXISTS classificationsource"))
