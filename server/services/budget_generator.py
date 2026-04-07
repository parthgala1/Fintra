"""
Budget Generator Service.

Auto-generates budget allocations from transaction history.
Analyzes past spending patterns to suggest realistic budgets.
"""

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from models.category import Category, CategoryType
from models.transaction import Transaction, TransactionType


class BudgetGenerator:
    """Service for auto-generating budgets from transaction history."""

    # Data quality thresholds
    INSUFFICIENT_THRESHOLD = 10  # < 10 transactions
    LOW_THRESHOLD = 50  # < 50 transactions
    MODERATE_THRESHOLD = 100  # < 100 transactions
    # >= 100 = high quality

    @staticmethod
    def generate_from_transactions(
        db: Session,
        user_id: UUID,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        period_months: int = 3,
    ) -> dict:
        """
        Auto-generate budget from transaction history.

        Steps:
        1. Get transactions for period (default: last 3 months)
        2. Calculate total income
        3. Aggregate expenses by category_type (NEEDS/WANTS/SAVINGS)
        4. Calculate percentages
        5. Assess data quality (high/moderate/low/insufficient)
        6. Return pre-fill data for budget form

        Args:
            db: Database session
            user_id: User ID
            start_date: Optional start date (defaults to period_months ago)
            end_date: Optional end date (defaults to today)
            period_months: Number of months to analyze (default 3)

        Returns:
            Dictionary with budget generation data
        """
        # Set default date range if not provided
        if end_date is None:
            end_date = datetime.now()
        if start_date is None:
            start_date = end_date - timedelta(days=period_months * 30)

        # Get total income
        total_income = BudgetGenerator._get_total_income(
            db, user_id, start_date, end_date
        )

        # Get spending by category type
        needs_total = BudgetGenerator._get_total_by_category_type(
            db, user_id, start_date, end_date, CategoryType.NEEDS
        )
        wants_total = BudgetGenerator._get_total_by_category_type(
            db, user_id, start_date, end_date, CategoryType.WANTS
        )
        savings_total = BudgetGenerator._get_total_by_category_type(
            db, user_id, start_date, end_date, CategoryType.SAVINGS
        )

        # Calculate total expenses
        total_expenses = needs_total + wants_total + savings_total

        # Calculate percentages (based on income if available, else based on expenses)
        base_amount = total_income if total_income > 0 else total_expenses
        if base_amount > 0:
            needs_percentage = (needs_total / base_amount) * Decimal("100")
            wants_percentage = (wants_total / base_amount) * Decimal("100")
            savings_percentage = (savings_total / base_amount) * Decimal("100")
        else:
            # No data - return 50/30/20 defaults
            needs_percentage = Decimal("50.00")
            wants_percentage = Decimal("30.00")
            savings_percentage = Decimal("20.00")

        # Get category breakdown
        category_breakdown = BudgetGenerator._get_category_breakdown(
            db, user_id, start_date, end_date
        )

        # Count total transactions
        transaction_count = (
            db.query(func.count(Transaction.id))
            .filter(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.transaction_date >= start_date,
                    Transaction.transaction_date <= end_date,
                )
            )
            .scalar()
            or 0
        )

        # Assess data quality
        data_quality = BudgetGenerator._assess_data_quality(
            transaction_count, total_income
        )

        return {
            "period_start": start_date,
            "period_end": end_date,
            "total_income": total_income,
            "needs_total": needs_total,
            "wants_total": wants_total,
            "savings_total": savings_total,
            "total_expenses": total_expenses,
            "needs_percentage": needs_percentage.quantize(Decimal("0.01")),
            "wants_percentage": wants_percentage.quantize(Decimal("0.01")),
            "savings_percentage": savings_percentage.quantize(Decimal("0.01")),
            "transaction_count": transaction_count,
            "category_breakdown": category_breakdown,
            "data_quality": data_quality,
        }

    @staticmethod
    def _get_total_income(
        db: Session, user_id: UUID, start_date: datetime, end_date: datetime
    ) -> Decimal:
        """
        Get total income for period.

        Args:
            db: Database session
            user_id: User ID
            start_date: Start date
            end_date: End date

        Returns:
            Total income amount
        """
        result = (
            db.query(func.sum(Transaction.amount))
            .filter(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.transaction_type == TransactionType.INCOME,
                    Transaction.transaction_date >= start_date,
                    Transaction.transaction_date <= end_date,
                )
            )
            .scalar()
        )

        return Decimal(str(result)) if result else Decimal("0")

    @staticmethod
    def _get_total_by_category_type(
        db: Session,
        user_id: UUID,
        start_date: datetime,
        end_date: datetime,
        category_type: CategoryType,
    ) -> Decimal:
        """
        Aggregate transactions by category type.

        Args:
            db: Database session
            user_id: User ID
            start_date: Start date
            end_date: End date
            category_type: Category type to filter

        Returns:
            Total spending for category type
        """
        result = (
            db.query(func.sum(Transaction.amount))
            .join(Category, Transaction.category_id == Category.id)
            .filter(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.transaction_type == TransactionType.EXPENSE,
                    Category.category_type == category_type,
                    Transaction.transaction_date >= start_date,
                    Transaction.transaction_date <= end_date,
                )
            )
            .scalar()
        )

        return Decimal(str(result)) if result else Decimal("0")

    @staticmethod
    def _get_category_breakdown(
        db: Session, user_id: UUID, start_date: datetime, end_date: datetime
    ) -> list[dict]:
        """
        Get per-category spending breakdown.

        Args:
            db: Database session
            user_id: User ID
            start_date: Start date
            end_date: End date

        Returns:
            List of category breakdowns with totals
        """
        results = (
            db.query(
                Category.id,
                Category.name,
                Category.category_type,
                func.sum(Transaction.amount).label("total"),
                func.count(Transaction.id).label("transaction_count"),
            )
            .join(Transaction, Transaction.category_id == Category.id)
            .filter(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.transaction_type == TransactionType.EXPENSE,
                    Transaction.transaction_date >= start_date,
                    Transaction.transaction_date <= end_date,
                )
            )
            .group_by(Category.id, Category.name, Category.category_type)
            .order_by(func.sum(Transaction.amount).desc())
            .all()
        )

        return [
            {
                "category_id": str(r.id),
                "category_name": r.name,
                "category_type": r.category_type.value,
                "total": Decimal(str(r.total)),
                "transaction_count": r.transaction_count,
            }
            for r in results
        ]

    @staticmethod
    def _assess_data_quality(transaction_count: int, total_income: Decimal) -> str:
        """
        Assess data quality based on transaction volume.

        Rules:
        - insufficient: < 10 transactions OR income = 0
        - low: < 50 transactions
        - moderate: < 100 transactions
        - high: >= 100 transactions

        Args:
            transaction_count: Number of transactions
            total_income: Total income amount

        Returns:
            Data quality level
        """
        if transaction_count < BudgetGenerator.INSUFFICIENT_THRESHOLD or total_income == 0:
            return "insufficient"
        elif transaction_count < BudgetGenerator.LOW_THRESHOLD:
            return "low"
        elif transaction_count < BudgetGenerator.MODERATE_THRESHOLD:
            return "moderate"
        else:
            return "high"
