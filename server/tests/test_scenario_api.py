"""Integration tests for scenario event and simulation API endpoints."""

import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4
from datetime import datetime

from main import app
from models import User, Budget, BudgetScenario

pytestmark = pytest.mark.skipif(
    "postgresql" not in os.getenv("TEST_DATABASE_URL", "sqlite"),
    reason="Integration tests require PostgreSQL (set TEST_DATABASE_URL)",
)
from database import get_db

client = TestClient(app)


@pytest.fixture
def test_user_token(db: Session):
    """Create a test user and return auth token."""
    from auth.password import get_password_hash

    user = User(
        id=uuid4(),
        email="test@example.com",
        password_hash=get_password_hash("password123"),
        is_verified=True,
    )
    db.add(user)
    db.commit()

    # Login to get token
    response = client.post(
        "/api/login",
        json={"email": "test@example.com", "password": "password123"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return token, user.id


@pytest.fixture
def test_scenario(db: Session, test_user_token):
    """Create a test scenario."""
    token, user_id = test_user_token

    # Create budget
    budget = Budget(
        id=uuid4(),
        user_id=user_id,
        name="Test Budget",
        type="50/30/20",
        period="monthly",
        monthly_income=100000,
        start_date=datetime.utcnow().date(),
    )
    db.add(budget)
    db.commit()

    # Create scenario
    scenario = BudgetScenario(
        id=uuid4(),
        user_id=user_id,
        budget_id=budget.id,
        name="Test Scenario",
        simulation_horizon_months=12,
    )
    db.add(scenario)
    db.commit()

    return token, scenario.id


def test_create_scenario_event(test_scenario):
    """Test creating a scenario event."""
    token, scenario_id = test_scenario

    response = client.post(
        f"/api/scenarios/{scenario_id}/events",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "event_type": "salary_raise",
            "effective_date": "2026-06-15T00:00:00Z",
            "payload_json": {"amount": 10000},
            "priority": 0,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["event_type"] == "salary_raise"
    assert data["payload_json"]["amount"] == 10000


def test_list_scenario_events(test_scenario):
    """Test listing scenario events."""
    token, scenario_id = test_scenario

    # Create an event first
    client.post(
        f"/api/scenarios/{scenario_id}/events",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "event_type": "salary_raise",
            "effective_date": "2026-06-15T00:00:00Z",
            "payload_json": {"amount": 10000},
        },
    )

    # List events
    response = client.get(
        f"/api/scenarios/{scenario_id}/events",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    events = response.json()
    assert len(events) == 1
    assert events[0]["event_type"] == "salary_raise"


def test_simulate_scenario(test_scenario):
    """Test scenario simulation endpoint."""
    token, scenario_id = test_scenario

    response = client.post(
        f"/api/scenarios/{scenario_id}/simulate",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    snapshots = response.json()
    assert len(snapshots) == 12  # 12-month horizon
    assert all("projected_income" in s for s in snapshots)
    assert all("health_score" in s for s in snapshots)


def test_compare_scenarios(test_scenario, db: Session):
    """Test scenario comparison endpoint."""
    token, scenario_id = test_scenario

    # Create another scenario to compare
    from models import User

    user = db.query(User).first()
    budget = db.query(Budget).filter(Budget.user_id == user.id).first()
    
    scenario2 = BudgetScenario(
        id=uuid4(),
        user_id=user.id,
        budget_id=budget.id,
        name="Comparison Scenario",
        simulation_horizon_months=12,
    )
    db.add(scenario2)
    db.commit()

    # Simulate both
    client.post(
        f"/api/scenarios/{scenario_id}/simulate",
        headers={"Authorization": f"Bearer {token}"},
    )
    client.post(
        f"/api/scenarios/{scenario2.id}/simulate",
        headers={"Authorization": f"Bearer {token}"},
    )

    # Compare
    response = client.post(
        f"/api/scenarios/{scenario_id}/compare",
        headers={"Authorization": f"Bearer {token}"},
        json={"comparison_scenario_ids": [str(scenario2.id)]},
    )

    assert response.status_code == 200
    comparison = response.json()
    assert str(scenario_id) in comparison
    assert str(scenario2.id) in comparison


def test_unauthorized_access(test_scenario):
    """Test that unauthorized users cannot access scenarios."""
    token, scenario_id = test_scenario

    # Use invalid token
    response = client.post(
        f"/api/scenarios/{scenario_id}/simulate",
        headers={"Authorization": "Bearer invalid_token"},
    )

    assert response.status_code == 401


def test_nonexistent_scenario(test_scenario):
    """Test accessing a non-existent scenario."""
    token, _ = test_scenario
    fake_id = uuid4()

    response = client.post(
        f"/api/scenarios/{fake_id}/simulate",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 404
