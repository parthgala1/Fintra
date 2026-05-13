import uuid
from sqlalchemy import Column, DateTime, Numeric, Integer, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from database import Base
from models.category import CategoryType


class BudgetCategory(Base):
    """Per-budget category allocation model (planned values)."""

    __tablename__ = "budget_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    budget_id = Column(
        UUID(as_uuid=True),
        ForeignKey("budgets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category_id = Column(
        UUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category_type = Column(SQLEnum(CategoryType), nullable=False, index=True)
    budgeted_amount = Column(Numeric(15, 2), nullable=False, default=0)
    sort_order = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        Index("uq_budget_categories_budget_category", "budget_id", "category_id", unique=True),
    )

    def __repr__(self):
        return f"<BudgetCategory budget={self.budget_id} category={self.category_id} amount={self.budgeted_amount}>"
