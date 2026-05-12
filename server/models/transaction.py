import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, DateTime, String, Numeric, Boolean, Text, Enum as SQLEnum, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from database import Base


class TransactionType(str, enum.Enum):
    """Transaction type enum."""
    INCOME = "income"
    EXPENSE = "expense"
    TRANSFER = "transfer"


class TransactionStatus(str, enum.Enum):
    """Transaction status enum."""
    PENDING = "pending"
    POSTED = "posted"
    CLEARED = "cleared"
    RECONCILED = "reconciled"


class Transaction(Base):
    """Transaction model for normalized bank transactions."""

    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    bank_account_id = Column(UUID(as_uuid=True), ForeignKey("bank_accounts.id"), nullable=False, index=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True, index=True)
    
    # Original data from bank
    external_transaction_id = Column(String(255), nullable=True, index=True)  # Bank's transaction ID
    original_description = Column(Text, nullable=False)
    merchant_name = Column(String(255), nullable=True)
    
    # Normalized data
    description = Column(String(500), nullable=True)
    amount = Column(Numeric(15, 2), nullable=False)
    transaction_type = Column(SQLEnum(TransactionType), nullable=False, index=True)
    status = Column(SQLEnum(TransactionStatus), nullable=False, default=TransactionStatus.POSTED)
    
    # Dates
    transaction_date = Column(DateTime(timezone=True), nullable=False, index=True)
    posted_date = Column(DateTime(timezone=True), nullable=True)
    
    # Additional info
    is_recurring = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    is_manual = Column(Boolean, default=False)  # Manually added vs imported
    
    # Check number for checks
    check_number = Column(String(50), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    # Indexes for common queries
    __table_args__ = (
        Index('idx_transactions_user_date', 'user_id', 'transaction_date'),
        Index('idx_transactions_user_category', 'user_id', 'category_id'),
    )

    # Relationships
    category = relationship("Category", foreign_keys=[category_id])
    bank_account = relationship("BankAccount", foreign_keys=[bank_account_id])

    @property
    def category_name(self) -> Optional[str]:
        """Get category name from relationship."""
        return self.category.name if self.category else None

    @property
    def category_type(self) -> Optional[str]:
        """Get category type from relationship."""
        return self.category.category_type if self.category else None

    @property
    def bank_account_name(self) -> Optional[str]:
        """Get bank account name from relationship."""
        return self.bank_account.name if self.bank_account else None

    def __repr__(self):
        return f"<Transaction {self.description} - {self.amount}>"
