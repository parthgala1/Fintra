import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, String, Boolean, Text, ForeignKey, Integer, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from database import Base


class CategoryMapping(Base):
    """CategoryMapping model for rule-based categorization rules."""

    __tablename__ = "category_mappings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)
    
    # Rule details
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Matching rules (all conditions must match - AND logic)
    # Pattern matching on description
    contains_text = Column(String(255), nullable=True)  # Description contains this text
    starts_with = Column(String(100), nullable=True)  # Description starts with
    ends_with = Column(String(100), nullable=True)  # Description ends with
    regex_pattern = Column(Text, nullable=True)  # Regex pattern
    
    # Merchant matching
    merchant_name = Column(String(255), nullable=True)
    merchant_id = Column(String(100), nullable=True)  # External merchant ID
    
    # Amount rules
    amount_min = Column(Numeric(15, 2), nullable=True)  # Minimum amount
    amount_max = Column(Numeric(15, 2), nullable=True)  # Maximum amount
    
    # Priority (higher = checked first)
    priority = Column(Integer, nullable=True, default=0)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_system = Column(Boolean, default=False)  # System rules vs user rules
    
    # Statistics
    match_count = Column(Integer, nullable=True, default=0)
    last_matched_at = Column(DateTime(timezone=True), nullable=True)
    
    # AI Learning
    learned_from_ai = Column(Boolean, default=False)  # Auto-generated from AI classification
    confidence_score = Column(Numeric(5, 2), default=100.00)  # 0.00 to 100.00
    auto_generated = Column(Boolean, default=False)  # Automatically created rule
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    def __repr__(self):
        return f"<CategoryMapping {self.name} -> {self.category_id}>"
