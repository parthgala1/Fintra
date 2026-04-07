"""
Pydantic schemas for Category API.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from models.category import CategoryType


class CategoryBase(BaseModel):
    """Base category schema with common fields."""

    name: str = Field(..., min_length=1, max_length=100)
    category_type: CategoryType
    icon: Optional[str] = None
    color: Optional[str] = Field(None, max_length=20)
    description: Optional[str] = None


class CategoryCreate(CategoryBase):
    """Schema for creating a new category."""

    is_system: bool = False


class CategoryUpdate(BaseModel):
    """Schema for updating a category."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    icon: Optional[str] = None
    color: Optional[str] = Field(None, max_length=20)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class CategoryResponse(CategoryBase):
    """Schema for category response."""

    id: UUID
    user_id: UUID
    is_system: bool
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CategoryListResponse(BaseModel):
    """Schema for category list response."""

    categories: list[CategoryResponse]
    total: int
