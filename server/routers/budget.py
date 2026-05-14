"""
Budget API router.

Provides CRUD endpoints for budgets, including
default budget management.
"""

import logging
from datetime import datetime, time, timedelta
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import or_
from sqlalchemy.orm import Session

from auth.router import get_current_user
from database import get_db
from models.budget_history_analysis import BudgetHistoryAnalysis
from models.budget import Budget, BudgetType, BudgetPeriod
from models.budget_category import BudgetCategory
from models.category import Category, CategoryType
from models.user import User
from schemas.budget_analysis import (
    BudgetAnalysisRequest,
    BudgetAnalysisResponse,
    BudgetCreateWithAnalysisRequest,
    BudgetHistoryAnalysisResponse,
)
from schemas.budget import (
    BudgetCreate,
    BudgetListResponse,
    BudgetResponse,
    BudgetSummary,
    BudgetUpdate,
)
from schemas.budget_generate import BudgetGenerateResponse
from services.budget_analysis_service import BudgetAnalysisService
from services.budget_calculator import BudgetCalculator
from services.budget_generator import BudgetGenerator
from services.constraint_engine import ConstraintEngine, ConstraintType

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/budgets", tags=["Budgets"])

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user_dep(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    """Dependency to get current authenticated user."""
    return get_current_user(token, db)


def _initialize_budget_allocations(db: Session, user_id: UUID, budget: Budget) -> None:
    existing = (
        db.query(BudgetCategory)
        .filter(BudgetCategory.budget_id == budget.id)
        .count()
    )
    if existing > 0:
        return

    categories = (
        db.query(Category)
        .filter(
            or_(Category.user_id == user_id, Category.is_system == True),  # noqa: E712
            Category.is_active == True,  # noqa: E712
            Category.category_type.in_([CategoryType.NEEDS, CategoryType.WANTS, CategoryType.SAVINGS]),
        )
        .order_by(Category.name.asc())
        .all()
    )

    grouped = {
        CategoryType.NEEDS: [],
        CategoryType.WANTS: [],
        CategoryType.SAVINGS: [],
    }
    for category in categories:
        grouped[category.category_type].append(category)

    budgets_by_type = {
        CategoryType.NEEDS: Decimal(str(budget.needs_amount or 0)),
        CategoryType.WANTS: Decimal(str(budget.wants_amount or 0)),
        CategoryType.SAVINGS: Decimal(str(budget.savings_amount or 0)),
    }

    for category_type, typed_categories in grouped.items():
        if not typed_categories:
            continue
        each_amount = (budgets_by_type[category_type] / Decimal(len(typed_categories))).quantize(Decimal("0.01"))
        for idx, category in enumerate(typed_categories):
            db.add(
                BudgetCategory(
                    budget_id=budget.id,
                    category_id=category.id,
                    category_type=category_type,
                    budgeted_amount=each_amount,
                    sort_order=idx,
                )
            )


@router.get("", response_model=BudgetListResponse)
def list_budgets(
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    List all budgets for the current user.
    
    Args:
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        List of budgets
    """
    budgets = (
        db.query(Budget)
        .filter(
            Budget.user_id == current_user.id,
            Budget.is_active == True,  # noqa: E712
        )
        .order_by(Budget.created_at.desc())
        .all()
    )
    
    return BudgetListResponse(
        budgets=[BudgetResponse.model_validate(b) for b in budgets],
        total=len(budgets),
    )


@router.get("/default", response_model=BudgetResponse)
def get_default_budget(
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Get the default budget for the current user.
    
    Args:
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Default budget
    """
    budget = (
        db.query(Budget)
        .filter(
            Budget.user_id == current_user.id,
            Budget.is_default == True,  # noqa: E712
            Budget.is_active == True,  # noqa: E712
        )
        .first()
    )
    
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No default budget set",
        )
    
    return budget


@router.get("/summaries", response_model=list[BudgetSummary])
def list_budget_summaries(
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Get budget summaries for quick overview.
    
    Args:
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        List of budget summaries
    """
    budgets = (
        db.query(Budget)
        .filter(
            Budget.user_id == current_user.id,
            Budget.is_active == True,  # noqa: E712
        )
        .order_by(Budget.created_at.desc())
        .all()
    )
    
    return [BudgetSummary.model_validate(b) for b in budgets]


@router.get("/{budget_id}", response_model=BudgetResponse)
def get_budget(
    budget_id: UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Get a single budget by ID.
    
    Args:
        budget_id: Budget UUID
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Budget details
    """
    budget = (
        db.query(Budget)
        .filter(
            Budget.id == budget_id,
            Budget.user_id == current_user.id,
        )
        .first()
    )
    
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found",
        )
    
    return budget


@router.post("/analyze", response_model=BudgetAnalysisResponse)
def analyze_budget(
    budget_analysis_request: BudgetAnalysisRequest,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """Analyze historical spending before creating a budget."""
    logger.info(
        f"[BudgetAnalysis] User {current_user.id} requested analysis for budget "
        f"'{budget_analysis_request.name}'"
    )

    try:
        analysis_data = BudgetAnalysisService.analyze_spending(
            db=db,
            user_id=current_user.id,
            budget_start_date=budget_analysis_request.budget_start_date,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    analysis = BudgetAnalysisService.store_analysis(
        db=db,
        user_id=current_user.id,
        budget_id=None,
        analysis_data=analysis_data,
    )

    return BudgetAnalysisResponse(
        analysis_id=analysis.id,
        budget_name=budget_analysis_request.name,
        analysis_start_date=analysis_data["analysis_start_date"],
        analysis_end_date=analysis_data["analysis_end_date"],
        total_spending=analysis_data["total_spending"],
        needs_total=analysis_data["needs_total"],
        wants_total=analysis_data["wants_total"],
        savings_total=analysis_data["savings_total"],
        needs_percentage=analysis_data["needs_percentage"],
        wants_percentage=analysis_data["wants_percentage"],
        savings_percentage=analysis_data["savings_percentage"],
        category_breakdown=analysis_data["category_breakdown"],
        total_transactions=analysis_data["total_transactions"],
        data_quality=analysis_data["data_quality"],
        validation_warnings=analysis_data["validation_warnings"],
    )


@router.post("", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
def create_budget(
    budget_data: BudgetCreate | BudgetCreateWithAnalysisRequest,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Create a new budget.
    
    Args:
        budget_data: Budget data
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Created budget
    """
    # Analysis-confirmed creation flow (Phase 1)
    if isinstance(budget_data, BudgetCreateWithAnalysisRequest):
        if not budget_data.confirmed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Budget analysis must be confirmed before creation.",
            )

        analysis = (
            db.query(BudgetHistoryAnalysis)
            .filter(
                BudgetHistoryAnalysis.id == budget_data.analysis_id,
                BudgetHistoryAnalysis.user_id == current_user.id,
            )
            .first()
        )

        if not analysis:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Analysis not found",
            )

        if analysis.budget_id is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Analysis already used to create a budget",
            )

        needs_percentage = Decimal(str(analysis.needs_percentage)).quantize(Decimal("0.01"))
        wants_percentage = Decimal(str(analysis.wants_percentage)).quantize(Decimal("0.01"))
        savings_percentage = (Decimal("100.00") - needs_percentage - wants_percentage).quantize(Decimal("0.01"))

        # Determine allocations based on rule type selected by the user
        rule_type = getattr(budget_data, "rule_type", "custom")
        if rule_type == "fifty_thirty_twenty":
            chosen_budget_type = BudgetType.FIFTY_THIRTY_TWENTY
            needs_percentage = Decimal("50.00")
            wants_percentage = Decimal("30.00")
            savings_percentage = Decimal("20.00")
            logger.info(
                f"[BudgetCreate] User chose 50/30/20 rule for budget '{budget_data.name}'"
            )
        elif rule_type == "manual_custom":
            chosen_budget_type = BudgetType.CUSTOM
            needs_percentage = Decimal(str(budget_data.custom_needs_percentage)).quantize(Decimal("0.01"))
            wants_percentage = Decimal(str(budget_data.custom_wants_percentage)).quantize(Decimal("0.01"))
            savings_percentage = (Decimal("100.00") - needs_percentage - wants_percentage).quantize(Decimal("0.01"))
            logger.info(
                f"[BudgetCreate] User chose manual custom rule for budget '{budget_data.name}' "
                f"with N={needs_percentage}% W={wants_percentage}% S={savings_percentage}%"
            )
        else:
            chosen_budget_type = BudgetType.CUSTOM
            logger.info(
                f"[BudgetCreate] User chose custom (historical) rule for budget '{budget_data.name}' "
                f"with N={needs_percentage}% W={wants_percentage}% S={savings_percentage}%"
            )

        total_budget = (
            Decimal(str(budget_data.income)).quantize(Decimal("0.01"))
            if budget_data.income is not None
            else Decimal(str(analysis.total_spending)).quantize(Decimal("0.01"))
        )

        amounts = BudgetCalculator.calculate_amounts(
            total_budget=total_budget,
            needs_percentage=needs_percentage,
            wants_percentage=wants_percentage,
            savings_percentage=savings_percentage,
            budget_type=chosen_budget_type,
        )

        start_dt = datetime.combine(budget_data.budget_start_date, time.min)
        next_month = (start_dt.replace(day=28) + timedelta(days=4)).replace(day=1)
        end_dt = next_month - timedelta(days=1)

        budget = Budget(
            user_id=current_user.id,
            name=budget_data.name,
            budget_type=chosen_budget_type,
            period=BudgetPeriod.MONTHLY,
            total_budget=total_budget,
            needs_percentage=needs_percentage,
            wants_percentage=wants_percentage,
            savings_percentage=savings_percentage,
            needs_amount=amounts["needs_amount"],
            wants_amount=amounts["wants_amount"],
            savings_amount=amounts["savings_amount"],
            start_date=start_dt,
            end_date=end_dt,
            is_active=True,
            is_default=False,
        )

        db.add(budget)
        db.commit()
        db.refresh(budget)

        _initialize_budget_allocations(db, current_user.id, budget)
        db.commit()

        BudgetAnalysisService.link_analysis_to_budget(db, analysis, budget.id)

        logger.info(f"[BudgetCreate] Created budget {budget.id} from analysis {analysis.id}")
        return budget

    # Existing manual creation flow
    # Get goal requirements (if any active goals)
    from models.goal import Goal, GoalStatus
    
    active_goals = (
        db.query(Goal)
        .filter(Goal.user_id == current_user.id, Goal.status == GoalStatus.ACTIVE)
        .all()
    )
    goal_requirements = sum(
        Decimal(str(g.monthly_requirement or 0)) for g in active_goals
    )
    
    # Validate constraints
    is_valid, violations = ConstraintEngine.validate_budget(
        needs_percentage=budget_data.needs_percentage,
        wants_percentage=budget_data.wants_percentage,
        savings_percentage=budget_data.savings_percentage,
        goal_requirements=goal_requirements,
        total_income=budget_data.total_budget,
    )
    
    if not is_valid:
        # Get error violations only
        errors = ConstraintEngine.get_error_violations(violations)
        error_messages = [v.message for v in errors]
        suggestions = [v.suggestion for v in errors]
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Budget violates constraints",
                "violations": error_messages,
                "suggestions": suggestions,
            },
        )
    
    # Log warnings if any soft constraints violated
    warnings = ConstraintEngine.get_warning_violations(violations)
    if warnings:
        logger.warning(
            f"Budget creation for user {current_user.id} has warnings: "
            f"{[w.message for w in warnings]}"
        )
    
    # Calculate amounts
    amounts = BudgetCalculator.calculate_amounts(
        total_budget=budget_data.total_budget,
        needs_percentage=budget_data.needs_percentage,
        wants_percentage=budget_data.wants_percentage,
        savings_percentage=budget_data.savings_percentage,
        budget_type=budget_data.budget_type,
    )
    
    # If setting as default, unset other defaults
    if budget_data.is_default:
        db.query(Budget).filter(
            Budget.user_id == current_user.id,
            Budget.is_default == True,  # noqa: E712
        ).update({"is_default": False})
    
    # Create budget
    budget = Budget(
        user_id=current_user.id,
        name=budget_data.name,
        budget_type=budget_data.budget_type,
        period=budget_data.period,
        total_budget=budget_data.total_budget,
        needs_percentage=budget_data.needs_percentage,
        wants_percentage=budget_data.wants_percentage,
        savings_percentage=budget_data.savings_percentage,
        needs_amount=amounts["needs_amount"],
        wants_amount=amounts["wants_amount"],
        savings_amount=amounts["savings_amount"],
        start_date=budget_data.start_date,
        end_date=budget_data.end_date,
        is_active=budget_data.is_active,
        is_default=budget_data.is_default,
    )
    
    db.add(budget)
    db.commit()
    db.refresh(budget)

    _initialize_budget_allocations(db, current_user.id, budget)
    db.commit()
    
    logger.info(f"Created budget {budget.id} for user {current_user.id}")
    
    return budget


@router.get("/{budget_id}/history-analysis", response_model=BudgetHistoryAnalysisResponse)
def get_budget_history_analysis(
    budget_id: UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """Get historical spending breakdown for a budget."""
    budget = (
        db.query(Budget)
        .filter(Budget.id == budget_id, Budget.user_id == current_user.id)
        .first()
    )

    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found",
        )

    analysis = (
        db.query(BudgetHistoryAnalysis)
        .filter(
            BudgetHistoryAnalysis.budget_id == budget_id,
            BudgetHistoryAnalysis.user_id == current_user.id,
        )
        .order_by(BudgetHistoryAnalysis.created_at.desc())
        .first()
    )

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Historical analysis not found for this budget",
        )

    return BudgetHistoryAnalysisResponse(
        analysis_start_date=analysis.analysis_start_date,
        analysis_end_date=analysis.analysis_end_date,
        total_spending=analysis.total_spending,
        needs_total=analysis.needs_total,
        wants_total=analysis.wants_total,
        savings_total=analysis.savings_total,
        needs_percentage=analysis.needs_percentage,
        wants_percentage=analysis.wants_percentage,
        savings_percentage=analysis.savings_percentage,
        category_breakdown=analysis.category_breakdown,
        total_transactions=int(analysis.total_transactions or 0),
        data_quality=analysis.data_quality,
        validation_warnings=analysis.validation_warnings or [],
    )


@router.patch("/{budget_id}", response_model=BudgetResponse)
def update_budget(
    budget_id: UUID,
    budget_data: BudgetUpdate,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Update a budget.
    
    Args:
        budget_id: Budget UUID
        budget_data: Update data
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Updated budget
    """
    budget = (
        db.query(Budget)
        .filter(
            Budget.id == budget_id,
            Budget.user_id == current_user.id,
        )
        .first()
    )
    
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found",
        )
    
    # Get update data
    update_data = budget_data.model_dump(exclude_unset=True)
    
    # Check if percentages are being updated
    needs_pct = update_data.get("needs_percentage", budget.needs_percentage)
    wants_pct = update_data.get("wants_percentage", budget.wants_percentage)
    savings_pct = update_data.get("savings_percentage", budget.savings_percentage)
    total_budget = update_data.get("total_budget", budget.total_budget)
    
    # Validate percentages
    if not BudgetCalculator.validate_percentages(
        needs_pct,
        wants_pct,
        savings_pct,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Percentages must sum to 100",
        )
    
    # Recalculate amounts if needed
    if "total_budget" in update_data or any(
        p in update_data for p in ["needs_percentage", "wants_percentage", "savings_percentage"]
    ):
        amounts = BudgetCalculator.calculate_amounts(
            total_budget=total_budget,
            needs_percentage=needs_pct,
            wants_percentage=wants_pct,
            savings_percentage=savings_pct,
            budget_type=budget.budget_type,
        )
        update_data["needs_amount"] = amounts["needs_amount"]
        update_data["wants_amount"] = amounts["wants_amount"]
        update_data["savings_amount"] = amounts["savings_amount"]
    
    # Handle default setting
    if update_data.get("is_default") and not budget.is_default:
        db.query(Budget).filter(
            Budget.user_id == current_user.id,
            Budget.is_default == True,  # noqa: E712
        ).update({"is_default": False})
    
    # Update fields
    for field, value in update_data.items():
        setattr(budget, field, value)

    # If budget totals changed, rescale existing allocations by category type
    if "needs_amount" in update_data or "wants_amount" in update_data or "savings_amount" in update_data:
        allocations = (
            db.query(BudgetCategory)
            .filter(BudgetCategory.budget_id == budget.id)
            .all()
        )

        for category_type, target_amount in [
            (CategoryType.NEEDS, Decimal(str(budget.needs_amount or 0))),
            (CategoryType.WANTS, Decimal(str(budget.wants_amount or 0))),
            (CategoryType.SAVINGS, Decimal(str(budget.savings_amount or 0))),
        ]:
            typed = [a for a in allocations if a.category_type == category_type]
            if not typed:
                continue
            current_total = sum(Decimal(str(a.budgeted_amount or 0)) for a in typed)
            if current_total > 0:
                ratio = target_amount / current_total
                for alloc in typed:
                    alloc.budgeted_amount = (Decimal(str(alloc.budgeted_amount or 0)) * ratio).quantize(Decimal("0.01"))
            else:
                each_amount = (target_amount / Decimal(len(typed))).quantize(Decimal("0.01"))
                for alloc in typed:
                    alloc.budgeted_amount = each_amount
    
    db.commit()
    db.refresh(budget)
    
    logger.info(f"Updated budget {budget.id}")
    
    return budget


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    budget_id: UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Delete a budget.
    
    Args:
        budget_id: Budget UUID
        current_user: Current authenticated user
        db: Database session
    """
    budget = (
        db.query(Budget)
        .filter(
            Budget.id == budget_id,
            Budget.user_id == current_user.id,
        )
        .first()
    )
    
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found",
        )
    
    # Soft delete - mark as inactive
    budget.is_active = False
    budget.is_default = False
    db.commit()
    
    logger.info(f"Deleted (deactivated) budget {budget_id}")


@router.post("/{budget_id}/set-default", response_model=BudgetResponse)
def set_default_budget(
    budget_id: UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Set a budget as the default.
    
    Args:
        budget_id: Budget UUID
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Updated budget
    """
    budget = (
        db.query(Budget)
        .filter(
            Budget.id == budget_id,
            Budget.user_id == current_user.id,
        )
        .first()
    )
    
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found",
        )
    
    # Unset other defaults
    db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.is_default == True,  # noqa: E712
    ).update({"is_default": False})
    
    # Set this budget as default
    budget.is_default = True
    db.commit()
    db.refresh(budget)
    
    logger.info(f"Set budget {budget.id} as default")
    
    return budget


@router.post("/generate-from-actuals", response_model=BudgetGenerateResponse)
def generate_budget_from_actuals(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Auto-generate budget from transaction history.
    
    Analyzes last 3 months by default.
    Returns actual spending data to pre-fill budget form.
    
    Args:
        start_date: Optional start date (ISO format)
        end_date: Optional end date (ISO format)
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Budget generation data
    """
    # Parse dates
    start_dt = datetime.fromisoformat(start_date) if start_date else None
    end_dt = datetime.fromisoformat(end_date) if end_date else None
    
    # Generate
    result = BudgetGenerator.generate_from_transactions(
        db=db,
        user_id=current_user.id,
        start_date=start_dt,
        end_date=end_dt,
    )
    
    if result["transaction_count"] == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No transactions found in period. Please upload transactions first.",
        )
    
    logger.info(
        f"Generated budget suggestions for user {current_user.id} "
        f"from {result['transaction_count']} transactions "
        f"(quality: {result['data_quality']})"
    )
    
    return result
