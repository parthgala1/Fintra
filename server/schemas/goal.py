"""
Pydantic schemas for Goal API.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, field_serializer

from models.goal import GoalType, GoalPriority, GoalStatus


class GoalBase(BaseModel):
    """Base goal schema with common fields."""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    goal_type: GoalType
    target_amount: Decimal = Field(..., gt=0)
    target_date: Optional[datetime] = None
    monthly_contribution: Optional[Decimal] = Field(None, ge=0)
    priority: GoalPriority = GoalPriority.MEDIUM

    @field_validator("target_date", mode="before")
    @classmethod
    def parse_target_date(cls, v):
        """Parse date string to datetime if needed."""
        if v is None:
            return None
        if isinstance(v, str):
            # Handle both date (YYYY-MM-DD) and datetime (ISO format) strings
            if "T" not in v:
                v = f"{v}T00:00:00"
            return datetime.fromisoformat(v.replace("Z", "+00:00"))
        return v

    @field_serializer('target_amount', 'monthly_contribution')
    def serialize_decimal_fields(self, value: Optional[Decimal]) -> Optional[float]:
        """Convert Decimal to float for JSON serialization."""
        if value is None:
            return None
        return float(value)


class GoalCreate(GoalBase):
    """Schema for creating a new goal."""

    current_amount: Decimal = Field(default=Decimal("0"), ge=0)

    @field_serializer('current_amount')
    def serialize_current_amount(self, value: Decimal) -> float:
        """Convert Decimal to float for JSON serialization."""
        return float(value)


class GoalUpdate(BaseModel):
    """Schema for updating a goal."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    goal_type: Optional[GoalType] = None
    target_amount: Optional[Decimal] = Field(None, gt=0)
    current_amount: Optional[Decimal] = Field(None, ge=0)
    target_date: Optional[datetime] = None
    monthly_contribution: Optional[Decimal] = Field(None, ge=0)
    priority: Optional[GoalPriority] = None
    status: Optional[GoalStatus] = None

    @field_validator("target_date", mode="before")
    @classmethod
    def parse_target_date(cls, v):
        """Parse date string to datetime if needed."""
        if v is None:
            return None
        if isinstance(v, str):
            if "T" not in v:
                v = f"{v}T00:00:00"
            return datetime.fromisoformat(v.replace("Z", "+00:00"))
        return v

    @field_serializer('target_amount', 'current_amount', 'monthly_contribution')
    def serialize_decimal_fields(self, value: Optional[Decimal]) -> Optional[float]:
        """Convert Decimal to float for JSON serialization."""
        if value is None:
            return None
        return float(value)


class GoalResponse(BaseModel):
    """Schema for goal response."""

    id: UUID
    name: str
    description: Optional[str]
    goal_type: GoalType
    target_amount: Decimal
    current_amount: Decimal
    progress_percentage: Decimal
    target_date: Optional[datetime]
    monthly_contribution: Optional[Decimal]
    priority: GoalPriority
    status: GoalStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer('target_amount', 'current_amount', 'progress_percentage', 'monthly_contribution')
    def serialize_decimal_fields(self, value: Optional[Decimal]) -> Optional[float]:
        """Convert Decimal to float for JSON serialization."""
        if value is None:
            return None
        return float(value)


class GoalAnalysisResponse(BaseModel):
    """Schema for goal analysis response."""

    goal_id: UUID
    required_monthly: Decimal
    current_contribution: Decimal
    gap: Decimal
    feasibility_percentage: Decimal
    is_on_track: bool
    months_remaining: int
    projected_completion_date: Optional[datetime]
    shortfall_amount: Decimal
    risk_level: str  # low, medium, high
    progress_percentage: Decimal

    @field_serializer(
        'required_monthly',
        'current_contribution',
        'gap',
        'feasibility_percentage',
        'shortfall_amount',
        'progress_percentage'
    )
    def serialize_decimal_fields(self, value: Decimal) -> float:
        """Convert Decimal to float for JSON serialization."""
        return float(value)


class GoalListResponse(BaseModel):
    """Schema for list of goals."""

    goals: list[GoalResponse]
    total: int


class GoalContributionCreate(BaseModel):
    """Schema for recording a contribution to a goal."""

    amount: Decimal = Field(..., gt=0)
    contribution_date: datetime

    @field_validator("contribution_date", mode="before")
    @classmethod
    def parse_contribution_date(cls, v):
        """Parse date string to datetime if needed."""
        if isinstance(v, str):
            if "T" not in v:
                v = f"{v}T00:00:00"
            return datetime.fromisoformat(v.replace("Z", "+00:00"))
        return v

    @field_serializer('amount')
    def serialize_amount(self, value: Decimal) -> float:
        """Convert Decimal to float for JSON serialization."""
        return float(value)


class MilestoneCreate(BaseModel):
    """Schema for creating a goal milestone."""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    target_amount: Decimal = Field(..., gt=0)
    target_date: Optional[datetime] = None

    @field_validator("target_date", mode="before")
    @classmethod
    def parse_target_date(cls, v):
        """Parse date string to datetime if needed."""
        if v is None:
            return None
        if isinstance(v, str):
            if "T" not in v:
                v = f"{v}T00:00:00"
            return datetime.fromisoformat(v.replace("Z", "+00:00"))
        return v

    @field_serializer('target_amount')
    def serialize_amount(self, value: Decimal) -> float:
        """Convert Decimal to float for JSON serialization."""
        return float(value)


class MilestoneResponse(BaseModel):
    """Schema for milestone response."""

    id: UUID
    goal_id: UUID
    name: str
    description: Optional[str]
    target_amount: Decimal
    current_amount: Decimal
    target_date: Optional[datetime]
    is_completed: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer('target_amount', 'current_amount')
    def serialize_decimal_fields(self, value: Decimal) -> float:
        """Convert Decimal to float for JSON serialization."""
        return float(value)
