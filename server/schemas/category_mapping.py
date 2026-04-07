"""
Pydantic schemas for CategoryMapping API.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from models.category_mapping import CategoryMapping


class CategoryMappingBase(BaseModel):
    """Base category mapping schema with common fields."""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category_id: UUID
    
    # Matching rules
    contains_text: Optional[str] = None
    starts_with: Optional[str] = None
    ends_with: Optional[str] = None
    regex_pattern: Optional[str] = None
    
    # Merchant matching
    merchant_name: Optional[str] = None
    merchant_id: Optional[str] = None
    
    # Amount rules
    amount_min: Optional[str] = None
    amount_max: Optional[str] = None
    
    # Priority
    priority: int = 0


class CategoryMappingCreate(CategoryMappingBase):
    """Schema for creating a new category mapping."""

    is_system: bool = False


class CategoryMappingUpdate(BaseModel):
    """Schema for updating a category mapping."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category_id: Optional[UUID] = None
    contains_text: Optional[str] = None
    starts_with: Optional[str] = None
    ends_with: Optional[str] = None
    regex_pattern: Optional[str] = None
    merchant_name: Optional[str] = None
    merchant_id: Optional[str] = None
    amount_min: Optional[str] = None
    amount_max: Optional[str] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None


class CategoryMappingResponse(CategoryMappingBase):
    """Schema for category mapping response."""

    id: UUID
    user_id: UUID
    is_system: bool
    is_active: bool
    match_count: int = 0
    last_matched_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CategoryMappingListResponse(BaseModel):
    """Schema for category mapping list response."""

    mappings: list[CategoryMappingResponse]
    total: int


class CategoryMappingTest(BaseModel):
    """Schema for testing a category mapping."""

    description: str
    merchant_name: Optional[str] = None
    amount: Optional[float] = None
    mapping_id: Optional[UUID] = None


class CategoryMappingTestResult(BaseModel):
    """Schema for testing category mapping result."""

    matches: bool
    matched_mapping: Optional[CategoryMappingResponse] = None
    all_mappings_tested: list[CategoryMappingResponse] = []
