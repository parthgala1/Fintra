"""
Budget Analysis Service.

Analyzes historical spending to create accurate budget allocations.
Calculates what a user actually spends vs what they should allocate.
"""

import logging
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Dict
from uuid import UUID

from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from models import BudgetHistoryAnalysis, Category, CategoryType, Transaction, TransactionType
from models.transaction import DirectionType

logger = logging.getLogger(__name__)


class BudgetAnalysisService:
    """
    Service for analyzing historical spending and creating detailed breakdowns.
    
    Responsibilities:
    - Calculate correct analysis period (first transaction → day before budget start)
    - Query and categorize transactions
    - Calculate accurate percentages
    - Assess data quality
    - Format breakdown for display
    - Store analysis results
    """

    @staticmethod
    def _run_analysis_for_period(
        db: Session,
        user_id: UUID,
        analysis_start_date: date,
        analysis_end_date: date,
    ) -> Dict:
        """Analyze spending inside an explicit [start, end] date range."""
        logger.debug(
            "[BudgetAnalysis] START period analysis: user=%s, start=%s, end=%s",
            user_id,
            analysis_start_date,
            analysis_end_date,
        )

        if analysis_start_date > analysis_end_date:
            logger.error(
                "[BudgetAnalysis] Invalid date range: %s > %s",
                analysis_start_date,
                analysis_end_date,
            )
            raise ValueError("Invalid date range: start date must be before or equal to end date.")

        # `transaction_date` is stored as datetime, so use full-day boundaries.
        start_dt = datetime.combine(analysis_start_date, datetime.min.time())
        end_dt = datetime.combine(analysis_end_date, datetime.max.time())

        # Check that there are expense transactions in budget categories (required for analysis)
        expense_count = (
            db.query(func.count(Transaction.id))
            .join(Category, Transaction.category_id == Category.id)
            .filter(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.transaction_type == TransactionType.EXPENSE,
                    Transaction.direction_type != DirectionType.TRANSFER,
                    Transaction.transaction_date >= start_dt,
                    Transaction.transaction_date <= end_dt,
                    Category.category_type.in_([CategoryType.NEEDS, CategoryType.WANTS, CategoryType.SAVINGS]),
                )
            )
            .scalar() or 0
        )

        logger.debug("[BudgetAnalysis] Found %s expense transactions in budget categories", expense_count)

        if expense_count == 0:
            logger.error("[BudgetAnalysis] No expense transactions in analysis period")
            raise ValueError(
                "No expense transactions found in selected analysis period. Cannot analyze spending."
            )

        # Total activity count (expense + income in budget categories) for data quality
        total_transactions = (
            db.query(func.count(Transaction.id))
            .join(Category, Transaction.category_id == Category.id)
            .filter(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.transaction_type.in_([TransactionType.EXPENSE, TransactionType.INCOME]),
                    Transaction.direction_type != DirectionType.TRANSFER,
                    Transaction.transaction_date >= start_dt,
                    Transaction.transaction_date <= end_dt,
                    Category.category_type.in_([CategoryType.NEEDS, CategoryType.WANTS, CategoryType.SAVINGS]),
                )
            )
            .scalar() or 0
        )

        category_totals = BudgetAnalysisService._calculate_category_totals(
            db, user_id, start_dt, end_dt
        )

        needs_total = category_totals.get("needs", Decimal("0"))
        wants_total = category_totals.get("wants", Decimal("0"))
        savings_total = category_totals.get("savings", Decimal("0"))
        total_spending = needs_total + wants_total + savings_total

        if total_spending > 0:
            needs_percentage = (needs_total / total_spending * Decimal("100")).quantize(Decimal("0.01"))
            wants_percentage = (wants_total / total_spending * Decimal("100")).quantize(Decimal("0.01"))
            savings_percentage = (savings_total / total_spending * Decimal("100")).quantize(Decimal("0.01"))
        else:
            needs_percentage = Decimal("0.00")
            wants_percentage = Decimal("0.00")
            savings_percentage = Decimal("0.00")

        category_breakdown = BudgetAnalysisService._build_category_breakdown(
            db, user_id, start_dt, end_dt, total_spending
        )

        data_quality = BudgetAnalysisService._assess_data_quality(total_transactions)
        validation_warnings = BudgetAnalysisService._validate_analysis(
            total_transactions,
            total_spending,
            needs_percentage,
            wants_percentage,
            savings_percentage,
        )

        logger.debug("[BudgetAnalysis] SUCCESS period analysis")
        return {
            "analysis_start_date": analysis_start_date,
            "analysis_end_date": analysis_end_date,
            "total_spending": total_spending.quantize(Decimal("0.01")),
            "needs_total": needs_total.quantize(Decimal("0.01")),
            "wants_total": wants_total.quantize(Decimal("0.01")),
            "savings_total": savings_total.quantize(Decimal("0.01")),
            "needs_percentage": needs_percentage,
            "wants_percentage": wants_percentage,
            "savings_percentage": savings_percentage,
            "category_breakdown": category_breakdown,
            "total_transactions": total_transactions,
            "data_quality": data_quality,
            "validation_warnings": validation_warnings,
        }

    @staticmethod
    def _json_safe_value(value):
        """Recursively convert Decimal values to JSON-safe primitives."""
        if isinstance(value, Decimal):
            return float(value)
        if isinstance(value, dict):
            return {
                key: BudgetAnalysisService._json_safe_value(val)
                for key, val in value.items()
            }
        if isinstance(value, list):
            return [BudgetAnalysisService._json_safe_value(item) for item in value]
        return value

    @staticmethod
    def analyze_spending(
        db: Session,
        user_id: UUID,
        budget_start_date: date,
    ) -> Dict:
        """
        Analyze historical spending for the period before a budget starts.
        
        The analysis period is:
        - Start: First transaction ever for this user
        - End: Day before the budget starts (budget_start_date - 1 day)
        
        Example: Budget starting May 1, 2026
        - Analysis period: Jan 1, 2026 → Apr 30, 2026 (NOT May)
        
        Args:
            db: Database session
            user_id: User ID
            budget_start_date: Budget start date (analysis goes UP TO the day before)
            
        Returns:
            Dictionary with analysis results including:
            {
                "analysis_start_date": date,
                "analysis_end_date": date,
                "total_spending": Decimal,
                "needs_total": Decimal,
                "wants_total": Decimal,
                "savings_total": Decimal,
                "investments_total": Decimal,
                "needs_percentage": Decimal,
                "wants_percentage": Decimal,
                "savings_percentage": Decimal,
                "investments_percentage": Decimal,
                "category_breakdown": {
                    "Needs": { "Housing": { ... }, ... },
                    "Wants": { ... },
                    ...
                },
                "total_transactions": int,
                "data_quality": str,  # "insufficient", "low", "moderate", "high"
                "validation_warnings": [str],
            }
            
        Raises:
            ValueError: If no transactions found or date range invalid
        """
        logger.debug(f"[BudgetAnalysis] START: user={user_id}, budget_start={budget_start_date}")
        
        # Step 1: Calculate analysis period
        analysis_end_date = budget_start_date - timedelta(days=1)
        logger.debug(f"[BudgetAnalysis] Analysis end date: {analysis_end_date}")
        
        # Find first transaction date
        first_tx_date = (
            db.query(func.min(Transaction.transaction_date))
            .filter(Transaction.user_id == user_id)
            .scalar()
        )
        
        if first_tx_date is None:
            logger.error(f"[BudgetAnalysis] No transactions found for user {user_id}")
            raise ValueError("No transactions found. Cannot analyze spending.")
        
        # Convert to date if it's a datetime
        if isinstance(first_tx_date, datetime):
            analysis_start_date = first_tx_date.date()
        else:
            analysis_start_date = first_tx_date
            
        logger.debug(f"[BudgetAnalysis] Analysis start date: {analysis_start_date}")
        
        # Validate date range
        if analysis_start_date > analysis_end_date:
            logger.error(
                f"[BudgetAnalysis] Invalid date range: "
                f"{analysis_start_date} > {analysis_end_date}"
            )
            raise ValueError(
                f"Invalid date range. Budget start {budget_start_date} is too close to first transaction {analysis_start_date}."
            )
        
        return BudgetAnalysisService._run_analysis_for_period(
            db=db,
            user_id=user_id,
            analysis_start_date=analysis_start_date,
            analysis_end_date=analysis_end_date,
        )

    @staticmethod
    def analyze_spending_for_range(
        db: Session,
        user_id: UUID,
        analysis_start_date: date,
        analysis_end_date: date,
    ) -> Dict:
        """Analyze historical spending for a user-selected explicit period."""
        return BudgetAnalysisService._run_analysis_for_period(
            db=db,
            user_id=user_id,
            analysis_start_date=analysis_start_date,
            analysis_end_date=analysis_end_date,
        )
    
    @staticmethod
    def _calculate_category_totals(
        db: Session,
        user_id: UUID,
        start_date: datetime,
        end_date: datetime,
    ) -> Dict[str, Decimal]:
        """Calculate total spending by category type."""
        totals = {}
        
        for category_type in [CategoryType.NEEDS, CategoryType.WANTS, CategoryType.SAVINGS]:
            expense_result = (
                db.query(func.sum(Transaction.amount))
                .join(Category, Transaction.category_id == Category.id)
                .filter(
                    and_(
                        Transaction.user_id == user_id,
                        Transaction.transaction_type == TransactionType.EXPENSE,
                        Transaction.direction_type != DirectionType.TRANSFER,
                        Category.category_type == category_type,
                        Transaction.transaction_date >= start_date,
                        Transaction.transaction_date <= end_date,
                    )
                )
                .scalar()
            )
            income_result = (
                db.query(func.sum(Transaction.amount))
                .join(Category, Transaction.category_id == Category.id)
                .filter(
                    and_(
                        Transaction.user_id == user_id,
                        Transaction.transaction_type == TransactionType.INCOME,
                        Transaction.direction_type != DirectionType.TRANSFER,
                        Category.category_type == category_type,
                        Transaction.transaction_date >= start_date,
                        Transaction.transaction_date <= end_date,
                    )
                )
                .scalar()
            )
            gross = Decimal(str(expense_result)) if expense_result else Decimal("0")
            refunds = Decimal(str(income_result)) if income_result else Decimal("0")
            logger.debug(
                "[BudgetAnalysis] %s: gross_expense=%s, category_income=%s, net=%s",
                category_type.value,
                gross,
                refunds,
                max(gross - refunds, Decimal("0")),
            )
            totals[category_type.value] = max(gross - refunds, Decimal("0"))

        return totals
    
    @staticmethod
    def _build_category_breakdown(
        db: Session,
        user_id: UUID,
        start_date: datetime,
        end_date: datetime,
        total_spending: Decimal,
    ) -> Dict:
        """Build detailed breakdown organized by category type and name."""
        breakdown = {
            "Needs": {},
            "Wants": {},
            "Savings": {},
        }
        
        # Query expense totals per budget category
        expense_rows = (
            db.query(
                Category.id,
                Category.name,
                Category.category_type,
                Category.icon,
                Category.color,
                func.sum(Transaction.amount).label("total"),
                func.count(Transaction.id).label("expense_count"),
            )
            .join(Transaction, Transaction.category_id == Category.id)
            .filter(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.transaction_type == TransactionType.EXPENSE,
                    Transaction.direction_type != DirectionType.TRANSFER,
                    Transaction.transaction_date >= start_date,
                    Transaction.transaction_date <= end_date,
                    Category.category_type.in_([CategoryType.NEEDS, CategoryType.WANTS, CategoryType.SAVINGS]),
                )
            )
            .group_by(Category.id, Category.name, Category.category_type, Category.icon, Category.color)
            .order_by(func.sum(Transaction.amount).desc())
            .all()
        )

        # Query income totals per budget category (refunds / Splitwise settlements)
        income_rows = (
            db.query(
                Transaction.category_id,
                func.sum(Transaction.amount).label("total"),
                func.count(Transaction.id).label("income_count"),
            )
            .join(Category, Transaction.category_id == Category.id)
            .filter(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.transaction_type == TransactionType.INCOME,
                    Transaction.direction_type != DirectionType.TRANSFER,
                    Transaction.transaction_date >= start_date,
                    Transaction.transaction_date <= end_date,
                    Category.category_type.in_([CategoryType.NEEDS, CategoryType.WANTS, CategoryType.SAVINGS]),
                )
            )
            .group_by(Transaction.category_id)
            .all()
        )
        income_by_category: Dict = {
            row.category_id: (Decimal(str(row.total)), row.income_count)
            for row in income_rows
        }

        # Organize by category type using net amounts
        for row in expense_rows:
            category_type = row.category_type.value.title()
            if category_type not in breakdown:
                continue
            gross = Decimal(str(row.total))
            refund_data = income_by_category.get(row.id, (Decimal("0"), 0))
            refunds = refund_data[0]
            income_count = refund_data[1]
            net = max(gross - refunds, Decimal("0"))
            logger.debug(
                "[BudgetAnalysis] %s: gross_expense=%s, category_income=%s, net=%s",
                row.name,
                gross,
                refunds,
                net,
            )
            percentage = (net / total_spending * Decimal("100")).quantize(Decimal("0.01")) if total_spending > 0 else Decimal("0.00")
            breakdown[category_type][row.name] = {
                "amount": net.quantize(Decimal("0.01")),
                "percentage": percentage,
                "icon": row.icon or "",
                "color": row.color or "#6B7280",
                "transaction_count": row.expense_count + income_count,
            }

        return breakdown
    
    @staticmethod
    def _assess_data_quality(transaction_count: int) -> str:
        """
        Assess data quality based on transaction count.
        
        Thresholds:
        - insufficent: < 10 transactions
        - low: 10-49 transactions
        - moderate: 50-99 transactions
        - high: >= 100 transactions
        """
        if transaction_count < 10:
            return "insufficient"
        elif transaction_count < 50:
            return "low"
        elif transaction_count < 100:
            return "moderate"
        else:
            return "high"
    
    @staticmethod
    def _validate_analysis(
        total_transactions: int,
        total_spending: Decimal,
        needs_pct: Decimal,
        wants_pct: Decimal,
        savings_pct: Decimal,
        investments_pct: Decimal = None,
    ) -> list:
        """
        Validate analysis and generate warnings.
        
        Returns list of warning strings if any issues found.
        """
        warnings = []
        
        # Check transaction count
        if total_transactions < 10:
            warnings.append("⚠️ Very few transactions. Analysis may be inaccurate.")
        elif total_transactions < 50:
            warnings.append("⚠️ Low transaction count. Results may be less reliable.")
        
        # Check if percentages add up correctly (should be ~100%)
        total_pct = needs_pct + wants_pct + savings_pct
        if total_pct > Decimal("101"):
            warnings.append(f"⚠️ Allocations exceed 100% ({total_pct}%). Manual adjustment may be needed.")
        
        # Check for unusual allocations
        if needs_pct > Decimal("80"):
            warnings.append("⚠️ Needs allocation is very high (>80%). Review correctness.")
        elif needs_pct < Decimal("20"):
            warnings.append("⚠️ Needs allocation is very low (<20%). May indicate misclassification.")
        
        return warnings
    
    @staticmethod
    def store_analysis(
        db: Session,
        user_id: UUID,
        budget_id: UUID | None,
        analysis_data: Dict,
    ) -> BudgetHistoryAnalysis:
        """Store analysis results in database."""
        logger.debug(f"[BudgetAnalysis] Storing analysis for budget {budget_id}")

        category_breakdown = BudgetAnalysisService._json_safe_value(
            analysis_data["category_breakdown"]
        )
        
        analysis = BudgetHistoryAnalysis(
            budget_id=budget_id,
            user_id=user_id,
            analysis_start_date=analysis_data["analysis_start_date"],
            analysis_end_date=analysis_data["analysis_end_date"],
            total_spending=analysis_data["total_spending"],
            needs_total=analysis_data["needs_total"],
            wants_total=analysis_data["wants_total"],
            savings_total=analysis_data["savings_total"],
            investments_total=Decimal("0"),  # Not used in Phase 1
            needs_percentage=analysis_data["needs_percentage"],
            wants_percentage=analysis_data["wants_percentage"],
            savings_percentage=analysis_data["savings_percentage"],
            investments_percentage=Decimal("0"),  # Not used in Phase 1
            category_breakdown=category_breakdown,
            total_transactions=analysis_data["total_transactions"],
            data_quality=analysis_data["data_quality"],
            validation_warnings=analysis_data["validation_warnings"],
        )
        
        db.add(analysis)
        db.commit()
        db.refresh(analysis)
        
        logger.debug(f"[BudgetAnalysis] Analysis stored with ID {analysis.id}")
        return analysis

    @staticmethod
    def link_analysis_to_budget(
        db: Session,
        analysis: BudgetHistoryAnalysis,
        budget_id: UUID,
    ) -> BudgetHistoryAnalysis:
        """Attach a pending analysis record to a created budget."""
        analysis.budget_id = budget_id
        db.commit()
        db.refresh(analysis)
        return analysis
