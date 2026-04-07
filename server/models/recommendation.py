import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, String, Numeric, Boolean, Text, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import enum

from database import Base


class RecommendationCategory(str, enum.Enum):
    """Recommendation category enum."""
    BUDGET = "budget"
    SAVINGS = "savings"
    INVESTMENT = "investment"
    DEBT = "debt"
    SPENDING = "spending"
    GOALS = "goals"
    TAX = "tax"
    GENERAL = "general"


class RecommendationImpact(str, enum.Enum):
    """Recommendation impact level."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class RecommendationStatus(str, enum.Enum):
    """Recommendation status."""
    NEW = "new"
    DISMISSED = "dismissed"
    IMPLEMENTED = "implemented"
    SNOOZED = "snoozed"


class Recommendation(Base):
    """Recommendation model for financial recommendations."""

    __tablename__ = "recommendations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Recommendation details
    category = Column(SQLEnum(RecommendationCategory), nullable=False, index=True)
    impact = Column(SQLEnum(RecommendationImpact), nullable=False, default=RecommendationImpact.MEDIUM)
    status = Column(SQLEnum(RecommendationStatus), nullable=False, default=RecommendationStatus.NEW)
    
    # Content
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    short_summary = Column(String(500), nullable=True)
    
    # Details
    potential_savings = Column(Numeric(15, 2), nullable=True)
    potential_earnings = Column(Numeric(15, 2), nullable=True)
    estimated_time_to_impact = Column(String(100), nullable=True)
    
    # Action items
    action_steps = Column(Text, nullable=True)  # JSON array as text
    external_resources = Column(Text, nullable=True)  # JSON array as text
    
    # Context (what triggered this recommendation)
    trigger_type = Column(String(50), nullable=True)
    trigger_data = Column(Text, nullable=True)  # JSON object as text
    
    # Dismissal reason
    dismissal_reason = Column(Text, nullable=True)
    
    # Snooze
    snoozed_until = Column(DateTime(timezone=True), nullable=True)
    
    # Implemented
    implemented_at = Column(DateTime(timezone=True), nullable=True)
    
    # Tracking
    view_count = Column(String(10, 0), nullable=True, default=0)
    dismiss_count = Column(String(10, 0), nullable=True, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    __table_args__ = (
        Index('idx_recommendations_user_status', 'user_id', 'status'),
    )

    def __repr__(self):
        return f"<Recommendation {self.title}>"
