import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, String, Numeric, Boolean, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import enum

from database import Base


class BudgetType(str, enum.Enum):
    """Budget type enum."""
    FIFTY_THIRTY_TWENTY = "fifty_thirty_twenty"
    CUSTOM = "custom"


class BudgetPeriod(str, enum.Enum):
    """Budget period enum."""
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"


class Budget(Base):
    """Budget model for budget allocations (50/30/20 or custom)."""

    __tablename__ = "budgets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    budget_type = Column(SQLEnum(BudgetType), nullable=False, default=BudgetType.FIFTY_THIRTY_TWENTY)
    period = Column(SQLEnum(BudgetPeriod), nullable=False, default=BudgetPeriod.MONTHLY)
    
    # Total budget amount for the period
    total_budget = Column(Numeric(15, 2), nullable=False)
    
    # 50/30/20 allocations (percentages)
    needs_percentage = Column(Numeric(5, 2), nullable=False, default=50.00)
    wants_percentage = Column(Numeric(5, 2), nullable=False, default=30.00)
    savings_percentage = Column(Numeric(5, 2), nullable=False, default=20.00)
    
    # 50/30/20 allocated amounts (calculated)
    needs_amount = Column(Numeric(15, 2), nullable=True)
    wants_amount = Column(Numeric(15, 2), nullable=True)
    savings_amount = Column(Numeric(15, 2), nullable=True)
    
    # Date range
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=True)
    
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)  # Default budget for user
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    __table_args__ = (
        Index('idx_budgets_user_active', 'user_id', 'is_active'),
    )

    def __repr__(self):
        return f"<Budget {self.name} - {self.total_budget}>"
