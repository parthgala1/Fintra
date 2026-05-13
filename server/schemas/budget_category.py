from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_serializer

from models.category import CategoryType


class BudgetCategoryAllocationItem(BaseModel):
    category_id: UUID
    budgeted_amount: Decimal = Field(..., ge=0)
    sort_order: int = 0

    @field_serializer("budgeted_amount")
    def serialize_budgeted_amount(self, value: Decimal) -> float:
        return float(value)


class BudgetCategoryResponse(BaseModel):
    id: UUID
    budget_id: UUID
    category_id: UUID
    category_type: CategoryType
    budgeted_amount: Decimal
    sort_order: int
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("budgeted_amount")
    def serialize_budgeted_amount(self, value: Decimal) -> float:
        return float(value)


class BudgetCategoryListResponse(BaseModel):
    allocations: list[BudgetCategoryResponse]
    total: int


class BudgetCategoryBulkUpsertRequest(BaseModel):
    allocations: list[BudgetCategoryAllocationItem]
