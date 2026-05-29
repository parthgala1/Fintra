"""Schemas for scenario snapshots."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from uuid import UUID
from decimal import Decimal


class ScenarioSnapshotBase(BaseModel):
    """Base schema for scenario snapshots."""
    
    month_index: int = Field(..., description="Month index (0 = start month)")
    projected_income: Optional[Decimal] = Field(None, description="Projected monthly income")
    projected_expenses: Optional[Decimal] = Field(None, description="Projected monthly expenses")
    projected_savings: Optional[Decimal] = Field(None, description="Projected monthly savings")
    emergency_fund_balance: Optional[Decimal] = Field(None, description="Projected emergency fund balance")
    debt_balance: Optional[Decimal] = Field(None, description="Projected debt balance")
    goal_progress: Optional[Decimal] = Field(None, description="Goal progress (0.0-1.0)")
    health_score: Optional[Decimal] = Field(None, description="Financial health score (0-100)")


class ScenarioSnapshotCreate(ScenarioSnapshotBase):
    """Schema for creating snapshots."""
    pass


class ScenarioSnapshotResponse(ScenarioSnapshotBase):
    """Response schema for snapshots."""
    
    id: UUID
    scenario_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
