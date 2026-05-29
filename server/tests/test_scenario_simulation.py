"""Tests for scenario simulation engine."""

import os
import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from uuid import uuid4

pytestmark = pytest.mark.skipif(
    "postgresql" not in os.getenv("TEST_DATABASE_URL", "sqlite"),
    reason="Simulation tests require PostgreSQL (set TEST_DATABASE_URL)",
)

from models import (
    User,
    Budget,
    BudgetScenario,
    ScenarioEvent,
    ScenarioSnapshot,
    Goal,
)
from services.scenario_simulation_engine import ScenarioSimulationEngine


@pytest.fixture
def test_user(db: Session):
    """Create test user."""
    user = User(
        id=uuid4(),
        email="test@example.com",
        password_hash="hashed",
        is_verified=True,
    )
    db.add(user)
    db.commit()
    return user


@pytest.fixture
def test_budget(db: Session, test_user: User):
    """Create test budget."""
    budget = Budget(
        id=uuid4(),
        user_id=test_user.id,
        name="Test Budget",
        type="50/30/20",
        period="monthly",
        monthly_income=Decimal("100000"),
        needs_percentage=Decimal("50"),
        wants_percentage=Decimal("30"),
        savings_percentage=Decimal("20"),
        start_date=datetime.utcnow().date(),
    )
    db.add(budget)
    db.commit()
    return budget


@pytest.fixture
def test_goal(db: Session, test_user: User):
    """Create test goal."""
    goal = Goal(
        id=uuid4(),
        user_id=test_user.id,
        name="Test Goal",
        goal_type="savings",
        target_amount=Decimal("1000000"),
        current_amount=Decimal("0"),
        start_date=datetime.utcnow().date(),
    )
    db.add(goal)
    db.commit()
    return goal


@pytest.fixture
def test_scenario(db: Session, test_user: User, test_budget: Budget, test_goal: Goal):
    """Create test scenario."""
    scenario = BudgetScenario(
        id=uuid4(),
        user_id=test_user.id,
        budget_id=test_budget.id,
        goal_id=test_goal.id,
        name="Test Scenario",
        scenario_type="goal_achievement",
        simulation_horizon_months=12,
        strategy_type="balanced",
    )
    db.add(scenario)
    db.commit()
    return scenario


def test_simulate_scenario(db: Session, test_scenario: BudgetScenario):
    """Test basic scenario simulation."""
    engine = ScenarioSimulationEngine(db)
    snapshots = engine.simulate(test_scenario)

    assert len(snapshots) == 12
    assert all(isinstance(s, ScenarioSnapshot) for s in snapshots)
    assert snapshots[0].month_index == 0
    assert snapshots[-1].month_index == 11


def test_scenario_with_events(
    db: Session, test_scenario: BudgetScenario
):
    """Test scenario simulation with events."""
    # Add salary raise event
    event = ScenarioEvent(
        id=uuid4(),
        scenario_id=test_scenario.id,
        event_type="salary_raise",
        effective_date=datetime.utcnow() + timedelta(days=30),
        priority=0,
        payload_json={"amount": 10000},
    )
    db.add(event)
    db.commit()

    engine = ScenarioSimulationEngine(db)
    snapshots = engine.simulate(test_scenario)

    assert len(snapshots) == 12
    # Verify that income increases after the event
    assert snapshots[1].projected_income > snapshots[0].projected_income


def test_feasibility_scoring(db: Session, test_scenario: BudgetScenario):
    """Test feasibility score computation."""
    engine = ScenarioSimulationEngine(db)
    snapshots = engine.simulate(test_scenario)

    # Feasibility score should be between 0-100
    assert 0 <= test_scenario.feasibility_score <= 100

    # With positive cash flow, feasibility should be decent
    positive_months = sum(1 for s in snapshots if (s.projected_savings or 0) > 0)
    if positive_months > 6:
        assert test_scenario.feasibility_score > 30


def test_compare_scenarios(db: Session, test_user: User, test_budget: Budget):
    """Test scenario comparison."""
    # Create two scenarios
    scenario1 = BudgetScenario(
        id=uuid4(),
        user_id=test_user.id,
        budget_id=test_budget.id,
        name="Scenario 1",
        simulation_horizon_months=12,
    )
    scenario2 = BudgetScenario(
        id=uuid4(),
        user_id=test_user.id,
        budget_id=test_budget.id,
        name="Scenario 2",
        simulation_horizon_months=12,
    )
    db.add_all([scenario1, scenario2])
    db.commit()

    engine = ScenarioSimulationEngine(db)
    engine.simulate(scenario1)
    engine.simulate(scenario2)

    comparison = engine.compare_scenarios([str(scenario1.id), str(scenario2.id)])

    assert len(comparison) == 2
    assert str(scenario1.id) in comparison
    assert str(scenario2.id) in comparison
    assert "snapshots" in comparison[str(scenario1.id)]
    assert len(comparison[str(scenario1.id)]["snapshots"]) == 12


def test_health_score_calculation(db: Session, test_scenario: BudgetScenario):
    """Test health score calculation."""
    engine = ScenarioSimulationEngine(db)
    snapshots = engine.simulate(test_scenario)

    for snapshot in snapshots:
        # Health score should be 0-100
        assert 0 <= snapshot.health_score <= 100

        # Health score should consider savings rate
        if snapshot.projected_income > 0:
            savings_rate = snapshot.projected_savings / snapshot.projected_income
            if savings_rate > 0.3:
                assert snapshot.health_score > 40
