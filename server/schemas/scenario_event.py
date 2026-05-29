"""Schemas for scenario event management."""

from datetime import datetime
from typing import Optional, Any, Dict
from pydantic import BaseModel, Field
from uuid import UUID


class ScenarioEventBase(BaseModel):
    """Base schema for scenario events."""
    
    event_type: str = Field(..., description="Type of event (e.g., salary_raise, emi_added)")
    effective_date: datetime = Field(..., description="Date when event takes effect")
    recurrence_rule: Optional[str] = Field(None, description="Recurrence rule (e.g., 'monthly', 'yearly')")
    payload_json: Optional[Dict[str, Any]] = Field(None, description="Event-specific metadata")
    priority: int = Field(default=0, description="Priority for processing")


class ScenarioEventCreate(ScenarioEventBase):
    """Schema for creating scenario events."""
    pass


class ScenarioEventUpdate(BaseModel):
    """Schema for updating scenario events."""
    
    event_type: Optional[str] = None
    effective_date: Optional[datetime] = None
    recurrence_rule: Optional[str] = None
    payload_json: Optional[Dict[str, Any]] = None
    priority: Optional[int] = None


class ScenarioEventResponse(ScenarioEventBase):
    """Response schema for scenario events."""
    
    id: UUID
    scenario_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
