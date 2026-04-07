import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, String, Numeric, Boolean, Text, Enum as SQLEnum, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import enum

from database import Base


class RecurringFrequency(str, enum.Enum):
    """Recurring transaction frequency."""
    DAILY = "daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class RecurringStatus(str, enum.Enum):
    """Recurring transaction status."""
    ACTIVE = "active"
    PAUSED = "paused"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class RecurringTransaction(Base):
    """RecurringTransaction model for recurring expenses and income."""

    __tablename__ = "recurring_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    bank_account_id = Column(UUID(as_uuid=True), ForeignKey("bank_accounts.id"), nullable=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True)
    
    # Transaction details
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    amount = Column(Numeric(15, 2), nullable=False)
    transaction_type = Column(String(20), nullable=False)  # income, expense
    
    # Frequency
    frequency = Column(SQLEnum(RecurringFrequency), nullable=False)
    
    # Date rules
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=True)
    next_occurrence = Column(DateTime(timezone=True), nullable=False, index=True)
    last_occurrence = Column(DateTime(timezone=True), nullable=True)
    
    # Specific day of month (for monthly)
    day_of_month = Column(String(2), nullable=True)
    # Day of week (for weekly)
    day_of_week = Column(String(3), nullable=True)
    
    # Status
    status = Column(SQLEnum(RecurringStatus), nullable=False, default=RecurringStatus.ACTIVE)
    
    # Auto-categorization
    auto_categorize = Column(Boolean, default=True)
    
    # Statistics
    total_occurrences = Column(String(10, 0), nullable=True, default=0)
    total_amount = Column(Numeric(15, 2), nullable=True, default=0)
    
    # Notes
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    __table_args__ = (
        Index('idx_recurring_user_next', 'user_id', 'next_occurrence'),
    )

    def __repr__(self):
        return f"<RecurringTransaction {self.name} - {self.amount} ({self.frequency.value})>"
