import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, DateTime, String, Numeric, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from database import Base


class ContributionType(str, enum.Enum):
    """Contribution type enum."""
    MANUAL = "manual"
    AUTOMATIC = "automatic"
    ADJUSTMENT = "adjustment"


class GoalContribution(Base):
    """GoalContribution model for tracking contributions to goals."""

    __tablename__ = "goal_contributions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    goal_id = Column(UUID(as_uuid=True), ForeignKey("goals.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Contribution details
    amount = Column(Numeric(15, 2), nullable=False)
    contribution_type = Column(String(20), nullable=False, default=ContributionType.MANUAL)
    
    # Source
    source_account_id = Column(UUID(as_uuid=True), ForeignKey("bank_accounts.id"), nullable=True)
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("transactions.id"), nullable=True)
    
    # Date
    contribution_date = Column(DateTime(timezone=True), nullable=False)
    
    # After contribution
    amount_before = Column(Numeric(15, 2), nullable=False)
    amount_after = Column(Numeric(15, 2), nullable=False)
    progress_before = Column(Numeric(5, 2), nullable=True)
    progress_after = Column(Numeric(5, 2), nullable=True)
    
    # Notes
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<GoalContribution {self.amount} to goal {self.goal_id}>"
