import logging
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from models.budget import Budget
from models.budget_category import BudgetCategory
from models.budget_category_breakdown import BudgetCategoryBreakdown
from models.budget_report import BudgetReport
from models.category import Category, CategoryType
from models.transaction import Transaction, TransactionStatus, TransactionType
from services.budget_calculator import BudgetCalculator

logger = logging.getLogger(__name__)


class BudgetReportRecalculationService:
    @staticmethod
    def recalculate(
        db: Session,
        user_id: UUID,
        budget_id: UUID,
        period_start: datetime,
        period_end: datetime,
    ) -> BudgetReport:
        budget = (
            db.query(Budget)
            .filter(Budget.id == budget_id, Budget.user_id == user_id)
            .first()
        )
        if not budget:
            raise ValueError(f"Budget {budget_id} not found")

        totals = BudgetReportRecalculationService._aggregate_actuals_by_type(
            db=db,
            user_id=user_id,
            period_start=period_start,
            period_end=period_end,
        )

        total_income = BudgetReportRecalculationService._aggregate_income(
            db=db,
            user_id=user_id,
            period_start=period_start,
            period_end=period_end,
        )

        budgeted_needs = Decimal(str(budget.needs_amount or 0))
        budgeted_wants = Decimal(str(budget.wants_amount or 0))
        budgeted_savings = Decimal(str(budget.savings_amount or 0))
        total_budgeted = budgeted_needs + budgeted_wants + budgeted_savings

        actual_needs = totals.get(CategoryType.NEEDS, Decimal("0"))
        actual_wants = totals.get(CategoryType.WANTS, Decimal("0"))
        actual_savings = totals.get(CategoryType.SAVINGS, Decimal("0"))
        total_spent = actual_needs + actual_wants + actual_savings

        needs_deviation_data = BudgetCalculator.calculate_deviation(budgeted_needs, actual_needs)
        wants_deviation_data = BudgetCalculator.calculate_deviation(budgeted_wants, actual_wants)
        savings_deviation_data = BudgetCalculator.calculate_deviation(budgeted_savings, actual_savings)

        needs_percentage_used = BudgetCalculator.calculate_percentage_used(budgeted_needs, actual_needs)
        wants_percentage_used = BudgetCalculator.calculate_percentage_used(budgeted_wants, actual_wants)
        savings_percentage_used = BudgetCalculator.calculate_percentage_used(budgeted_savings, actual_savings)

        is_over_budget = (
            total_spent > total_budgeted
            or needs_percentage_used > 100
            or wants_percentage_used > 100
        )
        remaining_budget = (total_budgeted - total_spent).quantize(Decimal("0.01"))

        summary = BudgetReportRecalculationService._generate_summary(
            total_budgeted=total_budgeted,
            total_spent=total_spent,
            is_over_budget=is_over_budget,
        )

        report = (
            db.query(BudgetReport)
            .filter(
                BudgetReport.budget_id == budget_id,
                BudgetReport.period_start == period_start,
                BudgetReport.period_end == period_end,
            )
            .order_by(BudgetReport.created_at.desc())
            .first()
        )

        now = datetime.utcnow()
        if not report:
            report = BudgetReport(
                user_id=user_id,
                budget_id=budget_id,
                period_start=period_start,
                period_end=period_end,
            )
            db.add(report)
            db.flush()

        report.total_income = total_income
        report.budgeted_needs = budgeted_needs
        report.budgeted_wants = budgeted_wants
        report.budgeted_savings = budgeted_savings
        report.total_budgeted = total_budgeted
        report.actual_needs = actual_needs
        report.actual_wants = actual_wants
        report.actual_savings = actual_savings
        report.total_spent = total_spent
        report.needs_deviation = needs_deviation_data["deviation"]
        report.wants_deviation = wants_deviation_data["deviation"]
        report.savings_deviation = savings_deviation_data["deviation"]
        report.needs_percentage_used = needs_percentage_used
        report.wants_percentage_used = wants_percentage_used
        report.savings_percentage_used = savings_percentage_used
        report.is_over_budget = is_over_budget
        report.summary = summary
        report.remaining_budget = remaining_budget
        report.last_calculated_at = now

        BudgetReportRecalculationService._rebuild_breakdowns(
            db=db,
            report=report,
            user_id=user_id,
            budget=budget,
            period_start=period_start,
            period_end=period_end,
        )

        db.commit()
        db.refresh(report)

        logger.info(
            "Recalculated budget report",
            extra={
                "budget_id": str(budget_id),
                "period_start": period_start.isoformat(),
                "period_end": period_end.isoformat(),
                "total_budgeted": float(total_budgeted),
                "total_spent": float(total_spent),
            },
        )

        return report

    @staticmethod
    def _aggregate_actuals_by_type(
        db: Session,
        user_id: UUID,
        period_start: datetime,
        period_end: datetime,
    ) -> dict[CategoryType, Decimal]:
        rows = (
            db.query(Category.category_type, func.coalesce(func.sum(Transaction.amount), 0))
            .join(Category, Transaction.category_id == Category.id)
            .filter(
                Transaction.user_id == user_id,
                Transaction.transaction_date >= period_start,
                Transaction.transaction_date <= period_end,
                Transaction.transaction_type == TransactionType.EXPENSE,
                Transaction.status == TransactionStatus.POSTED,
                Category.category_type.in_([CategoryType.NEEDS, CategoryType.WANTS, CategoryType.SAVINGS]),
            )
            .group_by(Category.category_type)
            .all()
        )

        totals: dict[CategoryType, Decimal] = {
            CategoryType.NEEDS: Decimal("0"),
            CategoryType.WANTS: Decimal("0"),
            CategoryType.SAVINGS: Decimal("0"),
        }
        for category_type, total in rows:
            totals[category_type] = Decimal(str(total or 0)).quantize(Decimal("0.01"))
        return totals

    @staticmethod
    def _aggregate_income(
        db: Session,
        user_id: UUID,
        period_start: datetime,
        period_end: datetime,
    ) -> Decimal:
        result = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.user_id == user_id,
                Transaction.transaction_date >= period_start,
                Transaction.transaction_date <= period_end,
                Transaction.transaction_type == TransactionType.INCOME,
                Transaction.status == TransactionStatus.POSTED,
            )
            .scalar()
        )
        return Decimal(str(result or 0)).quantize(Decimal("0.01"))

    @staticmethod
    def _rebuild_breakdowns(
        db: Session,
        report: BudgetReport,
        user_id: UUID,
        budget: Budget,
        period_start: datetime,
        period_end: datetime,
    ) -> None:
        db.query(BudgetCategoryBreakdown).filter(
            BudgetCategoryBreakdown.budget_report_id == report.id
        ).delete(synchronize_session=False)

        allocations = (
            db.query(BudgetCategory)
            .filter(BudgetCategory.budget_id == budget.id)
            .order_by(BudgetCategory.sort_order.asc(), BudgetCategory.created_at.asc())
            .all()
        )

        if not allocations:
            allocations = BudgetReportRecalculationService._build_fallback_allocations(db, budget, user_id)

        category_ids = [a.category_id for a in allocations]
        categories = (
            db.query(Category)
            .filter(Category.id.in_(category_ids))
            .all()
        )
        category_by_id = {c.id: c for c in categories}

        actual_rows = (
            db.query(
                Transaction.category_id,
                func.coalesce(func.sum(Transaction.amount), 0),
                func.count(Transaction.id),
            )
            .filter(
                Transaction.user_id == user_id,
                Transaction.category_id.in_(category_ids),
                Transaction.transaction_date >= period_start,
                Transaction.transaction_date <= period_end,
                Transaction.transaction_type == TransactionType.EXPENSE,
                Transaction.status == TransactionStatus.POSTED,
            )
            .group_by(Transaction.category_id)
            .all()
        )
        actual_by_category = {row[0]: Decimal(str(row[1] or 0)).quantize(Decimal("0.01")) for row in actual_rows}
        count_by_category = {row[0]: int(row[2] or 0) for row in actual_rows}

        for allocation in allocations:
            category = category_by_id.get(allocation.category_id)
            if not category:
                continue

            budgeted_amount = Decimal(str(allocation.budgeted_amount or 0)).quantize(Decimal("0.01"))
            actual_amount = actual_by_category.get(allocation.category_id, Decimal("0"))
            deviation_data = BudgetCalculator.calculate_deviation(budgeted_amount, actual_amount)
            # Cap deviation_percentage to ±99999.99 to prevent DB overflow
            if deviation_data.get("deviation_percentage") is not None:
                raw_pct = Decimal(str(deviation_data["deviation_percentage"]))
                deviation_data["deviation_percentage"] = max(min(raw_pct, Decimal("99999.99")), Decimal("-99999.99"))

            db.add(
                BudgetCategoryBreakdown(
                    budget_report_id=report.id,
                    category_id=allocation.category_id,
                    category_name=category.name,
                    category_type=allocation.category_type.value,
                    budgeted_amount=budgeted_amount,
                    actual_amount=actual_amount,
                    deviation=deviation_data["deviation"],
                    deviation_percentage=deviation_data["deviation_percentage"],
                    transaction_count=count_by_category.get(allocation.category_id, 0),
                )
            )

    @staticmethod
    def _build_fallback_allocations(db: Session, budget: Budget, user_id: UUID) -> list[BudgetCategory]:
        categories = (
            db.query(Category)
            .filter(
                Category.user_id == user_id,
                Category.is_active == True,  # noqa: E712
                Category.category_type.in_([CategoryType.NEEDS, CategoryType.WANTS, CategoryType.SAVINGS]),
            )
            .order_by(Category.name.asc())
            .all()
        )

        grouped: dict[CategoryType, list[Category]] = {
            CategoryType.NEEDS: [],
            CategoryType.WANTS: [],
            CategoryType.SAVINGS: [],
        }
        for category in categories:
            grouped[category.category_type].append(category)

        type_totals = {
            CategoryType.NEEDS: Decimal(str(budget.needs_amount or 0)),
            CategoryType.WANTS: Decimal(str(budget.wants_amount or 0)),
            CategoryType.SAVINGS: Decimal(str(budget.savings_amount or 0)),
        }

        generated: list[BudgetCategory] = []
        for category_type, cats in grouped.items():
            if not cats:
                continue
            each = (type_totals[category_type] / Decimal(len(cats))).quantize(Decimal("0.01"))
            for idx, category in enumerate(cats):
                alloc = BudgetCategory(
                    budget_id=budget.id,
                    category_id=category.id,
                    category_type=category_type,
                    budgeted_amount=each,
                    sort_order=idx,
                )
                db.add(alloc)
                generated.append(alloc)
        db.flush()
        return generated

    @staticmethod
    def _generate_summary(total_budgeted: Decimal, total_spent: Decimal, is_over_budget: bool) -> str:
        if total_budgeted <= 0:
            return "No budget set for this period."
        if is_over_budget:
            over_amount = total_spent - total_budgeted
            return (
                f"You've exceeded your budget by ${over_amount:.2f}. "
                f"Total spent: ${total_spent:.2f} of ${total_budgeted:.2f} budgeted."
            )
        remaining = total_budgeted - total_spent
        return (
            f"You're on track! You've spent ${total_spent:.2f} "
            f"of ${total_budgeted:.2f} budgeted. ${remaining:.2f} remaining."
        )
