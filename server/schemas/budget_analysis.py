"""
Budget Analysis Schemas.

Pydantic models for budget analysis API requests and responses.
"""

from datetime import date
from decimal import Decimal
from typing import Dict, List, Literal, Optional
from uuid import UUID
from pydantic import BaseModel, Field, model_validator


class CategoryItem(BaseModel):
    """Single category breakdown item."""
    amount: Decimal = Field(..., decimal_places=2)
    percentage: Decimal = Field(..., decimal_places=2)
    icon: Optional[str] = None
    color: Optional[str] = None
    transaction_count: int = 0


class AnalysisCategoryBreakdown(BaseModel):
    """Category breakdown organized by type."""
    Needs: Dict[str, CategoryItem] = Field(default_factory=dict)
    Wants: Dict[str, CategoryItem] = Field(default_factory=dict)
    Savings: Dict[str, CategoryItem] = Field(default_factory=dict)


class BudgetAnalysisRequest(BaseModel):
    """Request to analyze spending for a budget."""
    name: str = Field(..., min_length=1, max_length=255)
    budget_start_date: date = Field(..., description="Date when budget starts (analysis goes to day before)")
    income: Optional[Decimal] = Field(None, ge=0)


class BudgetAnalysisResponse(BaseModel):
    """Response with historical spending analysis."""
    analysis_id: UUID
    budget_name: str
    analysis_start_date: date
    analysis_end_date: date
    total_spending: Decimal = Field(..., decimal_places=2)
    needs_total: Decimal = Field(..., decimal_places=2)
    wants_total: Decimal = Field(..., decimal_places=2)
    savings_total: Decimal = Field(..., decimal_places=2)
    needs_percentage: Decimal = Field(..., decimal_places=2)
    wants_percentage: Decimal = Field(..., decimal_places=2)
    savings_percentage: Decimal = Field(..., decimal_places=2)
    category_breakdown: AnalysisCategoryBreakdown
    total_transactions: int
    data_quality: str = Field(..., description="low|moderate|high|insufficient")
    validation_warnings: List[str] = Field(default_factory=list)


class BudgetCreateWithAnalysisRequest(BaseModel):
    """Request to create budget with analysis confirmation."""
    name: str = Field(..., min_length=1, max_length=255)
    budget_start_date: date
    analysis_id: UUID
    income: Optional[Decimal] = Field(None, ge=0)
    confirmed: bool = Field(True)
    rule_type: Literal["fifty_thirty_twenty", "custom", "manual_custom"] = Field(
        "custom",
        description=(
            "fifty_thirty_twenty: fixed 50/30/20 splits; "
            "custom: historical spending percentages; "
            "manual_custom: user-supplied percentages via custom_*_percentage fields"
        ),
    )
    # Only used when rule_type == "manual_custom"
    custom_needs_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    custom_wants_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    custom_savings_percentage: Optional[Decimal] = Field(None, ge=0, le=100)

    @model_validator(mode="after")
    def validate_manual_custom_fields(self):
        if self.rule_type == "manual_custom":
            fields = [
                self.custom_needs_percentage,
                self.custom_wants_percentage,
                self.custom_savings_percentage,
            ]
            if any(v is None for v in fields):
                raise ValueError(
                    "custom_needs_percentage, custom_wants_percentage, and "
                    "custom_savings_percentage are all required when rule_type is manual_custom"
                )
            total = (
                self.custom_needs_percentage
                + self.custom_wants_percentage
                + self.custom_savings_percentage
            )
            if abs(total - Decimal("100")) > Decimal("0.5"):
                raise ValueError(
                    f"Custom percentages must sum to 100, got {total}"
                )
        return self


class BudgetHistoryAnalysisResponse(BaseModel):
    """Response for getting budget's historical analysis."""
    analysis_id: UUID
    budget_id: UUID
    budget_name: str
    analysis_start_date: date
    analysis_end_date: date
    total_spending: Decimal = Field(..., decimal_places=2)
    needs_total: Decimal = Field(..., decimal_places=2)
    wants_total: Decimal = Field(..., decimal_places=2)
    savings_total: Decimal = Field(..., decimal_places=2)
    needs_percentage: Decimal = Field(..., decimal_places=2)
    wants_percentage: Decimal = Field(..., decimal_places=2)
    savings_percentage: Decimal = Field(..., decimal_places=2)
    category_breakdown: AnalysisCategoryBreakdown
    total_transactions: int
    data_quality: str
    validation_warnings: List[str] = Field(default_factory=list)


class BudgetCreateFromHistoryRequest(BaseModel):
    """Request to create a new budget from an existing historical analysis snapshot."""
    name: str = Field(..., min_length=1, max_length=255)
    budget_start_date: date
    income: Optional[Decimal] = Field(None, ge=0)
    rule_type: Literal["fifty_thirty_twenty", "custom", "manual_custom"] = Field(
        "custom",
        description=(
            "fifty_thirty_twenty: fixed 50/30/20 splits; "
            "custom: historical spending percentages; "
            "manual_custom: user-supplied percentages via custom_*_percentage fields"
        ),
    )
    custom_needs_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    custom_wants_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    custom_savings_percentage: Optional[Decimal] = Field(None, ge=0, le=100)

    @model_validator(mode="after")
    def validate_manual_custom_fields(self):
        if self.rule_type == "manual_custom":
            fields = [
                self.custom_needs_percentage,
                self.custom_wants_percentage,
                self.custom_savings_percentage,
            ]
            if any(v is None for v in fields):
                raise ValueError(
                    "custom_needs_percentage, custom_wants_percentage, and "
                    "custom_savings_percentage are all required when rule_type is manual_custom"
                )
            total = (
                self.custom_needs_percentage
                + self.custom_wants_percentage
                + self.custom_savings_percentage
            )
            if abs(total - Decimal("100")) > Decimal("0.5"):
                raise ValueError(
                    f"Custom percentages must sum to 100, got {total}"
                )
        return self
