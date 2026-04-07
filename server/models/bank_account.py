import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, String, Numeric, Boolean, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import enum

from database import Base


class AccountType(str, enum.Enum):
    """Bank account type enum."""
    CHECKING = "checking"
    SAVINGS = "savings"
    CREDIT_CARD = "credit_card"
    INVESTMENT = "investment"
    CASH = "cash"
    OTHER = "other"


class BankAccount(Base):
    """BankAccount model for storing user's bank accounts."""

    __tablename__ = "bank_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    institution_id = Column(String(100), nullable=True)  # Plaid institution ID
    institution_name = Column(String(255), nullable=True)
    account_name = Column(String(255), nullable=False)
    account_type = Column(SQLEnum(AccountType), nullable=False)
    account_number_last4 = Column(String(4), nullable=True)  # Last 4 digits only
    routing_number = Column(String(9), nullable=True)
    current_balance = Column(Numeric(15, 2), nullable=False, default=0)
    available_balance = Column(Numeric(15, 2), nullable=True)
    credit_limit = Column(Numeric(15, 2), nullable=True)  # For credit cards
    is_active = Column(Boolean, default=True)
    is_connected = Column(Boolean, default=False)  # Manual or connected via API
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    def __repr__(self):
        return f"<BankAccount {self.account_name} ({self.account_type.value})>"
