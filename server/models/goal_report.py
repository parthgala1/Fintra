import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, String, Numeric, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from database import Base


class GoalReport(Base):
    """GoalReport model for goal feasibility analysis."""

    __tablename__ = "goal_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    goal_id = Column(UUID(as_uuid=True), ForeignKey("goals.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Report details
    report_date = Column(DateTime(timezone=True), nullable=False)
    
    # Goal state at report time
    goal_amount = Column(Numeric(15, 2), nullable=False)
    current_amount = Column(Numeric(15, 2), nullable=False)
    target_date = Column(DateTime(timezone=True), nullable=True)
    
    # Analysis
    projected_amount_on_target_date = Column(Numeric(15, 2), nullable=True)
    projected_completion_date = Column(DateTime(timezone=True), nullable=True)
    months_remaining = Column(Numeric(10, 0), nullable=True)
    
    # Feasibility assessment
    is_on_track = Column(Boolean, nullable=True)
    shortfall_amount = Column(Numeric(15, 2), nullable=True)
    shortfall_percentage = Column(Numeric(5, 2), nullable=True)
    
    # Required contribution to meet goal
    required_monthly_contribution = Column(Numeric(15, 2), nullable=True)
    current_monthly_contribution = Column(Numeric(15, 2), nullable=True)
    additional_monthly_needed = Column(Numeric(15, 2), nullable=True)
    
    # Risk assessment
    risk_level = Column(String(20), nullable=True)  # low, medium, high
    risk_factors = Column(Text, nullable=True)
    
    # Recommendations
    recommendations = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<GoalReport for goal {self.goal_id} on {self.report_date}>"
