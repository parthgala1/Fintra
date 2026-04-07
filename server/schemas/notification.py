"""
Pydantic schemas for Notification API.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from models.notification import NotificationPriority, NotificationStatus, NotificationType


class NotificationBase(BaseModel):
    """Base notification schema."""

    notification_type: NotificationType
    priority: NotificationPriority
    status: NotificationStatus
    title: str
    message: str
    action_url: Optional[str] = None
    action_text: Optional[str] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[UUID] = None


class NotificationCreate(NotificationBase):
    """Schema for creating a notification."""

    user_id: UUID


class NotificationResponse(NotificationBase):
    """Schema for notification response."""

    id: UUID
    user_id: UUID
    read_at: Optional[datetime] = None
    archived_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationUpdate(BaseModel):
    """Schema for updating a notification."""

    status: Optional[NotificationStatus] = None
    read_at: Optional[datetime] = None
    archived_at: Optional[datetime] = None
