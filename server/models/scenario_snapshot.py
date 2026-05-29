import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, Numeric, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from database import Base

class ScenarioSnapshot(Base):
    """
    ScenarioSnapshot model for caching scenario simulation results by month.
    Stores projected values for each month in the simulation horizon.
    """
    __tablename__ = "scenario_snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scenario_id = Column(UUID(as_uuid=True), ForeignKey("budget_scenarios.id", ondelete="CASCADE"), nullable=False, index=True)
    month_index = Column(Integer, nullable=False)  # 0 = start month, 1 = next month, ...
    projected_income = Column(Numeric(15, 2), nullable=True)
    projected_expenses = Column(Numeric(15, 2), nullable=True)
    projected_savings = Column(Numeric(15, 2), nullable=True)
    emergency_fund_balance = Column(Numeric(15, 2), nullable=True)
    debt_balance = Column(Numeric(15, 2), nullable=True)
    goal_progress = Column(Numeric(10, 4), nullable=True)  # 0.0 - 1.0
    health_score = Column(Numeric(5, 2), nullable=True)  # 0-100
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<ScenarioSnapshot scenario={self.scenario_id} month={self.month_index}>"
