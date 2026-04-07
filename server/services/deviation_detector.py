"""
Deviation Detector Service.

Detects spending deviations from budget allocations
and categorizes them by severity.
"""

import logging
from dataclasses import dataclass
from decimal import Decimal
from enum import Enum
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from models.budget import Budget
from models.budget_report import BudgetReport

logger = logging.getLogger(__name__)


class DeviationLevel(str, Enum):
    """Deviation severity levels."""

    ON_TRACK = "on_track"  # Under 80%
    WARNING = "warning"  # 80-89%
    CRITICAL = "critical"  # 90-99%
    OVER_BUDGET = "over_budget"  # 100%+


@dataclass
class Deviation:
    """Deviation detection result."""

    budget_id: UUID
    category: str  # needs, wants, savings, total
    budgeted_amount: Decimal
    actual_amount: Decimal
    deviation_amount: Decimal
    deviation_percentage: Decimal
    level: DeviationLevel
    threshold_breached: Optional[Decimal] = None


class DeviationDetector:
    """Service for detecting budget deviations."""

    # Thresholds
    WARNING_THRESHOLD = Decimal("80.00")
    CRITICAL_THRESHOLD = Decimal("90.00")
    OVER_BUDGET_THRESHOLD = Decimal("100.00")

    @staticmethod
    def determine_level(percentage_used: Decimal) -> DeviationLevel:
        """
        Determine deviation level based on percentage used.

        Args:
            percentage_used: Percentage of budget used

        Returns:
            DeviationLevel
        """
        if percentage_used >= DeviationDetector.OVER_BUDGET_THRESHOLD:
            return DeviationLevel.OVER_BUDGET
        elif percentage_used >= DeviationDetector.CRITICAL_THRESHOLD:
            return DeviationLevel.CRITICAL
        elif percentage_used >= DeviationDetector.WARNING_THRESHOLD:
            return DeviationLevel.WARNING
        else:
            return DeviationLevel.ON_TRACK

    @staticmethod
    def detect_deviations(
        db: Session,
        budget_id: UUID,
    ) -> list[Deviation]:
        """
        Detect deviations for a budget based on latest report.

        Args:
            db: Database session
            budget_id: Budget ID

        Returns:
            List of deviations detected
        """
        # Get the latest report for this budget
        latest_report = (
            db.query(BudgetReport)
            .filter(BudgetReport.budget_id == budget_id)
            .order_by(BudgetReport.created_at.desc())
            .first()
        )

        if not latest_report:
            logger.info(f"No reports found for budget {budget_id}")
            return []

        budget = (
            db.query(Budget).filter(Budget.id == budget_id).first()
        )

        if not budget:
            return []

        deviations = []

        # Check needs deviation
        if latest_report.budgeted_needs and latest_report.budgeted_needs > 0:
            needs_deviation = DeviationDetector._create_deviation(
                budget_id=budget_id,
                category="needs",
                budgeted_amount=latest_report.budgeted_needs,
                actual_amount=latest_report.actual_needs or Decimal("0"),
            )
            deviations.append(needs_deviation)

        # Check wants deviation
        if latest_report.budgeted_wants and latest_report.budgeted_wants > 0:
            wants_deviation = DeviationDetector._create_deviation(
                budget_id=budget_id,
                category="wants",
                budgeted_amount=latest_report.budgeted_wants,
                actual_amount=latest_report.actual_wants or Decimal("0"),
            )
            deviations.append(wants_deviation)

        # Check savings deviation
        if latest_report.budgeted_savings and latest_report.budgeted_savings > 0:
            savings_deviation = DeviationDetector._create_deviation(
                budget_id=budget_id,
                category="savings",
                budgeted_amount=latest_report.budgeted_savings,
                actual_amount=latest_report.actual_savings or Decimal("0"),
            )
            deviations.append(savings_deviation)

        # Check total deviation
        if latest_report.total_budgeted and latest_report.total_budgeted > 0:
            total_deviation = DeviationDetector._create_deviation(
                budget_id=budget_id,
                category="total",
                budgeted_amount=latest_report.total_budgeted,
                actual_amount=latest_report.total_spent or Decimal("0"),
            )
            deviations.append(total_deviation)

        logger.info(f"Detected {len(deviations)} deviations for budget {budget_id}")
        return deviations

    @staticmethod
    def _create_deviation(
        budget_id: UUID,
        category: str,
        budgeted_amount: Decimal,
        actual_amount: Decimal,
    ) -> Deviation:
        """Create a deviation object."""
        if budgeted_amount > 0:
            deviation_amount = actual_amount - budgeted_amount
            deviation_percentage = (actual_amount / budgeted_amount) * Decimal("100")
        else:
            deviation_amount = Decimal("0")
            deviation_percentage = Decimal("0")

        level = DeviationDetector.determine_level(deviation_percentage)

        # Calculate threshold breached
        threshold_breached = None
        if deviation_percentage >= DeviationDetector.OVER_BUDGET_THRESHOLD:
            threshold_breached = DeviationDetector.OVER_BUDGET_THRESHOLD
        elif deviation_percentage >= DeviationDetector.CRITICAL_THRESHOLD:
            threshold_breached = DeviationDetector.CRITICAL_THRESHOLD
        elif deviation_percentage >= DeviationDetector.WARNING_THRESHOLD:
            threshold_breached = DeviationDetector.WARNING_THRESHOLD

        return Deviation(
            budget_id=budget_id,
            category=category,
            budgeted_amount=budgeted_amount,
            actual_amount=actual_amount,
            deviation_amount=deviation_amount.quantize(Decimal("0.01")),
            deviation_percentage=deviation_percentage.quantize(Decimal("0.01")),
            level=level,
            threshold_breached=threshold_breached,
        )

    @staticmethod
    def get_alert_level_deviations(
        deviations: list[Deviation],
    ) -> list[Deviation]:
        """
        Filter deviations that should trigger alerts.

        Args:
            deviations: List of all deviations

        Returns:
            List of deviations that trigger alerts (warning or above)
        """
        return [
            d for d in deviations if d.level in [DeviationLevel.WARNING, DeviationLevel.CRITICAL, DeviationLevel.OVER_BUDGET]
        ]
