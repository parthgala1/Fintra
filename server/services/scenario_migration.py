"""
Backward compatibility: Migrate existing scenarios to event-driven model.

This migration creates a default event for each existing scenario,
allowing them to work with the new simulation engine.
"""

from decimal import Decimal
from datetime import datetime
from sqlalchemy.orm import Session
from uuid import uuid4

from models import BudgetScenario, ScenarioEvent


def migrate_scenarios_to_events(db: Session):
    """
    Create default events for existing scenarios.
    
    For each scenario, creates an initial event representing the
    original scenario configuration.
    """
    scenarios = db.query(BudgetScenario).filter(
        ~BudgetScenario.scenario_events.any()
    ).all()
    
    migrated_count = 0
    
    for scenario in scenarios:
        # Create a default event representing the scenario's initial state
        payload = {
            "income_change": float(scenario.income_change or 0),
            "needs_percentage": float(scenario.scenario_needs_percentage or 50),
            "wants_percentage": float(scenario.scenario_wants_percentage or 30),
            "savings_percentage": float(scenario.scenario_savings_percentage or 20),
        }
        
        event = ScenarioEvent(
            id=uuid4(),
            scenario_id=scenario.id,
            event_type="initial_configuration",
            effective_date=scenario.created_at or datetime.utcnow(),
            recurrence_rule=None,
            payload_json=payload,
            priority=0,
        )
        
        db.add(event)
        migrated_count += 1
    
    db.commit()
    return migrated_count
