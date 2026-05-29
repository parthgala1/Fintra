import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, String, Numeric, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from database import Base


class BudgetReport(Base):
    """BudgetReport model for periodic budget analysis."""

    __tablename__ = "budget_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    budget_id = Column(UUID(as_uuid=True), ForeignKey("budgets.id"), nullable=False)
    
    # Report period
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)
    
    # Income for the period
    total_income = Column(Numeric(15, 2), nullable=False, default=0)
    
    # Budget amounts
    budgeted_needs = Column(Numeric(15, 2), nullable=True)
    budgeted_wants = Column(Numeric(15, 2), nullable=True)
    budgeted_savings = Column(Numeric(15, 2), nullable=True)
    total_budgeted = Column(Numeric(15, 2), nullable=True)
    
    # Actual spending
    actual_needs = Column(Numeric(15, 2), nullable=True)
    actual_wants = Column(Numeric(15, 2), nullable=True)
    actual_savings = Column(Numeric(15, 2), nullable=True)
    total_spent = Column(Numeric(15, 2), nullable=True)
    
    # Deviation from budget
    needs_deviation = Column(Numeric(15, 2), nullable=True)
    wants_deviation = Column(Numeric(15, 2), nullable=True)
    savings_deviation = Column(Numeric(15, 2), nullable=True)
    
    # Percentage spent
    needs_percentage_used = Column(Numeric(5, 2), nullable=True)
    wants_percentage_used = Column(Numeric(5, 2), nullable=True)
    savings_percentage_used = Column(Numeric(5, 2), nullable=True)

    # Remaining budget for period
    remaining_budget = Column(Numeric(15, 2), nullable=True)
    
    # Transfer summary (excluded from spending totals)
    transfer_total = Column(Numeric(15, 2), nullable=True, default=0)
    transfer_transaction_count = Column(Numeric(10, 0), nullable=True, default=0)

    # Pending review (needs_review=True transactions)
    pending_review_count = Column(Numeric(10, 0), nullable=True, default=0)
    pending_review_amount = Column(Numeric(15, 2), nullable=True, default=0)

    # Misc categorized (is_misc_category=True — bucket known but semantic unknown)
    misc_categorized_total = Column(Numeric(15, 2), nullable=True, default=0)
    misc_categorized_count = Column(Numeric(10, 0), nullable=True, default=0)

    # AI low-confidence classifications
    low_confidence_total = Column(Numeric(15, 2), nullable=True, default=0)
    low_confidence_count = Column(Numeric(10, 0), nullable=True, default=0)

    # Summary
    is_over_budget = Column(Boolean, default=False)
    summary = Column(Text, nullable=True)
    last_calculated_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<BudgetReport {self.period_start} to {self.period_end}>"
