import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, String, Boolean, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from database import Base


class UserPreferences(Base):
    """UserPreferences model for user settings."""

    __tablename__ = "user_preferences"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, unique=True, index=True)
    
    # Currency and locale
    currency = Column(String(3), nullable=False, default="USD")
    currency_symbol = Column(String(5), nullable=False, default="$")
    date_format = Column(String(20), nullable=False, default="MM/DD/YYYY")
    timezone = Column(String(50), nullable=False, default="America/New_York")
    
    # Dashboard preferences
    dashboard_layout = Column(Text, nullable=True)  # JSON for dashboard widget layout
    default_view = Column(String(20), nullable=True)  # dashboard, transactions, budgets, goals
    show_zero_balance_accounts = Column(Boolean, default=True)
    
    # Transaction preferences
    auto_categorize = Column(Boolean, default=True)
    categorize_on_import = Column(Boolean, default=True)
    suggest_recurring = Column(Boolean, default=True)
    default_transaction_type = Column(String(20), nullable=True)  # expense, income
    
    # Budget preferences
    default_budget_type = Column(String(30), nullable=True)  # fifty_thirty_twenty, custom
    budget_notifications = Column(Boolean, default=True)
    budget_warning_threshold = Column(String(3), nullable=True, default="80")  # percentage
    
    # Goal preferences
    goal_notifications = Column(Boolean, default=True)
    goal_reminder_frequency = Column(String(20), nullable=True)  # daily, weekly, monthly
    
    # Notification preferences
    email_notifications = Column(Boolean, default=True)
    push_notifications = Column(Boolean, default=True)
    weekly_summary = Column(Boolean, default=True)
    monthly_report = Column(Boolean, default=True)
    alert_types = Column(Text, nullable=True)  # JSON array
    
    # Privacy
    show_amounts = Column(Boolean, default=True)  # Show actual amounts vs masked
    share_analytics = Column(Boolean, default=False)
    
    # Appearance
    theme = Column(String(20), nullable=False, default="light")  # light, dark, system
    accent_color = Column(String(20), nullable=True)
    
    # Data & privacy
    data_export_enabled = Column(Boolean, default=True)
    two_factor_enabled = Column(Boolean, default=False)
    
    # Advanced
    fiscal_year_start = Column(String(10), nullable=True)  # MM-DD format
    tax_year_start = Column(String(10), nullable=True)
    custom_fields = Column(Text, nullable=True)  # JSON for custom user fields
    
    # API access
    api_key = Column(String(255), nullable=True)
    api_key_created_at = Column(DateTime(timezone=True), nullable=True)
    api_key_last_used = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    def __repr__(self):
        return f"<UserPreferences for user {self.user_id}>"
