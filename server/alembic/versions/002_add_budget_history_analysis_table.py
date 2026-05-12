"""Add budget_history_analysis table

Revision ID: 002
Revises: 001
Create Date: 2026-04-08

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create budget_history_analysis table."""
    op.create_table(
        'budget_history_analysis',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('budget_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('analysis_start_date', sa.Date(), nullable=False),
        sa.Column('analysis_end_date', sa.Date(), nullable=False),
        sa.Column('total_spending', sa.Numeric(precision=15, scale=2), nullable=False, server_default='0'),
        sa.Column('needs_total', sa.Numeric(precision=15, scale=2), nullable=False, server_default='0'),
        sa.Column('wants_total', sa.Numeric(precision=15, scale=2), nullable=False, server_default='0'),
        sa.Column('savings_total', sa.Numeric(precision=15, scale=2), nullable=False, server_default='0'),
        sa.Column('investments_total', sa.Numeric(precision=15, scale=2), nullable=False, server_default='0'),
        sa.Column('needs_percentage', sa.Numeric(precision=5, scale=2), nullable=False, server_default='0'),
        sa.Column('wants_percentage', sa.Numeric(precision=5, scale=2), nullable=False, server_default='0'),
        sa.Column('savings_percentage', sa.Numeric(precision=5, scale=2), nullable=False, server_default='0'),
        sa.Column('investments_percentage', sa.Numeric(precision=5, scale=2), nullable=False, server_default='0'),
        sa.Column('category_breakdown', postgresql.JSON(), nullable=False, server_default='{}'),
        sa.Column('total_transactions', sa.Numeric(precision=15, asdecimal=False), nullable=False, server_default='0'),
        sa.Column('data_quality', sa.String(length=50), nullable=False, server_default='low'),
        sa.Column('validation_warnings', postgresql.JSON(), nullable=False, server_default='[]'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['budget_id'], ['budgets.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index(op.f('ix_budget_history_analysis_budget_id'), 'budget_history_analysis', ['budget_id'], unique=False)
    op.create_index(op.f('ix_budget_history_analysis_user_id'), 'budget_history_analysis', ['user_id'], unique=False)


def downgrade() -> None:
    """Drop budget_history_analysis table."""
    op.drop_index(op.f('ix_budget_history_analysis_user_id'), table_name='budget_history_analysis')
    op.drop_index(op.f('ix_budget_history_analysis_budget_id'), table_name='budget_history_analysis')
    op.drop_table('budget_history_analysis')
