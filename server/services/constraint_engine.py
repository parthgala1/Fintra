"""
Constraint Engine Service.

Enforces budget constraints per Project.md Section 5.1.d
Validates budgets against hard and soft constraints.
"""

from dataclasses import dataclass
from decimal import Decimal
from enum import Enum
from typing import Optional


class ConstraintType(str, Enum):
    """Type of constraint."""
    HARD = "hard"
    SOFT = "soft"


class ConstraintSeverity(str, Enum):
    """Severity level of constraint violation."""
    ERROR = "error"  # Hard constraint violation (blocks save)
    WARNING = "warning"  # Soft constraint violation (warning only)


@dataclass
class ConstraintViolation:
    """Represents a constraint violation."""
    constraint_name: str
    constraint_type: ConstraintType
    severity: ConstraintSeverity
    message: str
    current_value: Decimal
    required_value: Decimal
    suggestion: str


class ConstraintEngine:
    """
    Enforce budget constraints per Project.md Section 5.1.d

    Hard Constraints (block save):
    1. Total allocation = 100%
    2. Needs >= 25%
    3. Investments >= sum(goal requirements)
    4. All allocations >= 0

    Soft Constraints (warnings):
    1. Needs <= 50%
    2. Wants >= 10%
    3. Investments >= 15%
    """

    # Hard constraint thresholds
    TOTAL_ALLOCATION_TARGET = Decimal("100.00")
    TOTAL_ALLOCATION_TOLERANCE = Decimal("0.01")
    MIN_NEEDS_PERCENTAGE = Decimal("25.00")

    # Soft constraint thresholds
    MAX_NEEDS_WARNING = Decimal("50.00")
    MIN_WANTS_WARNING = Decimal("10.00")
    MIN_INVESTMENTS_WARNING = Decimal("15.00")

    @staticmethod
    def validate_budget(
        needs_percentage: Decimal,
        wants_percentage: Decimal,
        savings_percentage: Decimal,
        goal_requirements: Optional[Decimal] = None,
        total_income: Optional[Decimal] = None,
    ) -> tuple[bool, list[ConstraintViolation]]:
        """
        Validate budget against all constraints.

        Args:
            needs_percentage: Needs allocation percentage
            wants_percentage: Wants allocation percentage
            savings_percentage: Savings allocation percentage
            goal_requirements: Total monthly goal requirements (optional)
            total_income: Total monthly income (optional, for goal validation)

        Returns:
            Tuple of (is_valid, violations)
            - is_valid: False if ANY hard constraint violated
            - violations: List of all violations (hard + soft)
        """
        violations = []

        # Hard Constraint 1: Total allocation = 100%
        total = needs_percentage + wants_percentage + savings_percentage
        if (
            abs(total - ConstraintEngine.TOTAL_ALLOCATION_TARGET)
            > ConstraintEngine.TOTAL_ALLOCATION_TOLERANCE
        ):
            diff = total - Decimal("100.00")
            violations.append(
                ConstraintViolation(
                    constraint_name="total_allocation",
                    constraint_type=ConstraintType.HARD,
                    severity=ConstraintSeverity.ERROR,
                    message=f"Total allocation = {total}%. Required: 100%.",
                    current_value=total,
                    required_value=Decimal("100.00"),
                    suggestion=f"{'Reduce' if diff > 0 else 'Increase'} allocations by {abs(diff):.2f}%",
                )
            )

        # Hard Constraint 2: Needs >= 25%
        if needs_percentage < ConstraintEngine.MIN_NEEDS_PERCENTAGE:
            diff = ConstraintEngine.MIN_NEEDS_PERCENTAGE - needs_percentage
            violations.append(
                ConstraintViolation(
                    constraint_name="min_needs",
                    constraint_type=ConstraintType.HARD,
                    severity=ConstraintSeverity.ERROR,
                    message=f"Needs = {needs_percentage}%. Minimum: 25%.",
                    current_value=needs_percentage,
                    required_value=Decimal("25.00"),
                    suggestion=f"Increase needs by {diff:.2f}%",
                )
            )

        # Hard Constraint 3: Investments >= goal requirements (if provided)
        if goal_requirements is not None and total_income is not None and total_income > 0:
            required_pct = (goal_requirements / total_income) * Decimal("100")
            if savings_percentage < required_pct:
                diff = required_pct - savings_percentage
                violations.append(
                    ConstraintViolation(
                        constraint_name="goal_requirements",
                        constraint_type=ConstraintType.HARD,
                        severity=ConstraintSeverity.ERROR,
                        message=f"Active goals require {required_pct:.1f}% of income. Current: {savings_percentage}%.",
                        current_value=savings_percentage,
                        required_value=required_pct,
                        suggestion=f"Increase investments by {diff:.1f}%",
                    )
                )

        # Hard Constraint 4: Non-negative allocations
        if needs_percentage < 0 or wants_percentage < 0 or savings_percentage < 0:
            violations.append(
                ConstraintViolation(
                    constraint_name="non_negative",
                    constraint_type=ConstraintType.HARD,
                    severity=ConstraintSeverity.ERROR,
                    message="All allocations must be >= 0%",
                    current_value=min(needs_percentage, wants_percentage, savings_percentage),
                    required_value=Decimal("0"),
                    suggestion="Set all percentages to positive values",
                )
            )

        # Soft Constraint 1: Needs <= 50%
        if needs_percentage > ConstraintEngine.MAX_NEEDS_WARNING:
            diff = needs_percentage - ConstraintEngine.MAX_NEEDS_WARNING
            violations.append(
                ConstraintViolation(
                    constraint_name="max_needs_warning",
                    constraint_type=ConstraintType.SOFT,
                    severity=ConstraintSeverity.WARNING,
                    message=f"Needs at {needs_percentage}% (target: ≤50%). Consider reducing housing/essential costs.",
                    current_value=needs_percentage,
                    required_value=Decimal("50.00"),
                    suggestion="Look for ways to reduce rent or essential expenses",
                )
            )

        # Soft Constraint 2: Wants >= 10%
        if wants_percentage < ConstraintEngine.MIN_WANTS_WARNING:
            diff = ConstraintEngine.MIN_WANTS_WARNING - wants_percentage
            violations.append(
                ConstraintViolation(
                    constraint_name="min_wants_warning",
                    constraint_type=ConstraintType.SOFT,
                    severity=ConstraintSeverity.WARNING,
                    message=f"Wants at {wants_percentage}% (target: ≥10%). Low quality of life risk.",
                    current_value=wants_percentage,
                    required_value=Decimal("10.00"),
                    suggestion="Budget may be too restrictive",
                )
            )

        # Soft Constraint 3: Investments >= 15%
        if savings_percentage < ConstraintEngine.MIN_INVESTMENTS_WARNING:
            diff = ConstraintEngine.MIN_INVESTMENTS_WARNING - savings_percentage
            violations.append(
                ConstraintViolation(
                    constraint_name="min_investments_warning",
                    constraint_type=ConstraintType.SOFT,
                    severity=ConstraintSeverity.WARNING,
                    message=f"Investments at {savings_percentage}% (target: ≥15%). Insufficient wealth building.",
                    current_value=savings_percentage,
                    required_value=Decimal("15.00"),
                    suggestion="Increase savings by cutting discretionary spending",
                )
            )

        # Check if any HARD constraints violated
        is_valid = not any(
            v.constraint_type == ConstraintType.HARD for v in violations
        )

        return is_valid, violations

    @staticmethod
    def get_error_violations(
        violations: list[ConstraintViolation],
    ) -> list[ConstraintViolation]:
        """
        Filter to only hard constraint violations.

        Args:
            violations: List of all violations

        Returns:
            List of error violations only
        """
        return [v for v in violations if v.severity == ConstraintSeverity.ERROR]

    @staticmethod
    def get_warning_violations(
        violations: list[ConstraintViolation],
    ) -> list[ConstraintViolation]:
        """
        Filter to only soft constraint violations.

        Args:
            violations: List of all violations

        Returns:
            List of warning violations only
        """
        return [v for v in violations if v.severity == ConstraintSeverity.WARNING]
