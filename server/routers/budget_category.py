import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from auth.router import get_current_user
from database import get_db
from models.budget import Budget
from models.budget_category import BudgetCategory
from models.category import Category
from models.user import User
from schemas.budget_category import (
    BudgetCategoryBulkUpsertRequest,
    BudgetCategoryListResponse,
    BudgetCategoryResponse,
)
from services.budget_allocation_validator import BudgetAllocationValidator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/budgets/{budget_id}/categories", tags=["Budget Categories"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user_dep(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    return get_current_user(token, db)


def get_budget_or_404(budget_id: UUID, user_id: UUID, db: Session) -> Budget:
    budget = (
        db.query(Budget)
        .filter(Budget.id == budget_id, Budget.user_id == user_id, Budget.is_active == True)  # noqa: E712
        .first()
    )
    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")
    return budget


@router.get("", response_model=BudgetCategoryListResponse)
def list_budget_categories(
    budget_id: UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    get_budget_or_404(budget_id, current_user.id, db)
    allocations = (
        db.query(BudgetCategory)
        .filter(BudgetCategory.budget_id == budget_id)
        .order_by(BudgetCategory.category_type.asc(), BudgetCategory.sort_order.asc(), BudgetCategory.created_at.asc())
        .all()
    )
    return BudgetCategoryListResponse(
        allocations=[BudgetCategoryResponse.model_validate(a) for a in allocations],
        total=len(allocations),
    )


@router.put("", response_model=BudgetCategoryListResponse)
def upsert_budget_categories(
    budget_id: UUID,
    payload: BudgetCategoryBulkUpsertRequest,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    budget = get_budget_or_404(budget_id, current_user.id, db)

    if not payload.allocations:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one allocation is required")

    category_ids = [a.category_id for a in payload.allocations]
    categories = (
        db.query(Category)
        .filter(Category.id.in_(category_ids), Category.user_id == current_user.id, Category.is_active == True)  # noqa: E712
        .all()
    )
    category_by_id = {c.id: c for c in categories}

    for allocation in payload.allocations:
        category = category_by_id.get(allocation.category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category {allocation.category_id} not found for user",
            )

    existing = (
        db.query(BudgetCategory)
        .filter(BudgetCategory.budget_id == budget_id)
        .all()
    )
    existing_by_category = {e.category_id: e for e in existing}

    touched_ids: set[UUID] = set()
    for allocation in payload.allocations:
        category = category_by_id[allocation.category_id]
        current = existing_by_category.get(allocation.category_id)
        if current:
            current.budgeted_amount = allocation.budgeted_amount
            current.sort_order = allocation.sort_order
            current.category_type = category.category_type
        else:
            db.add(
                BudgetCategory(
                    budget_id=budget_id,
                    category_id=allocation.category_id,
                    category_type=category.category_type,
                    budgeted_amount=allocation.budgeted_amount,
                    sort_order=allocation.sort_order,
                )
            )
        touched_ids.add(allocation.category_id)

    # Remove stale allocations omitted from payload
    for existing_row in existing:
        if existing_row.category_id not in touched_ids:
            db.delete(existing_row)

    db.flush()

    allocations = (
        db.query(BudgetCategory)
        .filter(BudgetCategory.budget_id == budget_id)
        .all()
    )
    is_valid, error = BudgetAllocationValidator.validate_budget_category_totals(budget, allocations)
    if not is_valid:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)

    db.commit()

    saved = (
        db.query(BudgetCategory)
        .filter(BudgetCategory.budget_id == budget_id)
        .order_by(BudgetCategory.category_type.asc(), BudgetCategory.sort_order.asc(), BudgetCategory.created_at.asc())
        .all()
    )

    return BudgetCategoryListResponse(
        allocations=[BudgetCategoryResponse.model_validate(a) for a in saved],
        total=len(saved),
    )
