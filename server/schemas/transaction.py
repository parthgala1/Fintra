"""
Pydantic schemas for Transaction API.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, field_serializer

from models.transaction import TransactionStatus, TransactionType


class TransactionBase(BaseModel):
    """Base transaction schema with common fields."""

    description: Optional[str] = None
    merchant_name: Optional[str] = None
    amount: Decimal = Field(...)
    transaction_type: TransactionType = Field(serialization_alias='type')
    transaction_date: datetime = Field(serialization_alias='date')
    notes: Optional[str] = None
    is_recurring: Optional[bool] = None
    is_manual: Optional[bool] = None
    check_number: Optional[str] = None
    category_id: Optional[UUID] = None
    bank_account_id: Optional[UUID] = None

    @field_serializer('amount')
    def serialize_amount(self, value: Decimal) -> float:
        """Convert Decimal to float for JSON serialization.
        
        Ensures the amount field is serialized as a JSON number, not a string.
        This fixes the frontend issue where Math.abs() was receiving a string.
        """
        if value is None:
            return None
        return float(value)


class TransactionCreate(TransactionBase):
    """Schema for creating a new transaction."""

    external_transaction_id: Optional[str] = None
    original_description: str
    status: TransactionStatus = TransactionStatus.POSTED
    posted_date: Optional[datetime] = None


class TransactionUpdate(BaseModel):
    """Schema for updating a transaction."""

    description: Optional[str] = None
    merchant_name: Optional[str] = None
    notes: Optional[str] = None
    category_id: Optional[UUID] = None
    transaction_type: Optional[TransactionType] = None
    status: Optional[TransactionStatus] = None


class TransactionResponse(TransactionBase):
    """Schema for transaction response."""

    id: UUID
    user_id: UUID
    external_transaction_id: Optional[str] = None
    original_description: str
    status: TransactionStatus
    posted_date: Optional[datetime] = None
    category_name: Optional[str] = None
    bank_account_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TransactionListResponse(BaseModel):
    """Schema for paginated transaction list."""

    transactions: list[TransactionResponse]
    total: int
    page: int = 1
    page_size: int = 50
    total_pages: int = 0


class TransactionFilter(BaseModel):
    """Schema for transaction filtering."""

    user_id: Optional[UUID] = None
    bank_account_id: Optional[UUID] = None
    category_id: Optional[UUID] = None
    transaction_type: Optional[TransactionType] = None
    status: Optional[TransactionStatus] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    search: Optional[str] = None
    min_amount: Optional[Decimal] = None
    max_amount: Optional[Decimal] = None


class BulkCategoryUpdate(BaseModel):
    """Schema for bulk category update."""

    transaction_ids: list[UUID]
    category_id: UUID
