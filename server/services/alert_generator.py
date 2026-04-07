"""
Alert Generator Service.

Generates notifications for budget alerts when
spending exceeds defined thresholds.
"""

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from models.budget import Budget
from models.notification import Notification, NotificationPriority, NotificationType
from services.deviation_detector import Deviation, DeviationDetector, DeviationLevel

logger = logging.getLogger(__name__)


class AlertGenerator:
    """Service for generating budget alerts."""

    @staticmethod
    def create_alert(
        db: Session,
        user_id: UUID,
        deviation: Deviation,
    ) -> Notification:
        """
        Create a notification for a deviation.

        Args:
            db: Database session
            user_id: User ID
            deviation: Deviation detected

        Returns:
            Created Notification
        """
        # Determine priority based on level
        priority = AlertGenerator._get_priority_for_level(deviation.level)

        # Generate title and message
        title, message = AlertGenerator._generate_alert_content(deviation)

        # Create action URL
        action_url = f"/budgets/{deviation.budget_id}/reports"
        action_text = "View Report"

        notification = Notification(
            user_id=user_id,
            notification_type=NotificationType.BUDGET_ALERT,
            priority=priority,
            status="unread",
            title=title,
            message=message,
            action_url=action_url,
            action_text=action_text,
            related_entity_type="budget",
            related_entity_id=deviation.budget_id,
        )

        db.add(notification)
        db.commit()
        db.refresh(notification)

        logger.info(
            f"Created alert {notification.id} for budget {deviation.budget_id}, "
            f"level: {deviation.level.value}"
        )

        return notification

    @staticmethod
    def _get_priority_for_level(level: DeviationLevel) -> NotificationPriority:
        """Get notification priority for deviation level."""
        if level == DeviationLevel.OVER_BUDGET:
            return NotificationPriority.HIGH
        elif level == DeviationLevel.CRITICAL:
            return NotificationPriority.HIGH
        elif level == DeviationLevel.WARNING:
            return NotificationPriority.MEDIUM
        else:
            return NotificationPriority.LOW

    @staticmethod
    def _generate_alert_content(deviation: Deviation) -> tuple[str, str]:
        """Generate title and message for alert."""
        category_display = deviation.category.capitalize()

        if deviation.level == DeviationLevel.OVER_BUDGET:
            title = f"Over Budget: {category_display} Exceeded"
            message = (
                f"You've exceeded your {category_display} budget! "
                f"You've spent ${deviation.actual_amount:.2f} "
                f"of ${deviation.budgeted_amount:.2f} budgeted. "
                f"(${abs(deviation.deviation_amount):.2f} over)"
            )
        elif deviation.level == DeviationLevel.CRITICAL:
            title = f"Critical: {category_display} Budget Nearly Depleted"
            message = (
                f"You've used {deviation.deviation_percentage:.0f}% of your "
                f"{category_display} budget. Only "
                f"${max(Decimal('0'), deviation.budgeted_amount - deviation.actual_amount):.2f} remaining."
            )
        elif deviation.level == DeviationLevel.WARNING:
            title = f"Warning: {category_display} Budget {deviation.deviation_percentage:.0f}% Used"
            message = (
                f"Your {category_display} budget is at {deviation.deviation_percentage:.0f}%. "
                f"${max(Decimal('0'), deviation.budgeted_amount - deviation.actual_amount):.2f} remaining."
            )
        else:
            title = f"Update: {category_display} Budget"
            message = (
                f"You're at {deviation.deviation_percentage:.0f}% of your "
                f"{category_display} budget. "
                f"${max(Decimal('0'), deviation.budgeted_amount - deviation.actual_amount):.2f} remaining."
            )

        return title, message

    @staticmethod
    def check_and_create_alerts(
        db: Session,
        user_id: UUID,
        budget_ids: Optional[list[UUID]] = None,
    ) -> list[Notification]:
        """
        Check budgets for deviations and create alerts.

        Args:
            db: Database session
            user_id: User ID
            budget_ids: Specific budget IDs to check (optional)

        Returns:
            List of created notifications
        """
        # Get active budgets
        query = db.query(Budget).filter(
            Budget.user_id == user_id,
            Budget.is_active == True,  # noqa: E712
        )

        if budget_ids:
            query = query.filter(Budget.id.in_(budget_ids))

        budgets = query.all()

        created_alerts = []

        for budget in budgets:
            # Detect deviations
            deviations = DeviationDetector.detect_deviations(db, budget.id)

            # Get alert-level deviations
            alert_deviations = DeviationDetector.get_alert_level_deviations(deviations)

            # Create alerts for each deviation
            for deviation in alert_deviations:
                # Check if an alert already exists for this deviation (within last 24 hours)
                window_start = datetime.now() - timedelta(hours=24)
                existing_alert = (
                    db.query(Notification)
                    .filter(
                        Notification.user_id == user_id,
                        Notification.notification_type == NotificationType.BUDGET_ALERT,
                        Notification.related_entity_id == budget.id,
                        Notification.title.like(f"%{deviation.category.capitalize()}%"),
                        Notification.created_at >= window_start,
                    )
                    .first()
                )

                if not existing_alert:
                    alert = AlertGenerator.create_alert(db, user_id, deviation)
                    created_alerts.append(alert)

        logger.info(f"Created {len(created_alerts)} alerts for user {user_id}")
        return created_alerts
