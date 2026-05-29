import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, String, Numeric, Boolean, Text, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from database import Base


class BudgetScenario(Base):
    """
    BudgetScenario model for event-driven, goal-oriented simulations.
    """
    __tablename__ = "budget_scenarios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    budget_id = Column(UUID(as_uuid=True), ForeignKey("budgets.id"), nullable=True)
    goal_id = Column(UUID(as_uuid=True), ForeignKey("goals.id"), nullable=True)  # New: link to goal (nullable)
    scenario_type = Column(String(50), nullable=False, default="custom")  # e.g., 'custom', 'goal_achievement', etc.
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    simulation_horizon_months = Column(Integer, nullable=False, default=12)  # How many months to simulate
    strategy_type = Column(String(50), nullable=False, default="balanced")  # e.g., 'conservative', 'balanced', 'aggressive'
    feasibility_score = Column(Numeric(5, 2), nullable=True)  # 0-100, computed by engine
    
    # Income changes (legacy/static)
    income_change = Column(Numeric(15, 2), nullable=True)
    new_income = Column(Numeric(15, 2), nullable=True)
    
    # Scenario allocations (legacy/static)
    scenario_needs_percentage = Column(Numeric(5, 2), nullable=True)
    scenario_wants_percentage = Column(Numeric(5, 2), nullable=True)
    scenario_savings_percentage = Column(Numeric(5, 2), nullable=True)
    
    # Scenario amounts (legacy/static)
    scenario_needs_amount = Column(Numeric(15, 2), nullable=True)
    scenario_wants_amount = Column(Numeric(15, 2), nullable=True)
    scenario_savings_amount = Column(Numeric(15, 2), nullable=True)
    
    # Comparison (legacy/static)
    current_needs_amount = Column(Numeric(15, 2), nullable=True)
    current_wants_amount = Column(Numeric(15, 2), nullable=True)
    current_savings_amount = Column(Numeric(15, 2), nullable=True)
    
    # Impact analysis (legacy/static)
    needs_impact = Column(Numeric(15, 2), nullable=True)
    wants_impact = Column(Numeric(15, 2), nullable=True)
    savings_impact = Column(Numeric(15, 2), nullable=True)
    
    # Status
    is_saved = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    def __repr__(self):
        return f"<BudgetScenario {self.name}>"
