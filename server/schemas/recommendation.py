"""
Recommendation API Schemas.

Pydantic models for recommendation serialization.
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_serializer

from models.recommendation import (
    RecommendationCategory,
    RecommendationImpact,
    RecommendationStatus,
)


class RecommendationResponse(BaseModel):
    """Recommendation response schema."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    category: RecommendationCategory
    impact: RecommendationImpact
    status: RecommendationStatus
    title: str
    description: str
    short_summary: Optional[str] = None
    potential_savings: Optional[Decimal] = None
    potential_earnings: Optional[Decimal] = None
    estimated_time_to_impact: Optional[str] = None
    action_steps: Optional[str] = None  # JSON string
    external_resources: Optional[str] = None  # JSON string
    trigger_type: Optional[str] = None
    trigger_data: Optional[str] = None  # JSON string
    dismissal_reason: Optional[str] = None
    snoozed_until: Optional[datetime] = None
    implemented_at: Optional[datetime] = None
    view_count: Optional[int] = None
    dismiss_count: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    @field_serializer("potential_savings", "potential_earnings", when_used="json")
    def serialize_decimal(self, value: Optional[Decimal]) -> Optional[float]:
        """Serialize Decimal to float for JSON."""
        return float(value) if value is not None else None


class RecommendationListResponse(BaseModel):
    """List of recommendations response."""

    recommendations: List[RecommendationResponse]
    total: int


class RecommendationGenerateRequest(BaseModel):
    """Request to generate recommendations."""

    type: Optional[str] = None  # "budget", "goal", "savings", or None for all


class RecommendationDismissRequest(BaseModel):
    """Request to dismiss a recommendation."""

    reason: Optional[str] = None


class RecommendationSnoozeRequest(BaseModel):
    """Request to snooze a recommendation."""

    days: int = 7  # Default 7 days


class RecommendationFilterParams(BaseModel):
    """Query parameters for filtering recommendations."""

    category: Optional[RecommendationCategory] = None
    status: Optional[RecommendationStatus] = None
    impact: Optional[RecommendationImpact] = None
    limit: Optional[int] = None
    offset: int = 0
