import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, String, Numeric, Boolean, Text, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import enum

from database import Base


class GoalType(str, enum.Enum):
    """Goal type enum."""
    EMERGENCY_FUND = "emergency_fund"
    RETIREMENT = "retirement"
    PURCHASE = "purchase"
    DEBT_PAYOFF = "debt_payoff"
    INVESTMENT = "investment"
    SAVINGS = "savings"
    CUSTOM = "custom"


class GoalPriority(str, enum.Enum):
    """Goal priority enum."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class GoalStatus(str, enum.Enum):
    """Goal status enum."""
    ACTIVE = "active"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"


class Goal(Base):
    """Goal model for financial goals with targets and deadlines."""

    __tablename__ = "goals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Goal details
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    goal_type = Column(SQLEnum(GoalType), nullable=False, index=True)
    priority = Column(SQLEnum(GoalPriority), nullable=False, default=GoalPriority.MEDIUM)
    status = Column(SQLEnum(GoalStatus), nullable=False, default=GoalStatus.ACTIVE, index=True)
    
    # Target
    target_amount = Column(Numeric(15, 2), nullable=False)
    current_amount = Column(Numeric(15, 2), nullable=False, default=0)
    
    # Progress
    progress_percentage = Column(Numeric(5, 2), nullable=True, default=0)
    
    # Timeline
    target_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )
    
    # Recurring contribution
    monthly_contribution = Column(Numeric(15, 2), nullable=True)
    
    # Associated bank account (optional - for tracking)
    linked_account_id = Column(UUID(as_uuid=True), nullable=True)
    
    # Notes
    notes = Column(Text, nullable=True)
    
    # Image/icon
    icon = Column(String(50), nullable=True)
    color = Column(String(20), nullable=True)

    __table_args__ = (
        Index('idx_goals_user_status', 'user_id', 'status'),
    )

    def __repr__(self):
        return f"<Goal {self.name}: {self.current_amount}/{self.target_amount}>"
