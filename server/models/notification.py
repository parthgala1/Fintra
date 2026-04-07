import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, String, Boolean, Text, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import enum

from database import Base


class NotificationType(str, enum.Enum):
    """Notification type enum."""
    BUDGET_ALERT = "budget_alert"
    GOAL_UPDATE = "goal_update"
    TRANSACTION_ALERT = "transaction_alert"
    RECURRING_PAYMENT = "recurring_payment"
    INSIGHT = "insight"
    SYSTEM = "system"
    SECURITY = "security"


class NotificationPriority(str, enum.Enum):
    """Notification priority enum."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class NotificationStatus(str, enum.Enum):
    """Notification status enum."""
    UNREAD = "unread"
    READ = "read"
    ARCHIVED = "archived"


class Notification(Base):
    """Notification model for alerts and notifications."""

    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Notification details
    notification_type = Column(SQLEnum(NotificationType), nullable=False, index=True)
    priority = Column(SQLEnum(NotificationPriority), nullable=False, default=NotificationPriority.MEDIUM)
    status = Column(SQLEnum(NotificationStatus), nullable=False, default=NotificationStatus.UNREAD)
    
    # Content
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    
    # Action
    action_url = Column(String(500), nullable=True)
    action_text = Column(String(100), nullable=True)
    
    # Related entity (optional)
    related_entity_type = Column(String(50), nullable=True)
    related_entity_id = Column(UUID(as_uuid=True), nullable=True)
    
    # Read tracking
    read_at = Column(DateTime(timezone=True), nullable=True)
    archived_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index('idx_notifications_user_status', 'user_id', 'status'),
        Index('idx_notifications_user_type', 'user_id', 'notification_type'),
    )

    def __repr__(self):
        return f"<Notification {self.title} - {self.status.value}>"
