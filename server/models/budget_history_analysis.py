import uuid
from datetime import date
from sqlalchemy import Column, DateTime, String, Numeric, Date, JSON, Index, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from database import Base


class BudgetHistoryAnalysis(Base):
    """
    Stores historical spending breakdown for a budget.
    
    This model captures the analysis of past transactions used to create
    the initial budget allocations. It allows users to review what was analyzed
    and provides a reference for how allocations were determined.
    """

    __tablename__ = "budget_history_analysis"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    budget_id = Column(UUID(as_uuid=True), ForeignKey("budgets.id"), nullable=True, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Analysis period
    analysis_start_date = Column(Date, nullable=False)
    analysis_end_date = Column(Date, nullable=False)
    
    # Rollup totals (in absolute amounts)
    total_spending = Column(Numeric(15, 2), nullable=False, default=0)
    needs_total = Column(Numeric(15, 2), nullable=False, default=0)
    wants_total = Column(Numeric(15, 2), nullable=False, default=0)
    savings_total = Column(Numeric(15, 2), nullable=False, default=0)
    investments_total = Column(Numeric(15, 2), nullable=False, default=0)
    
    # Rollup percentages (of total spending)
    needs_percentage = Column(Numeric(5, 2), nullable=False, default=0)
    wants_percentage = Column(Numeric(5, 2), nullable=False, default=0)
    savings_percentage = Column(Numeric(5, 2), nullable=False, default=0)
    investments_percentage = Column(Numeric(5, 2), nullable=False, default=0)
    
    # Detailed breakdown (JSON structure)
    # {
    #   "Needs": {
    #     "Housing": { "amount": "15000.00", "percentage": 35.00, "icon": "home", "color": "#10b981", "transaction_count": 2 },
    #     "Food": { "amount": "5000.00", "percentage": 11.67, "icon": "utensils", "color": "#f59e0b", "transaction_count": 45 },
    #     ...
    #   },
    #   "Wants": { ... },
    #   ...
    # }
    category_breakdown = Column(JSON, nullable=False, default=dict)
    
    # Data quality assessment
    total_transactions = Column(Numeric(15, 0), nullable=False, default=0)
    data_quality = Column(String(50), nullable=False, default="low")  # low, moderate, high
    validation_warnings = Column(JSON, nullable=False, default=list)  # List of warning strings
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    __table_args__ = (
        Index("ix_budget_history_analysis_budget_id", "budget_id"),
        Index("ix_budget_history_analysis_user_id", "user_id"),
    )
