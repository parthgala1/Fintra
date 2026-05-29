import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, String, Text, Integer, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from database import Base

class ScenarioEvent(Base):
    """
    ScenarioEvent model for event-driven scenario simulation.
    Represents a financial event (e.g., salary raise, job loss, emi_added, etc.)
    that occurs at a specific time, with optional recurrence and payload.
    """
    __tablename__ = "scenario_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scenario_id = Column(UUID(as_uuid=True), ForeignKey("budget_scenarios.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False, index=True)  # e.g., 'salary_raise', 'emi_added', etc.
    effective_date = Column(DateTime(timezone=True), nullable=False)
    recurrence_rule = Column(String(100), nullable=True)  # e.g., 'monthly', 'yearly', RFC5545, etc.
    payload_json = Column(JSON, nullable=True)  # Arbitrary event metadata
    priority = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<ScenarioEvent {self.event_type} {self.effective_date}>"
