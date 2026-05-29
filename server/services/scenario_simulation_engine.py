"""
Scenario Simulation Engine

Provides event-driven financial simulation for budget scenarios.
Supports:
- Timeline-based forecasting
- Event processing (salary changes, expenses, debt, etc.)
- Goal progress tracking
- Feasibility scoring
- Health metrics computation
"""

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
import logging

from models import (
    BudgetScenario,
    ScenarioEvent,
    ScenarioSnapshot,
    Budget,
    Goal,
    Transaction,
    Category,
)
from schemas.scenario_snapshot import ScenarioSnapshotCreate

logger = logging.getLogger(__name__)


class ScenarioSimulationEngine:
    """
    Event-driven financial simulation engine for budget scenarios.
    
    Processes events chronologically, computes monthly projections,
    tracks goal progress, and scores feasibility.
    """

    def __init__(self, db: Session):
        self.db = db

    def simulate(
        self,
        scenario: BudgetScenario,
        base_date: Optional[datetime] = None,
        clear_existing: bool = True,
    ) -> List[ScenarioSnapshot]:
        """
        Simulate a scenario over its horizon, producing snapshots for each month.
        
        Args:
            scenario: The BudgetScenario to simulate.
            base_date: Start date for simulation. Defaults to now.
            clear_existing: If True, delete existing snapshots before creating new ones.
        
        Returns:
            List of ScenarioSnapshot objects for each month in the horizon.
        """
        logger.info(f"Starting simulation for scenario {scenario.id}")
        
        if not base_date:
            base_date = datetime.utcnow()
        
        # Clear existing snapshots if requested
        if clear_existing:
            self.db.query(ScenarioSnapshot).filter(
                ScenarioSnapshot.scenario_id == scenario.id
            ).delete()
            self.db.commit()
        
        # Initialize state
        snapshots = []
        budget = self.db.query(Budget).filter(Budget.id == scenario.budget_id).first()
        goal = None
        if scenario.goal_id:
            goal = self.db.query(Goal).filter(Goal.id == scenario.goal_id).first()
        
        # Get baseline data
        baseline_income, baseline_expenses = self._get_baseline_income_and_expenses(
            budget, base_date
        )
        goal_target = goal.target_amount if goal else Decimal(0)
        goal_current = goal.current_amount if goal else Decimal(0)
        
        # Get all events sorted by date
        events = self.db.query(ScenarioEvent).filter(
            ScenarioEvent.scenario_id == scenario.id
        ).order_by(ScenarioEvent.effective_date).all()
        
        # Simulate each month
        for month_index in range(scenario.simulation_horizon_months):
            current_month = base_date + timedelta(days=30 * month_index)
            
            # Compute state for this month
            (
                income,
                expenses,
                savings,
                efund_balance,
                debt_balance,
                goal_progress,
                health_score,
            ) = self._compute_month_state(
                scenario=scenario,
                month_index=month_index,
                base_date=base_date,
                baseline_income=baseline_income,
                baseline_expenses=baseline_expenses,
                budget=budget,
                goal=goal,
                events=events,
            )
            
            # Create snapshot
            snapshot = ScenarioSnapshot(
                scenario_id=scenario.id,
                month_index=month_index,
                projected_income=income,
                projected_expenses=expenses,
                projected_savings=savings,
                emergency_fund_balance=efund_balance,
                debt_balance=debt_balance,
                goal_progress=goal_progress,
                health_score=health_score,
            )
            self.db.add(snapshot)
            snapshots.append(snapshot)
        
        # Update scenario feasibility score
        feasibility = self._compute_feasibility_score(
            scenario, snapshots, goal, goal_target, goal_current
        )
        scenario.feasibility_score = feasibility
        
        self.db.commit()
        logger.info(
            f"Simulation complete for scenario {scenario.id}: "
            f"{len(snapshots)} snapshots, feasibility={feasibility}"
        )
        
        return snapshots

    def _get_baseline_income_and_expenses(
        self, budget: Optional[Budget], reference_date: datetime
    ) -> Tuple[Decimal, Decimal]:
        """Extract baseline monthly income and expenses from budget data."""
        if not budget:
            return Decimal(0), Decimal(0)
        
        # For simplicity, use monthly_income and compute expenses from budget categories
        income = Decimal(str(budget.monthly_income)) if budget.monthly_income else Decimal(0)
        
        # Compute expenses from budget categories
        expenses = Decimal(0)
        for cat in budget.budget_categories:
            if cat.amount:
                expenses += Decimal(str(cat.amount))
        
        return income, expenses

    def _compute_month_state(
        self,
        scenario: BudgetScenario,
        month_index: int,
        base_date: datetime,
        baseline_income: Decimal,
        baseline_expenses: Decimal,
        budget: Optional[Budget],
        goal: Optional[Goal],
        events: List[ScenarioEvent],
    ) -> Tuple[Decimal, Decimal, Decimal, Decimal, Decimal, Decimal, Decimal]:
        """
        Compute projected state for a specific month.
        
        Returns: (income, expenses, savings, efund_balance, debt_balance, goal_progress, health_score)
        """
        # Initialize with baseline
        income = baseline_income
        expenses = baseline_expenses
        
        # Apply events effective before/during this month
        current_month = base_date + timedelta(days=30 * month_index)
        for event in events:
            if event.effective_date <= current_month:
                income, expenses = self._apply_event(
                    event, income, expenses
                )
        
        # Compute derived metrics
        savings = income - expenses
        
        # Emergency fund (simplified: accumulate savings)
        efund_balance = savings * Decimal(scenario.simulation_horizon_months - month_index)
        
        # Debt balance (simplified)
        debt_balance = Decimal(0)
        
        # Goal progress
        goal_progress = Decimal(0)
        if goal:
            goal_monthly_contribution = savings * Decimal("0.2")  # 20% of savings to goal
            total_contribution = goal_monthly_contribution * Decimal(month_index + 1)
            goal_progress = min(
                Decimal(1),
                (goal.current_amount + total_contribution) / goal.target_amount
                if goal.target_amount > 0
                else Decimal(0),
            )
        
        # Health score (0-100)
        health_score = self._compute_health_score(income, expenses, savings, goal_progress)
        
        return income, expenses, savings, efund_balance, debt_balance, goal_progress, health_score

    def _apply_event(
        self, event: ScenarioEvent, income: Decimal, expenses: Decimal
    ) -> Tuple[Decimal, Decimal]:
        """Apply an event's effects to income and expenses."""
        if not event.payload_json:
            return income, expenses
        
        payload = event.payload_json
        
        if event.event_type == "salary_raise":
            amount = Decimal(str(payload.get("amount", 0)))
            income += amount
        
        elif event.event_type == "salary_cut":
            amount = Decimal(str(payload.get("amount", 0)))
            income -= amount
        
        elif event.event_type == "expense_added":
            amount = Decimal(str(payload.get("amount", 0)))
            expenses += amount
        
        elif event.event_type == "expense_removed":
            amount = Decimal(str(payload.get("amount", 0)))
            expenses = max(Decimal(0), expenses - amount)
        
        elif event.event_type == "emi_added":
            amount = Decimal(str(payload.get("amount", 0)))
            expenses += amount
        
        elif event.event_type == "emi_cleared":
            amount = Decimal(str(payload.get("amount", 0)))
            expenses = max(Decimal(0), expenses - amount)
        
        # Add more event types as needed
        
        return income, expenses

    def _compute_health_score(
        self,
        income: Decimal,
        expenses: Decimal,
        savings: Decimal,
        goal_progress: Decimal,
    ) -> Decimal:
        """
        Compute a health score (0-100) based on financial metrics.
        
        Higher savings rate and goal progress = higher score.
        """
        if income <= 0:
            return Decimal(0)
        
        savings_rate = savings / income
        
        # Score: 50% savings rate + 30% goal progress + 20% expense ratio
        score = (
            savings_rate * Decimal(50)
            + goal_progress * Decimal(30)
            + (Decimal(1) - min(Decimal(1), expenses / income)) * Decimal(20)
        )
        
        return min(Decimal(100), max(Decimal(0), score))

    def _compute_feasibility_score(
        self,
        scenario: BudgetScenario,
        snapshots: List[ScenarioSnapshot],
        goal: Optional[Goal],
        goal_target: Decimal,
        goal_current: Decimal,
    ) -> Decimal:
        """
        Compute feasibility score (0-100) for the scenario.
        
        Considers:
        - Positive cash flow throughout horizon
        - Goal achievement likelihood
        - Stability of metrics
        """
        if not snapshots:
            return Decimal(0)
        
        # Average health score
        avg_health = Decimal(sum(s.health_score or 0 for s in snapshots)) / len(snapshots)
        
        # Positive cash flow count
        positive_months = sum(1 for s in snapshots if (s.projected_savings or 0) > 0)
        positive_ratio = Decimal(positive_months) / len(snapshots)
        
        # Goal achievement if applicable
        goal_feasibility = Decimal(0)
        if goal:
            final_progress = snapshots[-1].goal_progress or Decimal(0)
            goal_feasibility = final_progress * Decimal(100)
        else:
            goal_feasibility = Decimal(50)  # Neutral if no goal
        
        # Compute weighted feasibility
        feasibility = (
            avg_health * Decimal("0.4")
            + positive_ratio * Decimal("100") * Decimal("0.3")
            + goal_feasibility * Decimal("0.3")
        )
        
        return min(Decimal(100), max(Decimal(0), feasibility))

    def get_snapshots(self, scenario_id: str) -> List[ScenarioSnapshot]:
        """Retrieve all snapshots for a scenario."""
        return self.db.query(ScenarioSnapshot).filter(
            ScenarioSnapshot.scenario_id == scenario_id
        ).order_by(ScenarioSnapshot.month_index).all()

    def compare_scenarios(
        self, scenario_ids: List[str]
    ) -> Dict[str, Any]:
        """
        Compare multiple scenarios and return comparative metrics.
        """
        comparison = {}
        
        for scenario_id in scenario_ids:
            scenario = self.db.query(BudgetScenario).filter(
                BudgetScenario.id == scenario_id
            ).first()
            
            if not scenario:
                continue
            
            snapshots = self.get_snapshots(scenario_id)
            
            comparison[scenario_id] = {
                "scenario": {
                    "id": str(scenario.id),
                    "name": scenario.name,
                    "feasibility_score": float(scenario.feasibility_score or 0),
                },
                "snapshots": [
                    {
                        "month_index": s.month_index,
                        "projected_income": float(s.projected_income or 0),
                        "projected_expenses": float(s.projected_expenses or 0),
                        "projected_savings": float(s.projected_savings or 0),
                        "emergency_fund_balance": float(s.emergency_fund_balance or 0),
                        "debt_balance": float(s.debt_balance or 0),
                        "goal_progress": float(s.goal_progress or 0),
                        "health_score": float(s.health_score or 0),
                    }
                    for s in snapshots
                ],
            }
        
        return comparison
