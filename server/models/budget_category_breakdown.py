import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, String, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from database import Base


class BudgetCategoryBreakdown(Base):
    """BudgetCategoryBreakdown model for per-category deviation tracking."""

    __tablename__ = "budget_category_breakdowns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    budget_report_id = Column(UUID(as_uuid=True), ForeignKey("budget_reports.id"), nullable=False, index=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)
    
    # Category info (denormalized for easier querying)
    category_name = Column(String(100), nullable=False)
    category_type = Column(String(20), nullable=False)  # needs, wants, savings, income
    
    # Budget allocation for this category
    budgeted_amount = Column(Numeric(15, 2), nullable=False)
    
    # Actual spending in this category
    actual_amount = Column(Numeric(15, 2), nullable=False, default=0)
    
    # Deviation
    deviation = Column(Numeric(15, 2), nullable=True)  # actual - budgeted (negative = under budget)
    deviation_percentage = Column(Numeric(10, 2), nullable=True)  # widened to handle large overruns
    
    # Transaction count
    transaction_count = Column(Numeric(10, 0), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<BudgetCategoryBreakdown {self.category_name}: {self.actual_amount}/{self.budgeted_amount}>"
