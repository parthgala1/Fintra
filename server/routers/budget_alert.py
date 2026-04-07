"""
Budget Alert API router.

Provides endpoints for managing budget alerts
and alert configurations.
"""

import logging
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth.router import get_current_user
from database import get_db
from models.budget import Budget
from models.notification import Notification, NotificationStatus
from models.notification import NotificationType
from schemas.notification import NotificationResponse
from models.user import User
from services.alert_generator import AlertGenerator

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/budgets/alerts", tags=["Budget Alerts"])

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user_dep(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    """Dependency to get current authenticated user."""
    return get_current_user(token, db)


# Alert Configuration Schemas
class AlertConfigResponse(BaseModel):
    """Schema for alert configuration response."""

    warning_threshold: Decimal
    critical_threshold: Decimal
    overspend_alert: bool
    notifications_enabled: bool


class AlertConfigUpdate(BaseModel):
    """Schema for updating alert configuration."""

    warning_threshold: Optional[Decimal] = None
    critical_threshold: Optional[Decimal] = None
    overspend_alert: Optional[bool] = None
    notifications_enabled: Optional[bool] = None


# In-memory config storage (in production, store in database)
# Default thresholds
WARNING_THRESHOLD = Decimal("80.00")
CRITICAL_THRESHOLD = Decimal("90.00")
OVERSPEND_ALERT = True
NOTIFICATIONS_ENABLED = True

# Per-user config storage
_user_configs: dict[str, AlertConfigResponse] = {}


@router.get("", response_model=list[NotificationResponse])
def get_alerts(
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
    status_filter: Optional[str] = None,
    limit: int = 50,
):
    """
    Get active budget alerts for the current user.
    
    Args:
        current_user: Current authenticated user
        db: Database session
        status_filter: Filter by status (unread, read, archived)
        limit: Maximum number of alerts to return
    
    Returns:
        List of budget alerts
    """
    query = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.notification_type == NotificationType.BUDGET_ALERT,
    )
    
    if status_filter:
        try:
            status_enum = NotificationStatus(status_filter)
            query = query.filter(Notification.status == status_enum)
        except ValueError:
            pass
    
    alerts = query.order_by(Notification.created_at.desc()).limit(limit).all()
    
    return alerts


@router.get("/config", response_model=AlertConfigResponse)
def get_alert_config(
    current_user: User = Depends(get_current_user_dep),
):
    """
    Get alert configuration for the current user.
    
    Args:
        current_user: Current authenticated user
    
    Returns:
        Alert configuration
    """
    user_id_str = str(current_user.id)
    
    if user_id_str in _user_configs:
        return _user_configs[user_id_str]
    
    return AlertConfigResponse(
        warning_threshold=WARNING_THRESHOLD,
        critical_threshold=CRITICAL_THRESHOLD,
        overspend_alert=OVERSPEND_ALERT,
        notifications_enabled=NOTIFICATIONS_ENABLED,
    )


@router.put("/config", response_model=AlertConfigResponse)
def update_alert_config(
    config_data: AlertConfigUpdate,
    current_user: User = Depends(get_current_user_dep),
):
    """
    Update alert configuration for the current user.
    
    Args:
        config_data: Configuration update data
        current_user: Current authenticated user
    
    Returns:
        Updated alert configuration
    """
    user_id_str = str(current_user.id)
    
    # Get current config
    current_config = get_alert_config(current_user)
    
    # Update values
    warning_threshold = config_data.warning_threshold or current_config.warning_threshold
    critical_threshold = config_data.critical_threshold or current_config.critical_threshold
    overspend_alert = config_data.overspend_alert if config_data.overspend_alert is not None else current_config.overspend_alert
    notifications_enabled = config_data.notifications_enabled if config_data.notifications_enabled is not None else current_config.notifications_enabled
    
    # Validate thresholds
    if warning_threshold >= critical_threshold:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Warning threshold must be less than critical threshold",
        )
    
    # Save config
    new_config = AlertConfigResponse(
        warning_threshold=warning_threshold,
        critical_threshold=critical_threshold,
        overspend_alert=overspend_alert,
        notifications_enabled=notifications_enabled,
    )
    _user_configs[user_id_str] = new_config
    
    logger.info(f"Updated alert config for user {current_user.id}")
    
    return new_config


@router.post("/check", response_model=list[NotificationResponse])
def trigger_alert_check(
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
    budget_ids: Optional[list[UUID]] = None,
):
    """
    Manually trigger alert check for all budgets.
    
    Args:
        current_user: Current authenticated user
        db: Database session
        budget_ids: Specific budget IDs to check (optional)
    
    Returns:
        List of created alerts
    """
    # Check if notifications are enabled
    user_config = get_alert_config(current_user)
    
    if not user_config.notifications_enabled:
        logger.info(f"Notifications disabled for user {current_user.id}")
        return []
    
    # Check and create alerts
    alerts = AlertGenerator.check_and_create_alerts(
        db=db,
        user_id=current_user.id,
        budget_ids=budget_ids,
    )
    
    logger.info(f"Alert check for user {current_user.id}: created {len(alerts)} alerts")
    
    return alerts


@router.patch("/{alert_id}/dismiss", response_model=NotificationResponse)
def dismiss_alert(
    alert_id: UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Dismiss a budget alert.
    
    Args:
        alert_id: Alert UUID
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Updated alert
    """
    alert = (
        db.query(Notification)
        .filter(
            Notification.id == alert_id,
            Notification.user_id == current_user.id,
            Notification.notification_type == NotificationType.BUDGET_ALERT,
        )
        .first()
    )
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found",
        )
    
    # Mark as read/archived
    alert.status = NotificationStatus.ARCHIVED
    db.commit()
    db.refresh(alert)
    
    logger.info(f"Dismissed alert {alert_id}")
    
    return alert


@router.post("/{alert_id}/read", response_model=NotificationResponse)
def mark_alert_read(
    alert_id: UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Mark an alert as read.
    
    Args:
        alert_id: Alert UUID
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Updated alert
    """
    from datetime import datetime
    
    alert = (
        db.query(Notification)
        .filter(
            Notification.id == alert_id,
            Notification.user_id == current_user.id,
            Notification.notification_type == NotificationType.BUDGET_ALERT,
        )
        .first()
    )
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found",
        )
    
    # Mark as read
    alert.status = NotificationStatus.READ
    alert.read_at = datetime.now()
    db.commit()
    db.refresh(alert)
    
    logger.info(f"Marked alert {alert_id} as read")
    
    return alert
