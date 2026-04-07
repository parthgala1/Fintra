"""Add reconciliation fields to bank_accounts and upload_history tables

Revision ID: 001
Revises: 
Create Date: 2026-04-06

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add reconciliation fields to bank_accounts table."""
    # Add reconciliation fields to bank_accounts table
    op.add_column('bank_accounts', sa.Column('statement_balance', sa.Numeric(precision=15, scale=2), nullable=True))
    op.add_column('bank_accounts', sa.Column('statement_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('bank_accounts', sa.Column('last_reconciled_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('bank_accounts', sa.Column('reconciliation_status', postgresql.ENUM('pending', 'reconciled', 'discrepancy', 'not_applicable', name='reconciliationstatus'), nullable=True))
    op.add_column('bank_accounts', sa.Column('balance_discrepancy_amount', sa.Numeric(precision=15, scale=2), nullable=True))
    op.add_column('bank_accounts', sa.Column('last_statement_document_id', sa.String(255), nullable=True))
    
    # Add reconciliation fields to upload_history table
    op.add_column('upload_history', sa.Column('statement_balance_extracted', sa.Numeric(precision=15, scale=2), nullable=True))
    op.add_column('upload_history', sa.Column('statement_date_from_file', sa.DateTime(timezone=True), nullable=True))
    op.add_column('upload_history', sa.Column('extracted_closing_balance', sa.Numeric(precision=15, scale=2), nullable=True))
    op.add_column('upload_history', sa.Column('balance_extraction_attempted', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('upload_history', sa.Column('reconciliation_status', sa.String(50), nullable=True))
    
    # Create indexes for performance
    op.create_index(op.f('ix_bank_accounts_last_reconciled_at'), 'bank_accounts', ['last_reconciled_at'], unique=False)
    op.create_index(op.f('ix_upload_history_statement_date_from_file'), 'upload_history', ['statement_date_from_file'], unique=False)


def downgrade() -> None:
    """Remove reconciliation fields from tables."""
    # Drop indexes
    op.drop_index(op.f('ix_upload_history_statement_date_from_file'), table_name='upload_history')
    op.drop_index(op.f('ix_bank_accounts_last_reconciled_at'), table_name='bank_accounts')
    
    # Drop columns from upload_history
    op.drop_column('upload_history', 'reconciliation_status')
    op.drop_column('upload_history', 'balance_extraction_attempted')
    op.drop_column('upload_history', 'extracted_closing_balance')
    op.drop_column('upload_history', 'statement_date_from_file')
    op.drop_column('upload_history', 'statement_balance_extracted')
    
    # Drop columns from bank_accounts
    op.drop_column('bank_accounts', 'last_statement_document_id')
    op.drop_column('bank_accounts', 'balance_discrepancy_amount')
    op.drop_column('bank_accounts', 'reconciliation_status')
    op.drop_column('bank_accounts', 'last_reconciled_at')
    op.drop_column('bank_accounts', 'statement_date')
    op.drop_column('bank_accounts', 'statement_balance')
