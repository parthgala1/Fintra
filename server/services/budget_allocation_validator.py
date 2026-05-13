from decimal import Decimal

from models.budget import Budget
from models.budget_category import BudgetCategory
from models.category import CategoryType


class BudgetAllocationValidator:
    @staticmethod
    def validate_budget_category_totals(budget: Budget, allocations: list[BudgetCategory]) -> tuple[bool, str | None]:
        needs_total = Decimal("0")
        wants_total = Decimal("0")
        savings_total = Decimal("0")

        for alloc in allocations:
            amount = Decimal(str(alloc.budgeted_amount or 0))
            if alloc.category_type == CategoryType.NEEDS:
                needs_total += amount
            elif alloc.category_type == CategoryType.WANTS:
                wants_total += amount
            elif alloc.category_type == CategoryType.SAVINGS:
                savings_total += amount

        budget_needs = Decimal(str(budget.needs_amount or 0))
        budget_wants = Decimal(str(budget.wants_amount or 0))
        budget_savings = Decimal(str(budget.savings_amount or 0))
        tolerance = Decimal("0.01")

        if abs(needs_total - budget_needs) > tolerance:
            return False, f"Needs allocations must total {budget_needs}, got {needs_total}"
        if abs(wants_total - budget_wants) > tolerance:
            return False, f"Wants allocations must total {budget_wants}, got {wants_total}"
        if abs(savings_total - budget_savings) > tolerance:
            return False, f"Savings allocations must total {budget_savings}, got {savings_total}"

        total_allocated = needs_total + wants_total + savings_total
        budget_total = Decimal(str(budget.total_budget or 0))
        if abs(total_allocated - budget_total) > tolerance:
            return False, f"Total allocations must equal budget total {budget_total}, got {total_allocated}"

        return True, None
