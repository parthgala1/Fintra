import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, String, Numeric, Boolean, Text, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import enum

from database import Base


class AIInsightType(str, enum.Enum):
    """AI insight type enum."""
    SPENDING_PATTERN = "spending_pattern"
    SAVINGS_OPPORTUNITY = "savings_opportunity"
    BUDGET_ADJUSTMENT = "budget_adjustment"
    GOAL_RECOMMENDATION = "goal_recommendation"
    INVESTMENT_SUGGESTION = "investment_suggestion"
    DEBT_STRATEGY = "debt_strategy"
    CASH_FLOW = "cash_flow"
    TREND_ANALYSIS = "trend_analysis"
    ANOMALY_DETECTION = "anomaly_detection"
    GENERAL = "general"


class AIInsightCategory(str, enum.Enum):
    """AI insight category."""
    SPENDING = "spending"
    SAVINGS = "savings"
    BUDGET = "budget"
    GOALS = "goals"
    INVESTMENTS = "investments"
    DEBT = "debt"
    CASH_FLOW = "cash_flow"


class AIInsightStatus(str, enum.Enum):
    """AI insight status."""
    NEW = "new"
    VIEWED = "viewed"
    DISMISSED = "dismissed"
    BOOKMARKED = "bookmarked"


class AIInsight(Base):
    """AIInsight model for AI-generated insights."""

    __tablename__ = "ai_insights"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Insight details
    insight_type = Column(SQLEnum(AIInsightType), nullable=False, index=True)
    category = Column(SQLEnum(AIInsightCategory), nullable=False, index=True)
    status = Column(SQLEnum(AIInsightStatus), nullable=False, default=AIInsightStatus.NEW)
    
    # Content
    title = Column(String(255), nullable=False)
    summary = Column(String(500), nullable=True)
    description = Column(Text, nullable=False)
    detailed_analysis = Column(Text, nullable=True)
    
    # Data points (JSON as text for flexibility)
    data_points = Column(Text, nullable=True)
    supporting_data = Column(Text, nullable=True)
    
    # Confidence and relevance
    confidence_score = Column(Numeric(5, 2), nullable=True)  # 0-100
    relevance_score = Column(Numeric(5, 2), nullable=True)  # 0-100
    
    # Time context
    time_period_start = Column(DateTime(timezone=True), nullable=True)
    time_period_end = Column(DateTime(timezone=True), nullable=True)
    generated_for_date = Column(DateTime(timezone=True), nullable=True)
    
    # Impact estimation
    potential_impact = Column(String(50), nullable=True)  # low, medium, high
    estimated_savings = Column(Numeric(15, 2), nullable=True)
    
    # Action items
    action_items = Column(Text, nullable=True)  # JSON array
    recommendations = Column(Text, nullable=True)  # JSON array
    
    # Related entities
    related_categories = Column(Text, nullable=True)  # JSON array of category IDs
    related_goals = Column(Text, nullable=True)  # JSON array of goal IDs
    
    # User interaction
    view_count = Column(String(10, 0), nullable=True, default=0)
    dismiss_reason = Column(Text, nullable=True)
    bookmarked_at = Column(DateTime(timezone=True), nullable=True)
    
    # Generation info
    model_version = Column(String(50), nullable=True)
    generation_prompt = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    __table_args__ = (
        Index('idx_ai_insights_user_status', 'user_id', 'status'),
        Index('idx_ai_insights_user_category', 'user_id', 'category'),
    )

    def __repr__(self):
        return f"<AIInsight {self.title}>"
