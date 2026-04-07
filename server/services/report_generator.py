"""
Report Generator Service.

Generates budget reports by aggregating transactions
and comparing against budget allocations.
"""

import logging
from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from models.budget import Budget
from models.budget_category_breakdown import BudgetCategoryBreakdown
from models.budget_report import BudgetReport
from models.category import Category, CategoryType
from models.transaction import Transaction, TransactionStatus, TransactionType
from services.budget_calculator import BudgetCalculator

logger = logging.getLogger(__name__)


class ReportGenerator:
    """Service for generating budget reports."""

    @staticmethod
    def get_transactions_by_category_type(
        db: Session,
        user_id: UUID,
        period_start: datetime,
        period_end: datetime,
        category_type: CategoryType,
    ) -> Decimal:
        """
        Get total transactions for a specific category type.

        Args:
            db: Database session
            user_id: User ID
            period_start: Start of period
            period_end: End of period
            category_type: Category type to filter

        Returns:
            Total amount for the category type
        """
        # Get categories of this type
        categories = (
            db.query(Category)
            .filter(
                Category.user_id == user_id,
                Category.category_type == category_type,
                Category.is_active == True,  # noqa: E712
            )
            .all()
        )

        if not categories:
            return Decimal("0")

        category_ids = [c.id for c in categories]

        # Sum transactions for these categories
        result = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.user_id == user_id,
                Transaction.category_id.in_(category_ids),
                Transaction.transaction_date >= period_start,
                Transaction.transaction_date <= period_end,
                Transaction.status == TransactionStatus.POSTED,
                Transaction.transaction_type == TransactionType.EXPENSE,
            )
            .scalar()
        )

        return Decimal(str(result)) if result else Decimal("0")

    @staticmethod
    def get_total_income(
        db: Session,
        user_id: UUID,
        period_start: datetime,
        period_end: datetime,
    ) -> Decimal:
        """
        Get total income for the period.

        Args:
            db: Database session
            user_id: User ID
            period_start: Start of period
            period_end: End of period

        Returns:
            Total income
        """
        result = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.user_id == user_id,
                Transaction.transaction_type == TransactionType.INCOME,
                Transaction.transaction_date >= period_start,
                Transaction.transaction_date <= period_end,
                Transaction.status == TransactionStatus.POSTED,
            )
            .scalar()
        )

        return Decimal(str(result)) if result else Decimal("0")

    @staticmethod
    def generate_report(
        db: Session,
        user_id: UUID,
        budget_id: UUID,
        period_start: datetime,
        period_end: datetime,
    ) -> BudgetReport:
        """
        Generate a budget report for the given period.

        Args:
            db: Database session
            user_id: User ID
            budget_id: Budget ID
            period_start: Start of period
            period_end: End of period

        Returns:
            Created BudgetReport
        """
        logger.info(
            f"Generating report for budget {budget_id}, period {period_start} to {period_end}"
        )

        # Get budget
        budget = (
            db.query(Budget)
            .filter(Budget.id == budget_id, Budget.user_id == user_id)
            .first()
        )

        if not budget:
            raise ValueError(f"Budget {budget_id} not found")

        # Get actual spending by category type
        actual_needs = ReportGenerator.get_transactions_by_category_type(
            db, user_id, period_start, period_end, CategoryType.NEEDS
        )
        actual_wants = ReportGenerator.get_transactions_by_category_type(
            db, user_id, period_start, period_end, CategoryType.WANTS
        )
        actual_savings = ReportGenerator.get_transactions_by_category_type(
            db, user_id, period_start, period_end, CategoryType.SAVINGS
        )

        # Get total income
        total_income = ReportGenerator.get_total_income(
            db, user_id, period_start, period_end
        )

        # Get budgeted amounts
        budgeted_needs = budget.needs_amount or Decimal("0")
        budgeted_wants = budget.wants_amount or Decimal("0")
        budgeted_savings = budget.savings_amount or Decimal("0")
        total_budgeted = budgeted_needs + budgeted_wants + budgeted_savings

        # Calculate actual total
        total_spent = actual_needs + actual_wants + actual_savings

        # Calculate deviations
        needs_deviation_data = BudgetCalculator.calculate_deviation(
            budgeted_needs, actual_needs
        )
        wants_deviation_data = BudgetCalculator.calculate_deviation(
            budgeted_wants, actual_wants
        )
        savings_deviation_data = BudgetCalculator.calculate_deviation(
            budgeted_savings, actual_savings
        )

        # Calculate percentages used
        needs_percentage_used = BudgetCalculator.calculate_percentage_used(
            budgeted_needs, actual_needs
        )
        wants_percentage_used = BudgetCalculator.calculate_percentage_used(
            budgeted_wants, actual_wants
        )
        savings_percentage_used = BudgetCalculator.calculate_percentage_used(
            budgeted_savings, actual_savings
        )

        # Determine if over budget
        is_over_budget = (
            total_spent > total_budgeted
            or needs_percentage_used > 100
            or wants_percentage_used > 100
        )

        # Generate summary
        summary = ReportGenerator._generate_summary(
            total_budgeted, total_spent, is_over_budget
        )

        # Create report
        report = BudgetReport(
            user_id=user_id,
            budget_id=budget_id,
            period_start=period_start,
            period_end=period_end,
            total_income=total_income,
            budgeted_needs=budgeted_needs,
            budgeted_wants=budgeted_wants,
            budgeted_savings=budgeted_savings,
            total_budgeted=total_budgeted,
            actual_needs=actual_needs,
            actual_wants=actual_wants,
            actual_savings=actual_savings,
            total_spent=total_spent,
            needs_deviation=needs_deviation_data["deviation"],
            wants_deviation=wants_deviation_data["deviation"],
            savings_deviation=savings_deviation_data["deviation"],
            needs_percentage_used=needs_percentage_used,
            wants_percentage_used=wants_percentage_used,
            savings_percentage_used=savings_percentage_used,
            is_over_budget=is_over_budget,
            summary=summary,
        )

        db.add(report)
        db.commit()
        db.refresh(report)

        # Generate breakdowns
        ReportGenerator.generate_breakdowns(
            db, report.id, user_id, period_start, period_end
        )

        logger.info(f"Generated report {report.id} for budget {budget_id}")
        return report

    @staticmethod
    def generate_breakdowns(
        db: Session,
        report_id: UUID,
        user_id: UUID,
        period_start: datetime,
        period_end: datetime,
    ) -> list[BudgetCategoryBreakdown]:
        """
        Generate category breakdowns for a report.

        Args:
            db: Database session
            report_id: Report ID
            user_id: User ID
            period_start: Start of period
            period_end: End of period

        Returns:
            List of created breakdowns
        """
        # Get all user categories
        categories = (
            db.query(Category)
            .filter(
                Category.user_id == user_id,
                Category.is_active == True,  # noqa: E712
                Category.category_type.in_(
                    [CategoryType.NEEDS, CategoryType.WANTS, CategoryType.SAVINGS]
                ),
            )
            .all()
        )

        breakdowns = []

        for category in categories:
            # Get budgeted amount (proportional to category type)
            # For simplicity, we'll use the total budget percentage
            # In a more complex implementation, you'd track per-category budgets

            # Get actual spending for this category
            result = (
                db.query(
                    func.coalesce(func.sum(Transaction.amount), 0),
                    func.count(Transaction.id),
                )
                .filter(
                    Transaction.user_id == user_id,
                    Transaction.category_id == category.id,
                    Transaction.transaction_date >= period_start,
                    Transaction.transaction_date <= period_end,
                    Transaction.status == TransactionStatus.POSTED,
                    Transaction.transaction_type == TransactionType.EXPENSE,
                )
                .first()
            )

            actual_amount = Decimal(str(result[0])) if result[0] else Decimal("0")
            transaction_count = result[1] if result[1] else 0

            # Get budget allocation (simplified - use budget totals)
            # In reality, you'd have per-category budgets
            budget = (
                db.query(Budget)
                .filter(Budget.user_id == user_id, Budget.is_active == True)  # noqa: E712
                .first()
            )

            if budget:
                if category.category_type == CategoryType.NEEDS:
                    budgeted_amount = budget.needs_amount or Decimal("0")
                elif category.category_type == CategoryType.WANTS:
                    budgeted_amount = budget.wants_amount or Decimal("0")
                else:
                    budgeted_amount = budget.savings_amount or Decimal("0")
            else:
                budgeted_amount = Decimal("0")

            # Calculate deviation
            deviation_data = BudgetCalculator.calculate_deviation(
                budgeted_amount, actual_amount
            )

            breakdown = BudgetCategoryBreakdown(
                budget_report_id=report_id,
                category_id=category.id,
                category_name=category.name,
                category_type=category.category_type.value,
                budgeted_amount=budgeted_amount,
                actual_amount=actual_amount,
                deviation=deviation_data["deviation"],
                deviation_percentage=deviation_data["deviation_percentage"],
                transaction_count=transaction_count,
            )

            db.add(breakdown)
            breakdowns.append(breakdown)

        db.commit()

        return breakdowns

    @staticmethod
    def _generate_summary(
        total_budgeted: Decimal,
        total_spent: Decimal,
        is_over_budget: bool,
    ) -> str:
        """Generate a summary string for the report."""
        if total_budgeted == 0:
            return "No budget set for this period."

        if is_over_budget:
            over_amount = total_spent - total_budgeted
            return (
                f"You've exceeded your budget by ${over_amount:.2f}. "
                f"Total spent: ${total_spent:.2f} of ${total_budgeted:.2f} budgeted."
            )
        else:
            remaining = total_budgeted - total_spent
            return (
                f"You're on track! You've spent ${total_spent:.2f} "
                f"of ${total_budgeted:.2f} budgeted. "
                f"${remaining:.2f} remaining."
            )
