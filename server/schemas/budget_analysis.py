"""
Budget Analysis Schemas.

Pydantic models for budget analysis API requests and responses.
"""

from datetime import date
from decimal import Decimal
from typing import Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


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


class BudgetHistoryAnalysisResponse(BaseModel):
    """Response for getting budget's historical analysis."""
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
