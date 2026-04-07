"""
User preferences router.

Provides endpoints for managing user preferences.
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from auth.router import get_current_user
from database import get_db
from models.user import User
from models.user_preferences import UserPreferences

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/user/preferences", tags=["User Preferences"])


class UserPreferencesResponse(BaseModel):
    """Schema for user preferences response."""
    id: str
    user_id: str
    currency: str
    currency_symbol: str
    date_format: str
    timezone: str
    theme: str
    auto_categorize: bool
    categorize_on_import: bool
    email_notifications: bool
    push_notifications: bool
    weekly_summary: bool
    show_amounts: bool
    created_at: str
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class UpdateUserPreferences(BaseModel):
    """Schema for updating user preferences."""
    theme: Optional[str] = None
    currency: Optional[str] = None
    currency_symbol: Optional[str] = None
    date_format: Optional[str] = None
    timezone: Optional[str] = None
    auto_categorize: Optional[bool] = None
    categorize_on_import: Optional[bool] = None
    email_notifications: Optional[bool] = None
    push_notifications: Optional[bool] = None
    weekly_summary: Optional[bool] = None
    monthly_report: Optional[bool] = None
    show_amounts: Optional[bool] = None


def _get_currency_symbol(currency_code: str) -> str:
    """Get currency symbol for currency code."""
    symbols = {
        "USD": "$",
        "EUR": "€",
        "GBP": "£",
        "INR": "₹",
        "JPY": "¥",
        "AUD": "A$",
        "CAD": "C$",
    }
    return symbols.get(currency_code, "$")


def _create_default_preferences(user_id: UUID, db: Session) -> UserPreferences:
    """Create default preferences for a new user."""
    prefs = UserPreferences(
        user_id=user_id,
        currency="INR",
        currency_symbol="₹",
        date_format="DD/MM/YYYY",
        timezone="Asia/Kolkata",
        theme="dark",
        auto_categorize=True,
        categorize_on_import=True,
        email_notifications=True,
        push_notifications=True,
        weekly_summary=True,
        show_amounts=True,
    )
    db.add(prefs)
    db.commit()
    db.refresh(prefs)
    logger.info(f"Created default preferences for user {user_id}")
    return prefs


@router.get("", response_model=UserPreferencesResponse)
def get_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's preferences."""
    try:
        prefs = db.query(UserPreferences).filter(
            UserPreferences.user_id == current_user.id
        ).first()
        
        if not prefs:
            logger.info(f"No preferences found for user {current_user.id}, creating defaults")
            prefs = _create_default_preferences(current_user.id, db)
        
        return prefs
        
    except SQLAlchemyError as e:
        logger.error(f"Database error getting preferences: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch preferences"
        )


@router.patch("", response_model=UserPreferencesResponse)
def update_preferences(
    updates: UpdateUserPreferences,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update current user's preferences."""
    try:
        prefs = db.query(UserPreferences).filter(
            UserPreferences.user_id == current_user.id
        ).first()
        
        if not prefs:
            logger.info(f"No preferences found for user {current_user.id}, creating new")
            prefs = _create_default_preferences(current_user.id, db)
        
        # Apply updates
        update_data = updates.model_dump(exclude_unset=True)
        
        # Handle currency symbol if currency is being updated
        if "currency" in update_data:
            update_data["currency_symbol"] = _get_currency_symbol(update_data["currency"])
        
        for field, value in update_data.items():
            if value is not None and hasattr(prefs, field):
                setattr(prefs, field, value)
        
        db.commit()
        db.refresh(prefs)
        
        logger.info(f"Updated preferences for user {current_user.id}")
        return prefs
        
    except SQLAlchemyError as e:
        logger.error(f"Database error updating preferences: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update preferences"
        )