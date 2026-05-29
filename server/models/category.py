import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, String, Text, Boolean, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import enum

from database import Base


class CategoryType(str, enum.Enum):
    """Category type enum for 50/30/20 rule.
    TRANSFER and INCOME are legacy values — new code should use DirectionType
    on the transaction rather than assigning a transfer/income category.
    """
    NEEDS = "needs"
    WANTS = "wants"
    SAVINGS = "savings"
    INCOME = "income"
    TRANSFER = "transfer"  # frozen — new transfer categories should not be created


class Category(Base):
    """Category model for spending/income categorization with 50/30/20 type mapping."""

    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=True, index=True)  # Can be NULL for system categories
    name = Column(String(100), nullable=False)
    category_type = Column(SQLEnum(CategoryType), nullable=False, index=True)
    icon = Column(String(50), nullable=True)
    color = Column(String(20), nullable=True)
    description = Column(Text, nullable=True)
    is_system = Column(Boolean, default=False)  # System categories vs user-created
    is_active = Column(Boolean, default=True)

    # Hierarchical classification support (new)
    # bucket_type mirrors category_type for NEEDS/WANTS/SAVINGS; 'none' for INCOME/TRANSFER
    bucket_type = Column(String(20), nullable=True)
    # is_misc_category marks Misc Needs / Misc Wants / Misc Savings fallback categories
    is_misc_category = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    def __repr__(self):
        return f"<Category {self.name} ({self.category_type.value})>"
