import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, String, Numeric, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from database import Base


class GoalMilestone(Base):
    """GoalMilestone model for sub-goals within a larger goal."""

    __tablename__ = "goal_milestones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    goal_id = Column(UUID(as_uuid=True), ForeignKey("goals.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Milestone details
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Target
    target_amount = Column(Numeric(15, 2), nullable=False)
    target_percentage = Column(Numeric(5, 2), nullable=True)  # Percentage of main goal
    
    # Progress
    current_amount = Column(Numeric(15, 2), nullable=False, default=0)
    progress_percentage = Column(Numeric(5, 2), nullable=True, default=0)
    
    # Timeline
    target_date = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Status
    is_completed = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    def __repr__(self):
        return f"<GoalMilestone {self.name}: {self.current_amount}/{self.target_amount}>"
