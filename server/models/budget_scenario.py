import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, String, Numeric, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from database import Base


class BudgetScenario(Base):
    """BudgetScenario model for sandbox simulations."""

    __tablename__ = "budget_scenarios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    budget_id = Column(UUID(as_uuid=True), ForeignKey("budgets.id"), nullable=True)
    
    # Scenario details
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Income changes
    income_change = Column(Numeric(15, 2), nullable=True)  # +/- from current
    new_income = Column(Numeric(15, 2), nullable=True)
    
    # Scenario allocations (what-if percentages)
    scenario_needs_percentage = Column(Numeric(5, 2), nullable=True)
    scenario_wants_percentage = Column(Numeric(5, 2), nullable=True)
    scenario_savings_percentage = Column(Numeric(5, 2), nullable=True)
    
    # Scenario amounts
    scenario_needs_amount = Column(Numeric(15, 2), nullable=True)
    scenario_wants_amount = Column(Numeric(15, 2), nullable=True)
    scenario_savings_amount = Column(Numeric(15, 2), nullable=True)
    
    # Comparison
    current_needs_amount = Column(Numeric(15, 2), nullable=True)
    current_wants_amount = Column(Numeric(15, 2), nullable=True)
    current_savings_amount = Column(Numeric(15, 2), nullable=True)
    
    # Impact analysis
    needs_impact = Column(Numeric(15, 2), nullable=True)  # Change from current
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
