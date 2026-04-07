"""
Budget Generation Schemas.

Pydantic models for budget auto-generation API responses.
"""

from datetime import datetime
from decimal import Decimal
from typing import List

from pydantic import BaseModel, ConfigDict, Field


class CategoryBreakdownItem(BaseModel):
    """Individual category breakdown in budget generation."""
    
    category_id: str = Field(..., description="Category UUID")
    category_name: str = Field(..., description="Category name")
    category_type: str = Field(..., description="Category type (needs/wants/savings)")
    total: Decimal = Field(..., description="Total spending in this category")
    transaction_count: int = Field(..., description="Number of transactions")

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={Decimal: str}
    )


class BudgetGenerateResponse(BaseModel):
    """Response model for budget auto-generation endpoint."""
    
    period_start: datetime = Field(..., description="Start date of analysis period")
    period_end: datetime = Field(..., description="End date of analysis period")
    total_income: Decimal = Field(..., description="Total income in period")
    needs_total: Decimal = Field(..., description="Total needs spending")
    wants_total: Decimal = Field(..., description="Total wants spending")
    savings_total: Decimal = Field(..., description="Total savings/investments")
    total_expenses: Decimal = Field(..., description="Total expenses (needs+wants+savings)")
    needs_percentage: Decimal = Field(..., description="Needs as percentage of income")
    wants_percentage: Decimal = Field(..., description="Wants as percentage of income")
    savings_percentage: Decimal = Field(..., description="Savings as percentage of income")
    transaction_count: int = Field(..., description="Total number of transactions analyzed")
    category_breakdown: List[CategoryBreakdownItem] = Field(
        ..., description="Per-category spending breakdown"
    )
    data_quality: str = Field(
        ..., 
        description="Data quality assessment (high/moderate/low/insufficient)"
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={Decimal: str},
        json_schema_extra={
            "example": {
                "period_start": "2026-01-01T00:00:00Z",
                "period_end": "2026-03-31T23:59:59Z",
                "total_income": "150000.00",
                "needs_total": "75000.00",
                "wants_total": "45000.00",
                "savings_total": "30000.00",
                "total_expenses": "150000.00",
                "needs_percentage": "50.00",
                "wants_percentage": "30.00",
                "savings_percentage": "20.00",
                "transaction_count": 125,
                "category_breakdown": [
                    {
                        "category_id": "550e8400-e29b-41d4-a716-446655440000",
                        "category_name": "Rent",
                        "category_type": "needs",
                        "total": "35000.00",
                        "transaction_count": 3
                    }
                ],
                "data_quality": "high"
            }
        }
    )
