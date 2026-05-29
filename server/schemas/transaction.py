"""
Pydantic schemas for Transaction API.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, field_serializer

from models.transaction import TransactionStatus, TransactionType, DirectionType, BucketType, ClassificationSource


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

    model_config = ConfigDict(populate_by_name=True)

    description: Optional[str] = None
    merchant_name: Optional[str] = None
    amount: Optional[Decimal] = None
    transaction_date: Optional[datetime] = Field(default=None, validation_alias='date')
    notes: Optional[str] = None
    category_id: Optional[UUID] = None
    transaction_type: Optional[TransactionType] = Field(default=None, validation_alias='type')
    status: Optional[TransactionStatus] = None
    direction_type: Optional[DirectionType] = None
    bucket_type: Optional[BucketType] = None
    user_verified: Optional[bool] = None


class TransactionResponse(TransactionBase):
    """Schema for transaction response."""

    id: UUID
    user_id: UUID
    external_transaction_id: Optional[str] = None
    original_description: str
    status: TransactionStatus
    posted_date: Optional[datetime] = None
    category_name: Optional[str] = None
    category_type: Optional[str] = None
    bank_account_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Hierarchical classification fields (new — Optional for backward compatibility)
    direction_type: Optional[DirectionType] = None
    bucket_type: Optional[BucketType] = None
    confidence_score: Optional[Decimal] = None
    classification_source: Optional[ClassificationSource] = None
    user_verified: Optional[bool] = None
    needs_review: Optional[bool] = None

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


# ─── Analysis schemas ─────────────────────────────────────────────────────────


class CategoryBreakdownItem(BaseModel):
    """Per-category spend summary for analysis."""

    category_id: Optional[str] = None
    category_name: str
    category_type: Optional[str] = None
    total: float
    transaction_count: int
    percentage: float  # % of total expenses (or income for income categories)


class BucketBreakdownItem(BaseModel):
    """Per-bucket (needs/wants/savings/income/transfer) summary for analysis."""

    bucket: str
    total: float
    transaction_count: int
    percentage: float  # % of total amount across all buckets


class TransactionAnalysisResponse(BaseModel):
    """Aggregated analysis of transactions matching the given filters."""

    total_income: float
    total_expenses: float
    net: float  # total_income - total_expenses
    transaction_count: int
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    avg_daily_expense: float
    largest_expense: Optional[float] = None
    largest_income: Optional[float] = None
    category_breakdown: list[CategoryBreakdownItem]
    bucket_breakdown: list[BucketBreakdownItem]
    top_expense_categories: list[CategoryBreakdownItem]  # top 5 by total
