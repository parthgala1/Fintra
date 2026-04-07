"""
Goal Engine Service.

Handles goal calculations including required monthly contributions,
gap analysis, and feasibility calculations per Project.md Section 6.4.
"""

import logging
from datetime import datetime
from decimal import Decimal
from typing import Dict, Optional
from dateutil.relativedelta import relativedelta

from models.goal import Goal, GoalStatus

logger = logging.getLogger(__name__)


class GoalEngine:
    """Calculator for goal-related computations."""

    @staticmethod
    def calculate_months_remaining(
        target_date: Optional[datetime],
        current_date: Optional[datetime] = None
    ) -> int:
        """
        Calculate months remaining until target date.
        
        Args:
            target_date: Goal target date
            current_date: Current date (default: now)
        
        Returns:
            Number of months remaining (0 if target date passed or None)
        """
        if target_date is None:
            return 0
        
        if current_date is None:
            current_date = datetime.now(target_date.tzinfo)
        
        # Calculate difference
        delta = relativedelta(target_date, current_date)
        months = delta.years * 12 + delta.months
        
        # If there are remaining days, count as partial month
        if delta.days > 0:
            months += 1
        
        # Return 0 if negative (deadline passed)
        return max(0, months)

    @staticmethod
    def calculate_required_monthly(
        target_amount: Decimal,
        current_amount: Decimal,
        months_remaining: int
    ) -> Decimal:
        """
        Calculate required monthly contribution to reach goal.
        
        Formula (per Project.md 6.4):
            required_monthly = (target_amount - current_amount) / months_remaining
        
        Args:
            target_amount: Target goal amount
            current_amount: Current amount saved
            months_remaining: Months until deadline
        
        Returns:
            Required monthly contribution
        """
        # Handle edge case: goal already met
        if current_amount >= target_amount:
            return Decimal("0")
        
        # Handle edge case: no time remaining
        if months_remaining <= 0:
            return target_amount - current_amount  # Full amount needed immediately
        
        remaining_amount = target_amount - current_amount
        required_monthly = remaining_amount / Decimal(str(months_remaining))
        
        return required_monthly.quantize(Decimal("0.01"))

    @staticmethod
    def calculate_gap(
        required_monthly: Decimal,
        current_contribution: Decimal
    ) -> Decimal:
        """
        Calculate gap between required and current monthly contribution.
        
        Formula (per Project.md 6.4):
            gap = required_monthly - current_contribution
        
        Positive gap = need to increase contribution
        Negative gap = contributing more than needed
        
        Args:
            required_monthly: Required monthly contribution
            current_contribution: Current monthly contribution
        
        Returns:
            Gap amount (positive = shortfall, negative = surplus)
        """
        gap = required_monthly - current_contribution
        return gap.quantize(Decimal("0.01"))

    @staticmethod
    def calculate_feasibility(
        current_contribution: Decimal,
        required_monthly: Decimal
    ) -> Decimal:
        """
        Calculate feasibility percentage.
        
        Formula (per Project.md 6.4):
            feasibility = (current_contribution / required_monthly) * 100
        
        100% = on track
        <100% = behind
        >100% = ahead
        
        Args:
            current_contribution: Current monthly contribution
            required_monthly: Required monthly contribution
        
        Returns:
            Feasibility percentage (0-100+)
        """
        # Handle edge case: no monthly contribution needed
        if required_monthly <= 0:
            return Decimal("100.00")
        
        # Calculate percentage
        feasibility = (current_contribution / required_monthly) * Decimal("100")
        
        return feasibility.quantize(Decimal("0.01"))

    @staticmethod
    def calculate_progress_percentage(
        current_amount: Decimal,
        target_amount: Decimal
    ) -> Decimal:
        """
        Calculate goal progress percentage.
        
        Args:
            current_amount: Current amount saved
            target_amount: Target goal amount
        
        Returns:
            Progress percentage (0-100)
        """
        if target_amount <= 0:
            return Decimal("0")
        
        progress = (current_amount / target_amount) * Decimal("100")
        
        # Cap at 100%
        progress = min(progress, Decimal("100"))
        
        return progress.quantize(Decimal("0.01"))

    @staticmethod
    def update_goal_progress(goal: Goal) -> Goal:
        """
        Update goal progress percentage based on current vs target amount.
        
        Args:
            goal: Goal object to update
        
        Returns:
            Updated goal object (not saved to DB)
        """
        goal.progress_percentage = GoalEngine.calculate_progress_percentage(
            goal.current_amount,
            goal.target_amount
        )
        
        logger.debug(
            f"Updated goal {goal.id} progress: "
            f"{goal.current_amount}/{goal.target_amount} = {goal.progress_percentage}%"
        )
        
        return goal

    @staticmethod
    def check_goal_completion(goal: Goal) -> bool:
        """
        Check if goal is complete (current amount >= target amount).
        
        Args:
            goal: Goal object to check
        
        Returns:
            True if goal is complete
        """
        is_complete = goal.current_amount >= goal.target_amount
        
        if is_complete:
            logger.info(
                f"Goal {goal.id} ({goal.name}) is complete: "
                f"{goal.current_amount} >= {goal.target_amount}"
            )
        
        return is_complete

    @staticmethod
    def calculate_projected_completion_date(
        goal: Goal,
        current_contribution: Optional[Decimal] = None
    ) -> Optional[datetime]:
        """
        Calculate projected completion date based on current contribution rate.
        
        Args:
            goal: Goal object
            current_contribution: Monthly contribution (default: goal.monthly_contribution)
        
        Returns:
            Projected completion date, or None if not calculable
        """
        if current_contribution is None:
            current_contribution = goal.monthly_contribution or Decimal("0")
        
        # Handle edge cases
        if current_contribution <= 0:
            return None  # Can't project without contributions
        
        if goal.current_amount >= goal.target_amount:
            return datetime.now()  # Already complete
        
        # Calculate months needed
        remaining_amount = goal.target_amount - goal.current_amount
        months_needed = (remaining_amount / current_contribution)
        
        # Add to current date
        projected_date = datetime.now() + relativedelta(months=int(months_needed))
        
        # Add extra days for partial month
        partial_month = months_needed % 1
        if partial_month > 0:
            days = int(partial_month * 30)  # Approximate
            projected_date += relativedelta(days=days)
        
        logger.debug(
            f"Projected completion for goal {goal.id}: "
            f"{months_needed:.1f} months from now = {projected_date}"
        )
        
        return projected_date

    @staticmethod
    def assess_risk_level(
        feasibility: Decimal,
        months_remaining: int,
        gap: Decimal
    ) -> str:
        """
        Assess risk level for goal achievement.
        
        Args:
            feasibility: Feasibility percentage
            months_remaining: Months until deadline
            gap: Gap between required and current contribution
        
        Returns:
            Risk level: "low", "medium", or "high"
        """
        # Goal already on track or ahead
        if feasibility >= 100:
            return "low"
        
        # Very behind schedule
        if feasibility < 50:
            return "high"
        
        # Not much time left
        if months_remaining <= 3 and gap > 0:
            return "high"
        
        # Moderate gap
        if feasibility < 75:
            return "medium"
        
        return "low"

    @staticmethod
    def calculate_full_analysis(goal: Goal) -> Dict:
        """
        Calculate complete goal analysis with all metrics.
        
        Args:
            goal: Goal object
        
        Returns:
            Dictionary with all calculated metrics
        """
        logger.info(f"Calculating analysis for goal {goal.id} ({goal.name})")
        
        # Get current contribution (default to 0 if not set)
        current_contribution = goal.monthly_contribution or Decimal("0")
        
        # Calculate months remaining
        months_remaining = GoalEngine.calculate_months_remaining(goal.target_date)
        
        # Calculate required monthly
        required_monthly = GoalEngine.calculate_required_monthly(
            goal.target_amount,
            goal.current_amount,
            months_remaining
        )
        
        # Calculate gap
        gap = GoalEngine.calculate_gap(required_monthly, current_contribution)
        
        # Calculate feasibility
        feasibility = GoalEngine.calculate_feasibility(
            current_contribution,
            required_monthly
        )
        
        # Calculate progress
        progress = GoalEngine.calculate_progress_percentage(
            goal.current_amount,
            goal.target_amount
        )
        
        # Check if on track
        is_on_track = feasibility >= 100
        
        # Calculate projected completion
        projected_completion_date = GoalEngine.calculate_projected_completion_date(
            goal,
            current_contribution
        )
        
        # Calculate shortfall
        shortfall_amount = max(Decimal("0"), goal.target_amount - goal.current_amount)
        
        # Assess risk
        risk_level = GoalEngine.assess_risk_level(
            feasibility,
            months_remaining,
            gap
        )
        
        analysis = {
            "goal_id": str(goal.id),
            "required_monthly": required_monthly,
            "current_contribution": current_contribution,
            "gap": gap,
            "feasibility_percentage": feasibility,
            "is_on_track": is_on_track,
            "months_remaining": months_remaining,
            "projected_completion_date": projected_completion_date,
            "shortfall_amount": shortfall_amount,
            "risk_level": risk_level,
            "progress_percentage": progress,
        }
        
        logger.debug(f"Goal analysis: {analysis}")
        
        return analysis
