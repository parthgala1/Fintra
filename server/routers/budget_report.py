"""
Budget Report API router.

Provides endpoints for generating and retrieving
budget reports with breakdowns.
"""

import logging
from datetime import datetime, timedelta
from uuid import UUID
from calendar import monthrange

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from auth.router import get_current_user
from database import get_db
from models.budget import Budget, BudgetPeriod
from models.budget_category_breakdown import BudgetCategoryBreakdown
from models.budget_report import BudgetReport
from models.user import User
from schemas.budget_report import (
    BudgetReportListResponse,
    BudgetReportResponse,
    BudgetReportWithBreakdowns,
    BreakdownResponse,
    ReportGenerate,
)
from services.report_generator import ReportGenerator

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/budgets/{budget_id}/reports", tags=["Budget Reports"])

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user_dep(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    """Dependency to get current authenticated user."""
    return get_current_user(token, db)


def get_budget_or_404(
    budget_id: UUID,
    user_id: UUID,
    db: Session,
) -> Budget:
    """Get budget or raise 404."""
    budget = (
        db.query(Budget)
        .filter(Budget.id == budget_id, Budget.user_id == user_id)
        .first()
    )
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found",
        )
    return budget


def get_current_period_dates(period: BudgetPeriod) -> tuple[datetime, datetime]:
    """Get start and end dates for current period."""
    now = datetime.now()
    
    if period == BudgetPeriod.WEEKLY:
        # Start of week (Monday)
        start = now - timedelta(days=now.weekday())
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=6, hours=23, minutes=59, seconds=59)
    elif period == BudgetPeriod.BIWEEKLY:
        # Start of bi-weekly period (first two weeks of month)
        day = now.day
        biweek = (day - 1) // 14
        start = now.replace(day=biweek * 14 + 1, hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=13, hours=23, minutes=59, seconds=59)
    elif period == BudgetPeriod.MONTHLY:
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        _, last_day = monthrange(now.year, now.month)
        end = now.replace(day=last_day, hour=23, minute=59, second=59, microsecond=999999)
    elif period == BudgetPeriod.YEARLY:
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        end = now.replace(month=12, day=31, hour=23, minute=59, second=59, microsecond=999999)
    else:
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        _, last_day = monthrange(now.year, now.month)
        end = now.replace(day=last_day, hour=23, minute=59, second=59, microsecond=999999)
    
    return start, end


@router.get("", response_model=BudgetReportListResponse)
def list_reports(
    budget_id: UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    List all reports for a budget.
    
    Args:
        budget_id: Budget UUID
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        List of budget reports
    """
    # Verify budget exists
    get_budget_or_404(budget_id, current_user.id, db)
    
    reports = (
        db.query(BudgetReport)
        .filter(BudgetReport.budget_id == budget_id)
        .order_by(BudgetReport.period_start.desc())
        .all()
    )
    
    return BudgetReportListResponse(
        reports=[BudgetReportResponse.model_validate(r) for r in reports],
        total=len(reports),
    )


@router.post("", response_model=BudgetReportWithBreakdowns, status_code=status.HTTP_201_CREATED)
def generate_report(
    budget_id: UUID,
    report_data: ReportGenerate,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Generate a new budget report.
    
    Args:
        budget_id: Budget UUID
        report_data: Report generation parameters
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Created budget report with breakdowns
    """
    # Verify budget exists
    budget = get_budget_or_404(budget_id, current_user.id, db)
    
    # Generate report
    report = ReportGenerator.generate_report(
        db=db,
        user_id=current_user.id,
        budget_id=budget_id,
        period_start=report_data.period_start,
        period_end=report_data.period_end,
    )
    
    # Get breakdowns
    breakdowns = (
        db.query(BudgetCategoryBreakdown)
        .filter(BudgetCategoryBreakdown.budget_report_id == report.id)
        .all()
    )
    
    logger.info(f"Generated report {report.id} for budget {budget_id}")
    
    return BudgetReportWithBreakdowns(
        **BudgetReportResponse.model_validate(report).model_dump(),
        breakdowns=[BreakdownResponse.model_validate(b) for b in breakdowns],
    )


@router.get("/current", response_model=BudgetReportWithBreakdowns)
def get_current_report(
    budget_id: UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Get or generate current period report.
    
    Args:
        budget_id: Budget UUID
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Current period report with breakdowns
    """
    # Verify budget exists
    budget = get_budget_or_404(budget_id, current_user.id, db)
    
    # Get current period dates
    period_start, period_end = get_current_period_dates(budget.period)
    
    # Check if report already exists
    existing_report = (
        db.query(BudgetReport)
        .filter(
            BudgetReport.budget_id == budget_id,
            BudgetReport.period_start >= period_start,
            BudgetReport.period_start <= period_end,
        )
        .first()
    )
    
    if existing_report:
        # Get breakdowns
        breakdowns = (
            db.query(BudgetCategoryBreakdown)
            .filter(BudgetCategoryBreakdown.budget_report_id == existing_report.id)
            .all()
        )
        
        return BudgetReportWithBreakdowns(
            **BudgetReportResponse.model_validate(existing_report).model_dump(),
            breakdowns=[BreakdownResponse.model_validate(b) for b in breakdowns],
        )
    
    # Generate new report
    report = ReportGenerator.generate_report(
        db=db,
        user_id=current_user.id,
        budget_id=budget_id,
        period_start=period_start,
        period_end=period_end,
    )
    
    # Get breakdowns
    breakdowns = (
        db.query(BudgetCategoryBreakdown)
        .filter(BudgetCategoryBreakdown.budget_report_id == report.id)
        .all()
    )
    
    return BudgetReportWithBreakdowns(
        **BudgetReportResponse.model_validate(report).model_dump(),
        breakdowns=[BreakdownResponse.model_validate(b) for b in breakdowns],
    )


@router.get("/latest", response_model=BudgetReportWithBreakdowns)
def get_latest_report(
    budget_id: UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Get the latest report for a budget.
    
    Args:
        budget_id: Budget UUID
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Latest report with breakdowns
    """
    # Verify budget exists
    get_budget_or_404(budget_id, current_user.id, db)
    
    # Get latest report
    report = (
        db.query(BudgetReport)
        .filter(BudgetReport.budget_id == budget_id)
        .order_by(BudgetReport.created_at.desc())
        .first()
    )
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No reports found for this budget",
        )
    
    # Get breakdowns
    breakdowns = (
        db.query(BudgetCategoryBreakdown)
        .filter(BudgetCategoryBreakdown.budget_report_id == report.id)
        .all()
    )
    
    return BudgetReportWithBreakdowns(
        **BudgetReportResponse.model_validate(report).model_dump(),
        breakdowns=[BreakdownResponse.model_validate(b) for b in breakdowns],
    )


@router.get("/{report_id}", response_model=BudgetReportWithBreakdowns)
def get_report(
    budget_id: UUID,
    report_id: UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Get a specific report by ID.
    
    Args:
        budget_id: Budget UUID
        report_id: Report UUID
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Budget report with breakdowns
    """
    # Verify budget exists
    get_budget_or_404(budget_id, current_user.id, db)
    
    # Get report
    report = (
        db.query(BudgetReport)
        .filter(
            BudgetReport.id == report_id,
            BudgetReport.budget_id == budget_id,
        )
        .first()
    )
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found",
        )
    
    # Get breakdowns
    breakdowns = (
        db.query(BudgetCategoryBreakdown)
        .filter(BudgetCategoryBreakdown.budget_report_id == report.id)
        .all()
    )
    
    return BudgetReportWithBreakdowns(
        **BudgetReportResponse.model_validate(report).model_dump(),
        breakdowns=[BreakdownResponse.model_validate(b) for b in breakdowns],
    )
