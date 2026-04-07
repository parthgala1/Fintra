"""
Pydantic schemas for Budget Report API.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_serializer

from models.budget_category_breakdown import BudgetCategoryBreakdown


class BreakdownBase(BaseModel):
    """Base breakdown schema."""

    category_id: UUID
    category_name: str
    category_type: str
    budgeted_amount: Decimal = Field(...)
    actual_amount: Decimal = Field(..., ge=0)
    deviation: Optional[Decimal] = None
    deviation_percentage: Optional[Decimal] = None
    transaction_count: Optional[int] = None

    @field_serializer('budgeted_amount', 'actual_amount', 'deviation', 'deviation_percentage')
    def serialize_decimal_fields(self, value: Decimal) -> float:
        """Convert Decimal to float for JSON serialization.
        
        Ensures numeric fields are serialized as JSON numbers, not strings.
        This fixes the frontend NaN issue where calculations expect numbers.
        """
        if value is None:
            return None
        return float(value)


class BreakdownResponse(BreakdownBase):
    """Schema for breakdown response."""

    id: UUID
    budget_report_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BudgetReportBase(BaseModel):
    """Base budget report schema."""

    period_start: datetime
    period_end: datetime


class ReportGenerate(BudgetReportBase):
    """Schema for generating a new report."""

    pass


class BudgetReportResponse(BudgetReportBase):
    """Schema for budget report response."""

    id: UUID
    user_id: UUID
    budget_id: UUID
    total_income: Decimal
    budgeted_needs: Optional[Decimal] = None
    budgeted_wants: Optional[Decimal] = None
    budgeted_savings: Optional[Decimal] = None
    total_budgeted: Optional[Decimal] = None
    actual_needs: Optional[Decimal] = None
    actual_wants: Optional[Decimal] = None
    actual_savings: Optional[Decimal] = None
    total_spent: Optional[Decimal] = None
    needs_deviation: Optional[Decimal] = None
    wants_deviation: Optional[Decimal] = None
    savings_deviation: Optional[Decimal] = None
    needs_percentage_used: Optional[Decimal] = None
    wants_percentage_used: Optional[Decimal] = None
    savings_percentage_used: Optional[Decimal] = None
    is_over_budget: bool
    summary: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer(
        'total_income', 'budgeted_needs', 'budgeted_wants', 'budgeted_savings',
        'total_budgeted', 'actual_needs', 'actual_wants', 'actual_savings',
        'total_spent', 'needs_deviation', 'wants_deviation', 'savings_deviation',
        'needs_percentage_used', 'wants_percentage_used', 'savings_percentage_used'
    )
    def serialize_decimal_fields(self, value: Decimal) -> float:
        """Convert Decimal to float for JSON serialization.
        
        Ensures numeric fields are serialized as JSON numbers, not strings.
        This fixes the frontend NaN issue where calculations expect numbers.
        """
        if value is None:
            return None
        return float(value)


class BudgetReportWithBreakdowns(BudgetReportResponse):
    """Schema for budget report with breakdowns."""

    breakdowns: list[BreakdownResponse] = []

    model_config = ConfigDict(from_attributes=True)


class BudgetReportListResponse(BaseModel):
    """Schema for budget report list response."""

    reports: list[BudgetReportResponse]
    total: int


class DeviationSummary(BaseModel):
    """Schema for deviation summary."""

    category: str
    budgeted: Decimal
    actual: Decimal
    deviation: Decimal
    deviation_percentage: Decimal
    status: str  # under_budget, on_track, over_budget

    @field_serializer('budgeted', 'actual', 'deviation', 'deviation_percentage')
    def serialize_decimal_fields(self, value: Decimal) -> float:
        """Convert Decimal to float for JSON serialization.
        
        Ensures numeric fields are serialized as JSON numbers, not strings.
        This fixes the frontend NaN issue where calculations expect numbers.
        """
        if value is None:
            return None
        return float(value)


class ReportSummary(BaseModel):
    """Schema for report summary."""

    report_id: UUID
    period_start: datetime
    period_end: datetime
    total_budgeted: Decimal
    total_spent: Decimal
    total_deviation: Decimal
    is_over_budget: bool
    deviations: list[DeviationSummary]

    @field_serializer('total_budgeted', 'total_spent', 'total_deviation')
    def serialize_decimal_fields(self, value: Decimal) -> float:
        """Convert Decimal to float for JSON serialization.
        
        Ensures numeric fields are serialized as JSON numbers, not strings.
        This fixes the frontend NaN issue where calculations expect numbers.
        """
        if value is None:
            return None
        return float(value)
