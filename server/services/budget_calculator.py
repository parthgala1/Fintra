"""
Budget Calculator Service.

Handles budget amount calculations from percentages,
deviation calculations, and savings rate calculations.
"""

from decimal import Decimal
from typing import Optional

from models.budget import Budget, BudgetType


class BudgetCalculator:
    """Calculator for budget-related computations."""

    # Default 50/30/20 percentages
    DEFAULT_NEEDS_PERCENTAGE = Decimal("50.00")
    DEFAULT_WANTS_PERCENTAGE = Decimal("30.00")
    DEFAULT_SAVINGS_PERCENTAGE = Decimal("20.00")

    @staticmethod
    def calculate_amounts(
        total_budget: Decimal,
        needs_percentage: Optional[Decimal] = None,
        wants_percentage: Optional[Decimal] = None,
        savings_percentage: Optional[Decimal] = None,
        budget_type: BudgetType = BudgetType.FIFTY_THIRTY_TWENTY,
    ) -> dict[str, Decimal]:
        """
        Calculate budget amounts from percentages.

        Args:
            total_budget: Total budget amount
            needs_percentage: Percentage for needs (default 50%)
            wants_percentage: Percentage for wants (default 30%)
            savings_percentage: Percentage for savings (default 20%)
            budget_type: Type of budget (fifty_thirty_twenty or custom)

        Returns:
            Dictionary with needs_amount, wants_amount, savings_amount
        """
        if budget_type == BudgetType.FIFTY_THIRTY_TWENTY:
            needs_pct = needs_percentage or BudgetCalculator.DEFAULT_NEEDS_PERCENTAGE
            wants_pct = wants_percentage or BudgetCalculator.DEFAULT_WANTS_PERCENTAGE
            savings_pct = savings_percentage or BudgetCalculator.DEFAULT_SAVINGS_PERCENTAGE
        else:
            needs_pct = needs_percentage or Decimal("0")
            wants_pct = wants_percentage or Decimal("0")
            savings_pct = savings_percentage or Decimal("0")

        # Calculate amounts
        needs_amount = (total_budget * needs_pct) / Decimal("100")
        wants_amount = (total_budget * wants_pct) / Decimal("100")
        savings_amount = (total_budget * savings_pct) / Decimal("100")

        return {
            "needs_amount": needs_amount.quantize(Decimal("0.01")),
            "wants_amount": wants_amount.quantize(Decimal("0.01")),
            "savings_amount": savings_amount.quantize(Decimal("0.01")),
        }

    @staticmethod
    def validate_percentages(
        needs_percentage: Decimal,
        wants_percentage: Decimal,
        savings_percentage: Decimal,
        tolerance: Decimal = Decimal("0.01"),
    ) -> bool:
        """
        Validate that percentages sum to 100.

        Args:
            needs_percentage: Percentage for needs
            wants_percentage: Percentage for wants
            savings_percentage: Percentage for savings
            tolerance: Allowed deviation from 100

        Returns:
            True if valid, False otherwise
        """
        total = needs_percentage + wants_percentage + savings_percentage
        return abs(total - Decimal("100")) <= tolerance

    @staticmethod
    def calculate_deviation(
        planned: Decimal,
        actual: Decimal,
    ) -> dict[str, Decimal]:
        """
        Calculate deviation between planned and actual amounts.

        Args:
            planned: Planned/budgeted amount
            actual: Actual amount spent

        Returns:
            Dictionary with deviation and deviation_percentage
        """
        deviation = actual - planned  # Positive = overspending, negative = underspending

        if planned > 0:
            deviation_percentage = (deviation / planned) * Decimal("100")
        else:
            deviation_percentage = Decimal("0")

        return {
            "deviation": deviation.quantize(Decimal("0.01")),
            "deviation_percentage": deviation_percentage.quantize(Decimal("0.01")),
        }

    @staticmethod
    def calculate_percentage_used(
        budgeted: Decimal,
        actual: Decimal,
    ) -> Decimal:
        """
        Calculate percentage of budget used.

        Args:
            budgeted: Budgeted amount
            actual: Actual amount spent

        Returns:
            Percentage used
        """
        if budgeted <= 0:
            return Decimal("0")

        percentage = (actual / budgeted) * Decimal("100")
        return percentage.quantize(Decimal("0.01"))

    @staticmethod
    def calculate_savings_rate(income: Decimal, expenses: Decimal) -> Decimal:
        """
        Calculate savings rate.

        Formula: savings_rate = (income - expenses) / income

        Args:
            income: Total income
            expenses: Total expenses

        Returns:
            Savings rate as percentage
        """
        if income <= 0:
            return Decimal("0")

        savings_rate = ((income - expenses) / income) * Decimal("100")
        return savings_rate.quantize(Decimal("0.01"))

    @staticmethod
    def calculate_investment_rate(income: Decimal, investments: Decimal) -> Decimal:
        """
        Calculate investment rate.

        Formula: investment_rate = investments / income

        Args:
            income: Total income
            investments: Total investments

        Returns:
            Investment rate as percentage
        """
        if income <= 0:
            return Decimal("0")

        investment_rate = (investments / income) * Decimal("100")
        return investment_rate.quantize(Decimal("0.01"))

    @staticmethod
    def calculate_needs_ratio(needs_amount: Decimal, income: Decimal) -> Decimal:
        """
        Calculate needs ratio.

        Formula: needs_ratio = needs_amount / income

        Args:
            needs_amount: Needs amount
            income: Total income

        Returns:
            Needs ratio as percentage
        """
        if income <= 0:
            return Decimal("0")

        needs_ratio = (needs_amount / income) * Decimal("100")
        return needs_ratio.quantize(Decimal("0.01"))

    @staticmethod
    def calculate_wants_ratio(wants_amount: Decimal, income: Decimal) -> Decimal:
        """
        Calculate wants ratio.

        Formula: wants_ratio = wants_amount / income

        Args:
            wants_amount: Wants amount
            income: Total income

        Returns:
            Wants ratio as percentage
        """
        if income <= 0:
            return Decimal("0")

        wants_ratio = (wants_amount / income) * Decimal("100")
        return wants_ratio.quantize(Decimal("0.01"))

    @staticmethod
    def calculate_50_30_20_from_income(income: Decimal) -> dict[str, Decimal]:
        """
        Calculate 50/30/20 budget from income.

        Args:
            income: Total income

        Returns:
            Dictionary with needs, wants, savings amounts
        """
        needs = (income * BudgetCalculator.DEFAULT_NEEDS_PERCENTAGE) / Decimal("100")
        wants = (income * BudgetCalculator.DEFAULT_WANTS_PERCENTAGE) / Decimal("100")
        savings = (income * BudgetCalculator.DEFAULT_SAVINGS_PERCENTAGE) / Decimal("100")

        return {
            "needs_amount": needs.quantize(Decimal("0.01")),
            "wants_amount": wants.quantize(Decimal("0.01")),
            "savings_amount": savings.quantize(Decimal("0.01")),
        }

    @staticmethod
    def calculate_burn_rate(total_expenses: Decimal, income: Decimal) -> Decimal:
        """
        Calculate burn rate.

        Formula: burn_rate = total_expenses / income × 100

        Args:
            total_expenses: Total expenses
            income: Total income

        Returns:
            Burn rate as percentage
        """
        if income <= 0:
            return Decimal("0")

        burn_rate = (total_expenses / income) * Decimal("100")
        return burn_rate.quantize(Decimal("0.01"))

    @staticmethod
    def calculate_discretionary_spending(
        wants_amount: Decimal,
        investments_amount: Decimal,
        goal_commitments: Decimal,
    ) -> Decimal:
        """
        Calculate discretionary spending.

        Formula: discretionary = wants + (investments - goal_commitments)

        Args:
            wants_amount: Wants spending
            investments_amount: Total investments
            goal_commitments: Amount committed to goals

        Returns:
            Discretionary spending amount
        """
        discretionary = wants_amount + (investments_amount - goal_commitments)
        return discretionary.quantize(Decimal("0.01"))

    @staticmethod
    def calculate_goal_commitment_ratio(
        goal_allocations: Decimal, income: Decimal
    ) -> Decimal:
        """
        Calculate goal commitment ratio.

        Formula: goal_ratio = goal_allocations / income × 100

        Args:
            goal_allocations: Total monthly goal allocations
            income: Total income

        Returns:
            Goal commitment ratio as percentage
        """
        if income <= 0:
            return Decimal("0")

        goal_ratio = (goal_allocations / income) * Decimal("100")
        return goal_ratio.quantize(Decimal("0.01"))
