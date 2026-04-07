import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, String, Numeric, Boolean, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from database import Base


class FinancialSession(Base):
    """FinancialSession model for historical snapshots of user's financial state."""

    __tablename__ = "financial_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Session details
    name = Column(String(255), nullable=False)
    session_date = Column(DateTime(timezone=True), nullable=False, index=True)
    
    # Snapshot balances
    total_assets = Column(Numeric(15, 2), nullable=True)
    total_liabilities = Column(Numeric(15, 2), nullable=True)
    net_worth = Column(Numeric(15, 2), nullable=True)
    
    # Account balances snapshot
    checking_balance = Column(Numeric(15, 2), nullable=True)
    savings_balance = Column(Numeric(15, 2), nullable=True)
    credit_card_balance = Column(Numeric(15, 2), nullable=True)
    investment_balance = Column(Numeric(15, 2), nullable=True)
    
    # Income snapshot
    total_income_monthly = Column(Numeric(15, 2), nullable=True)
    total_income_yearly = Column(Numeric(15, 2), nullable=True)
    
    # Expense snapshot
    total_expenses_monthly = Column(Numeric(15, 2), nullable=True)
    total_expenses_yearly = Column(Numeric(15, 2), nullable=True)
    
    # Budget snapshot
    needs_spent = Column(Numeric(15, 2), nullable=True)
    wants_spent = Column(Numeric(15, 2), nullable=True)
    savings_spent = Column(Numeric(15, 2), nullable=True)
    
    # Goals snapshot
    total_goal_progress = Column(Numeric(5, 2), nullable=True)  # Average progress %
    active_goals_count = Column(String(5, 0), nullable=True)
    completed_goals_count = Column(String(5, 0), nullable=True)
    
    # Cash flow
    cash_flow = Column(Numeric(15, 2), nullable=True)  # income - expenses
    savings_rate = Column(Numeric(5, 2), nullable=True)  # savings / income %
    
    # Additional data (JSON as text for flexibility)
    additional_data = Column(Text, nullable=True)
    
    # Notes
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index('idx_financial_session_user_date', 'user_id', 'session_date'),
    )

    def __repr__(self):
        return f"<FinancialSession {self.name} - {self.session_date}>"
