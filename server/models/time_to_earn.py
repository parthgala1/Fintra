import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, String, Numeric, Boolean, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from database import Base


class TimeToEarn(Base):
    """TimeToEarn model for caching time-to-earn calculations."""

    __tablename__ = "time_to_earn_cache"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Item details
    item_name = Column(String(255), nullable=False)
    item_cost = Column(Numeric(15, 2), nullable=False)
    
    # Calculation inputs
    hourly_rate = Column(Numeric(10, 2), nullable=False)
    weekly_hours = Column(Numeric(5, 2), nullable=True)
    monthly_gross = Column(Numeric(15, 2), nullable=True)
    take_home_percentage = Column(Numeric(5, 2), nullable=True)
    
    # Calculation result
    hours_to_earn = Column(Numeric(10, 2), nullable=False)
    days_to_earn = Column(Numeric(10, 2), nullable=True)
    weeks_to_earn = Column(Numeric(10, 2), nullable=True)
    months_to_earn = Column(Numeric(10, 2), nullable=True)
    
    # Calculation method
    calculation_method = Column(String(50), nullable=True)  # hourly, daily, monthly
    
    # Context
    income_source = Column(String(100), nullable=True)  # primary job, side hustle, etc.
    after_taxes = Column(Boolean, default=True)
    
    # Cache validity
    calculated_at = Column(DateTime(timezone=True), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index('idx_time_to_earn_user', 'user_id', 'item_name'),
    )

    def __repr__(self):
        return f"<TimeToEarn {self.item_name}: {self.hours_to_earn} hours>"
