"""
Pydantic schemas for Budget API.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, field_serializer, model_validator

from models.budget import BudgetType, BudgetPeriod


class BudgetBase(BaseModel):
    """Base budget schema with common fields."""

    name: str = Field(..., min_length=1, max_length=255)
    budget_type: BudgetType = BudgetType.FIFTY_THIRTY_TWENTY
    period: BudgetPeriod = BudgetPeriod.MONTHLY
    total_budget: Decimal = Field(..., gt=0)
    needs_percentage: Decimal = Field(..., ge=0, le=100)
    wants_percentage: Decimal = Field(..., ge=0, le=100)
    savings_percentage: Decimal = Field(..., ge=0, le=100)
    start_date: datetime
    end_date: Optional[datetime] = None
    is_active: bool = True

    @field_validator("start_date", mode="before")
    @classmethod
    def parse_start_date(cls, v):
        """Parse date string to datetime if needed."""
        if isinstance(v, str):
            # Handle both date (YYYY-MM-DD) and datetime (ISO format) strings
            if "T" not in v:
                v = f"{v}T00:00:00"
            return datetime.fromisoformat(v.replace("Z", "+00:00"))
        return v

    @field_validator("end_date", mode="before")
    @classmethod
    def parse_end_date(cls, v):
        """Parse date string to datetime if needed."""
        if v is None:
            return None
        if isinstance(v, str):
            # Handle both date (YYYY-MM-DD) and datetime (ISO format) strings
            if "T" not in v:
                v = f"{v}T00:00:00"
            return datetime.fromisoformat(v.replace("Z", "+00:00"))
        return v

    @field_validator("needs_percentage", "wants_percentage", "savings_percentage")
    @classmethod
    def validate_percentages(cls, v):
        if v < 0:
            raise ValueError("Percentage cannot be negative")
        return v

    @field_serializer('total_budget', 'needs_percentage', 'wants_percentage', 'savings_percentage')
    def serialize_decimal_fields(self, value: Decimal) -> float:
        """Convert Decimal to float for JSON serialization.
        
        Ensures numeric fields are serialized as JSON numbers, not strings.
        This fixes the frontend NaN issue where calculations expect numbers.
        """
        if value is None:
            return None
        return float(value)


class BudgetCreate(BudgetBase):
    """Schema for creating a new budget."""

    is_default: bool = False

    @model_validator(mode="after")
    def validate_percentages_sum(self):
        """Validate that percentages sum to 100."""
        total = self.needs_percentage + self.wants_percentage + self.savings_percentage
        if total != 100:
            raise ValueError(f"Percentages must sum to 100, got {total}")
        return self


class BudgetUpdate(BaseModel):
    """Schema for updating a budget."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    budget_type: Optional[BudgetType] = None
    period: Optional[BudgetPeriod] = None
    total_budget: Optional[Decimal] = Field(None, gt=0)
    needs_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    wants_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    savings_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None


class BudgetResponse(BudgetBase):
    """Schema for budget response."""

    id: UUID
    user_id: UUID
    needs_amount: Optional[Decimal] = None
    wants_amount: Optional[Decimal] = None
    savings_amount: Optional[Decimal] = None
    is_default: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

    @field_serializer('needs_amount', 'wants_amount', 'savings_amount')
    def serialize_amount_fields(self, value: Decimal) -> float:
        """Convert Decimal to float for JSON serialization.
        
        Ensures amount fields are serialized as JSON numbers, not strings.
        This fixes the frontend NaN issue where calculations expect numbers.
        """
        if value is None:
            return None
        return float(value)


class BudgetListResponse(BaseModel):
    """Schema for budget list response."""

    budgets: list[BudgetResponse]
    total: int


class BudgetSummary(BaseModel):
    """Schema for budget summary."""

    id: UUID
    name: str
    budget_type: BudgetType
    period: BudgetPeriod
    total_budget: Decimal
    needs_amount: Decimal
    wants_amount: Decimal
    savings_amount: Decimal
    is_default: bool

    model_config = ConfigDict(from_attributes=True)

    @field_serializer('total_budget', 'needs_amount', 'wants_amount', 'savings_amount')
    def serialize_decimal_fields(self, value: Decimal) -> float:
        """Convert Decimal to float for JSON serialization.
        
        Ensures numeric fields are serialized as JSON numbers, not strings.
        This fixes the frontend NaN issue where calculations expect numbers.
        """
        if value is None:
            return None
        return float(value)
