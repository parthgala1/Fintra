"""
Pydantic schemas for Budget Scenario API.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_serializer


class ScenarioBase(BaseModel):
    """Base scenario schema."""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    goal_id: Optional[UUID] = None
    scenario_type: str = Field(default="custom", description="Type of scenario (custom, goal_achievement, etc.)")
    simulation_horizon_months: int = Field(default=12, ge=1, le=360)
    strategy_type: str = Field(default="balanced", description="Strategy type (conservative, balanced, aggressive)")
    income_change: Optional[Decimal] = Field(None)
    new_income: Optional[Decimal] = Field(None, ge=0)
    scenario_needs_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    scenario_wants_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    scenario_savings_percentage: Optional[Decimal] = Field(None, ge=0, le=100)

    @field_serializer(
        'income_change', 'new_income', 'scenario_needs_percentage',
        'scenario_wants_percentage', 'scenario_savings_percentage'
    )
    def serialize_decimal_fields(self, value: Decimal) -> float:
        """Convert Decimal to float for JSON serialization.
        
        Ensures numeric fields are serialized as JSON numbers, not strings.
        This fixes the frontend NaN issue where calculations expect numbers.
        """
        if value is None:
            return None
        return float(value)


class ScenarioCreate(ScenarioBase):
    """Schema for creating a new scenario."""

    budget_id: Optional[UUID] = None
    is_saved: bool = False


class ScenarioUpdate(BaseModel):
    """Schema for updating a scenario."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    goal_id: Optional[UUID] = None
    scenario_type: Optional[str] = None
    simulation_horizon_months: Optional[int] = Field(None, ge=1, le=360)
    strategy_type: Optional[str] = None
    income_change: Optional[Decimal] = Field(None)
    new_income: Optional[Decimal] = Field(None, ge=0)
    scenario_needs_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    scenario_wants_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    scenario_savings_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    is_saved: Optional[bool] = None
    is_active: Optional[bool] = None


class ScenarioResponse(ScenarioBase):
    """Schema for scenario response."""

    id: UUID
    user_id: UUID
    budget_id: Optional[UUID] = None
    feasibility_score: Optional[Decimal] = None
    scenario_needs_amount: Optional[Decimal] = None
    scenario_wants_amount: Optional[Decimal] = None
    scenario_savings_amount: Optional[Decimal] = None
    current_needs_amount: Optional[Decimal] = None
    current_wants_amount: Optional[Decimal] = None
    current_savings_amount: Optional[Decimal] = None
    needs_impact: Optional[Decimal] = None
    wants_impact: Optional[Decimal] = None
    savings_impact: Optional[Decimal] = None
    is_saved: bool
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

    @field_serializer(
        'scenario_needs_amount', 'scenario_wants_amount', 'scenario_savings_amount',
        'current_needs_amount', 'current_wants_amount', 'current_savings_amount',
        'needs_impact', 'wants_impact', 'savings_impact'
    )
    def serialize_amount_fields(self, value: Decimal) -> float:
        """Convert Decimal to float for JSON serialization.
        
        Ensures amount fields are serialized as JSON numbers, not strings.
        This fixes the frontend NaN issue where calculations expect numbers.
        """
        if value is None:
            return None
        return float(value)


class ScenarioListResponse(BaseModel):
    """Schema for scenario list response."""

    scenarios: list[ScenarioResponse]
    total: int


class ScenarioCalculate(BaseModel):
    """Schema for scenario calculation request."""

    income_change: Optional[Decimal] = Field(None)
    new_income: Optional[Decimal] = Field(None, gt=0)
    scenario_needs_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    scenario_wants_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    scenario_savings_percentage: Optional[Decimal] = Field(None, ge=0, le=100)


class ScenarioCalculateResponse(BaseModel):
    """Schema for scenario calculation response."""

    scenario_id: UUID
    new_income: Decimal
    scenario_needs_amount: Decimal
    scenario_wants_amount: Decimal
    scenario_savings_amount: Decimal
    needs_impact: Decimal
    wants_impact: Decimal
    savings_impact: Decimal
    savings_rate: Decimal
    needs_ratio: Decimal
    wants_ratio: Decimal

    @field_serializer(
        'new_income', 'scenario_needs_amount', 'scenario_wants_amount',
        'scenario_savings_amount', 'needs_impact', 'wants_impact',
        'savings_impact', 'savings_rate', 'needs_ratio', 'wants_ratio'
    )
    def serialize_decimal_fields(self, value: Decimal) -> float:
        """Convert Decimal to float for JSON serialization.
        
        Ensures numeric fields are serialized as JSON numbers, not strings.
        This fixes the frontend NaN issue where calculations expect numbers.
        """
        if value is None:
            return None
        return float(value)


class ImpactSummary(BaseModel):
    """Schema for impact summary."""

    category: str
    current_amount: Decimal
    scenario_amount: Decimal
    impact: Decimal
    impact_percentage: Decimal

    @field_serializer('current_amount', 'scenario_amount', 'impact', 'impact_percentage')
    def serialize_decimal_fields(self, value: Decimal) -> float:
        """Convert Decimal to float for JSON serialization.
        
        Ensures numeric fields are serialized as JSON numbers, not strings.
        This fixes the frontend NaN issue where calculations expect numbers.
        """
        if value is None:
            return None
        return float(value)
