"""
Budget Scenario API router.

Provides endpoints for creating and managing
sandbox budget scenarios for what-if simulations.
"""

import logging
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from auth.router import get_current_user
from database import get_db
from models.budget import Budget, BudgetType, BudgetPeriod
from models.budget_scenario import BudgetScenario
from models.user import User
from schemas.budget_scenario import (
    ScenarioCalculate,
    ScenarioCalculateResponse,
    ScenarioCreate,
    ScenarioListResponse,
    ScenarioResponse,
    ScenarioUpdate,
)
from services.budget_calculator import BudgetCalculator

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/scenarios", tags=["Budget Scenarios"])

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user_dep(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    """Dependency to get current authenticated user."""
    return get_current_user(token, db)


@router.get("", response_model=ScenarioListResponse)
def list_scenarios(
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    List all scenarios for the current user.
    
    Args:
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        List of scenarios
    """
    scenarios = (
        db.query(BudgetScenario)
        .filter(
            BudgetScenario.user_id == current_user.id,
            BudgetScenario.is_active == True,  # noqa: E712
        )
        .order_by(BudgetScenario.created_at.desc())
        .all()
    )
    
    return ScenarioListResponse(
        scenarios=[ScenarioResponse.model_validate(s) for s in scenarios],
        total=len(scenarios),
    )


@router.get("/{scenario_id}", response_model=ScenarioResponse)
def get_scenario(
    scenario_id: UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Get a single scenario by ID.
    
    Args:
        scenario_id: Scenario UUID
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Scenario details
    """
    scenario = (
        db.query(BudgetScenario)
        .filter(
            BudgetScenario.id == scenario_id,
            BudgetScenario.user_id == current_user.id,
        )
        .first()
    )
    
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found",
        )
    
    return scenario


@router.post("", response_model=ScenarioResponse, status_code=status.HTTP_201_CREATED)
def create_scenario(
    scenario_data: ScenarioCreate,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Create a new scenario.
    
    Args:
        scenario_data: Scenario data
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Created scenario
    """
    # If budget_id provided, get current amounts from that budget
    current_needs = Decimal("0")
    current_wants = Decimal("0")
    current_savings = Decimal("0")
    base_income = Decimal("0")
    
    if scenario_data.budget_id:
        budget = (
            db.query(Budget)
            .filter(
                Budget.id == scenario_data.budget_id,
                Budget.user_id == current_user.id,
            )
            .first()
        )
        if budget:
            current_needs = budget.needs_amount or Decimal("0")
            current_wants = budget.wants_amount or Decimal("0")
            current_savings = budget.savings_amount or Decimal("0")
            # Use total budget as base income for calculations
            base_income = budget.total_budget
    
    # Calculate new amounts
    new_income = scenario_data.new_income or (base_income + (scenario_data.income_change or Decimal("0")))
    
    # Use provided percentages or defaults
    needs_pct = scenario_data.scenario_needs_percentage or BudgetCalculator.DEFAULT_NEEDS_PERCENTAGE
    wants_pct = scenario_data.scenario_wants_percentage or BudgetCalculator.DEFAULT_WANTS_PERCENTAGE
    savings_pct = scenario_data.scenario_savings_percentage or BudgetCalculator.DEFAULT_SAVINGS_PERCENTAGE
    
    # Calculate scenario amounts
    amounts = BudgetCalculator.calculate_amounts(
        total_budget=new_income,
        needs_percentage=needs_pct,
        wants_percentage=wants_pct,
        savings_percentage=savings_pct,
        budget_type=BudgetType.CUSTOM,
    )
    
    # Calculate impacts
    needs_impact = amounts["needs_amount"] - current_needs
    wants_impact = amounts["wants_amount"] - current_wants
    savings_impact = amounts["savings_amount"] - current_savings
    
    # Create scenario
    scenario = BudgetScenario(
        user_id=current_user.id,
        budget_id=scenario_data.budget_id,
        name=scenario_data.name,
        description=scenario_data.description,
        income_change=scenario_data.income_change,
        new_income=new_income,
        scenario_needs_percentage=needs_pct,
        scenario_wants_percentage=wants_pct,
        scenario_savings_percentage=savings_pct,
        scenario_needs_amount=amounts["needs_amount"],
        scenario_wants_amount=amounts["wants_amount"],
        scenario_savings_amount=amounts["savings_amount"],
        current_needs_amount=current_needs,
        current_wants_amount=current_wants,
        current_savings_amount=current_savings,
        needs_impact=needs_impact,
        wants_impact=wants_impact,
        savings_impact=savings_impact,
        is_saved=scenario_data.is_saved,
        is_active=True,
    )
    
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    
    logger.info(f"Created scenario {scenario.id} for user {current_user.id}")
    
    return scenario


@router.patch("/{scenario_id}", response_model=ScenarioResponse)
def update_scenario(
    scenario_id: UUID,
    scenario_data: ScenarioUpdate,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Update a scenario.
    
    Args:
        scenario_id: Scenario UUID
        scenario_data: Update data
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Updated scenario
    """
    scenario = (
        db.query(BudgetScenario)
        .filter(
            BudgetScenario.id == scenario_id,
            BudgetScenario.user_id == current_user.id,
        )
        .first()
    )
    
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found",
        )
    
    # Get update data
    update_data = scenario_data.model_dump(exclude_unset=True)
    
    # Recalculate if percentages or income changed
    if any(
        k in update_data
        for k in [
            "income_change",
            "new_income",
            "scenario_needs_percentage",
            "scenario_wants_percentage",
            "scenario_savings_percentage",
        ]
    ):
        # Get values
        new_income = update_data.get("new_income", scenario.new_income) or Decimal("0")
        income_change = update_data.get("income_change", scenario.income_change) or Decimal("0")
        
        # If only income_change provided, add to current new_income
        if "new_income" not in update_data and income_change:
            new_income = (scenario.new_income or Decimal("0")) + income_change
        
        needs_pct = update_data.get(
            "scenario_needs_percentage",
            scenario.scenario_needs_percentage,
        ) or BudgetCalculator.DEFAULT_NEEDS_PERCENTAGE
        wants_pct = update_data.get(
            "scenario_wants_percentage",
            scenario.scenario_wants_percentage,
        ) or BudgetCalculator.DEFAULT_WANTS_PERCENTAGE
        savings_pct = update_data.get(
            "scenario_savings_percentage",
            scenario.scenario_savings_percentage,
        ) or BudgetCalculator.DEFAULT_SAVINGS_PERCENTAGE
        
        # Calculate amounts
        amounts = BudgetCalculator.calculate_amounts(
            total_budget=new_income,
            needs_percentage=needs_pct,
            wants_percentage=wants_pct,
            savings_percentage=savings_pct,
            budget_type=BudgetType.CUSTOM,
        )
        
        # Update values
        update_data["new_income"] = new_income
        update_data["scenario_needs_amount"] = amounts["needs_amount"]
        update_data["scenario_wants_amount"] = amounts["wants_amount"]
        update_data["scenario_savings_amount"] = amounts["savings_amount"]
        
        # Calculate impacts
        update_data["needs_impact"] = amounts["needs_amount"] - (scenario.current_needs_amount or Decimal("0"))
        update_data["wants_impact"] = amounts["wants_amount"] - (scenario.current_wants_amount or Decimal("0"))
        update_data["savings_impact"] = amounts["savings_amount"] - (scenario.current_savings_amount or Decimal("0"))
    
    # Update fields
    for field, value in update_data.items():
        setattr(scenario, field, value)
    
    db.commit()
    db.refresh(scenario)
    
    logger.info(f"Updated scenario {scenario.id}")
    
    return scenario


@router.delete("/{scenario_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scenario(
    scenario_id: UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Delete a scenario.
    
    Args:
        scenario_id: Scenario UUID
        current_user: Current authenticated user
        db: Database session
    """
    scenario = (
        db.query(BudgetScenario)
        .filter(
            BudgetScenario.id == scenario_id,
            BudgetScenario.user_id == current_user.id,
        )
        .first()
    )
    
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found",
        )
    
    # Soft delete
    scenario.is_active = False
    db.commit()
    
    logger.info(f"Deleted (deactivated) scenario {scenario_id}")


@router.post("/{scenario_id}/calculate", response_model=ScenarioCalculateResponse)
def calculate_scenario(
    scenario_id: UUID,
    calc_data: ScenarioCalculate,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Calculate scenario impacts.
    
    Args:
        scenario_id: Scenario UUID
        calc_data: Calculation parameters
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Calculated scenario impacts
    """
    scenario = (
        db.query(BudgetScenario)
        .filter(
            BudgetScenario.id == scenario_id,
            BudgetScenario.user_id == current_user.id,
        )
        .first()
    )
    
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found",
        )
    
    # Get current values
    current_needs = scenario.current_needs_amount or Decimal("0")
    current_wants = scenario.current_wants_amount or Decimal("0")
    current_savings = scenario.current_savings_amount or Decimal("0")
    
    # Calculate new income
    base_income = scenario.new_income or Decimal("0")
    income_change = calc_data.income_change or Decimal("0")
    new_income = calc_data.new_income or (base_income + income_change)
    
    if new_income <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid income value",
        )
    
    # Get percentages
    needs_pct = calc_data.scenario_needs_percentage or BudgetCalculator.DEFAULT_NEEDS_PERCENTAGE
    wants_pct = calc_data.scenario_wants_percentage or BudgetCalculator.DEFAULT_WANTS_PERCENTAGE
    savings_pct = calc_data.scenario_savings_percentage or BudgetCalculator.DEFAULT_SAVINGS_PERCENTAGE
    
    # Validate percentages
    if not BudgetCalculator.validate_percentages(needs_pct, wants_pct, savings_pct):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Percentages must sum to 100",
        )
    
    # Calculate amounts
    amounts = BudgetCalculator.calculate_amounts(
        total_budget=new_income,
        needs_percentage=needs_pct,
        wants_percentage=wants_pct,
        savings_percentage=savings_pct,
        budget_type=BudgetType.CUSTOM,
    )
    
    # Calculate impacts
    needs_impact = amounts["needs_amount"] - current_needs
    wants_impact = amounts["wants_amount"] - current_wants
    savings_impact = amounts["savings_amount"] - current_savings
    
    # Calculate ratios
    expenses = amounts["needs_amount"] + amounts["wants_amount"]
    savings_rate = BudgetCalculator.calculate_savings_rate(new_income, expenses)
    needs_ratio = BudgetCalculator.calculate_needs_ratio(amounts["needs_amount"], new_income)
    wants_ratio = BudgetCalculator.calculate_wants_ratio(amounts["wants_amount"], new_income)
    
    return ScenarioCalculateResponse(
        scenario_id=scenario_id,
        new_income=new_income,
        scenario_needs_amount=amounts["needs_amount"],
        scenario_wants_amount=amounts["wants_amount"],
        scenario_savings_amount=amounts["savings_amount"],
        needs_impact=needs_impact,
        wants_impact=wants_impact,
        savings_impact=savings_impact,
        savings_rate=savings_rate,
        needs_ratio=needs_ratio,
        wants_ratio=wants_ratio,
    )


@router.post("/{scenario_id}/apply", response_model=ScenarioResponse)
def apply_scenario_as_budget(
    scenario_id: UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Apply a scenario as a new budget.
    
    Args:
        scenario_id: Scenario UUID
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Newly created budget from scenario
    """
    scenario = (
        db.query(BudgetScenario)
        .filter(
            BudgetScenario.id == scenario_id,
            BudgetScenario.user_id == current_user.id,
        )
        .first()
    )
    
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found",
        )
    
    if not scenario.scenario_needs_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Scenario has not been calculated",
        )
    
    # Create budget from scenario
    from datetime import datetime
    
    budget = Budget(
        user_id=current_user.id,
        name=f"{scenario.name} (Applied)",
        budget_type=BudgetType.CUSTOM,
        period=BudgetPeriod.MONTHLY,
        total_budget=scenario.new_income,
        needs_percentage=scenario.scenario_needs_percentage or BudgetCalculator.DEFAULT_NEEDS_PERCENTAGE,
        wants_percentage=scenario.scenario_wants_percentage or BudgetCalculator.DEFAULT_WANTS_PERCENTAGE,
        savings_percentage=scenario.scenario_savings_percentage or BudgetCalculator.DEFAULT_SAVINGS_PERCENTAGE,
        needs_amount=scenario.scenario_needs_amount,
        wants_amount=scenario.scenario_wants_amount,
        savings_amount=scenario.scenario_savings_amount,
        start_date=datetime.now(),
        is_active=True,
        is_default=False,
    )
    
    db.add(budget)
    db.commit()
    db.refresh(budget)
    
    # Mark scenario as applied
    scenario.is_active = False
    db.commit()
    
    logger.info(f"Applied scenario {scenario_id} as budget {budget.id}")
    
    return scenario
