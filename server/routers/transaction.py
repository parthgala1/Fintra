"""
Transaction API router.

Provides CRUD endpoints for transactions.
"""

import logging
from calendar import monthrange
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session, joinedload, contains_eager
from sqlalchemy import cast, String

from auth.jwt import verify_token
from auth.router import get_current_user
from database import get_db
from models.transaction import Transaction
from models.user import User
from models.transaction import TransactionType
from models.budget import Budget, BudgetPeriod
from models.category import Category
from schemas.transaction import (
    BulkCategoryUpdate,
    TransactionCreate,
    TransactionListResponse,
    TransactionResponse,
    TransactionUpdate,
)
from services.budget_report_recalculation_service import BudgetReportRecalculationService

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/transactions", tags=["Transactions"])

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user_dep(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    """Dependency to get current authenticated user."""
    return get_current_user(token, db)


def _resolve_period_bounds_for_date(
    period: BudgetPeriod,
    reference_date: datetime,
) -> tuple[datetime, datetime]:
    ref = reference_date
    if period == BudgetPeriod.WEEKLY:
        start = (ref - timedelta(days=ref.weekday())).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        end = start + timedelta(days=6, hours=23, minutes=59, seconds=59)
    elif period == BudgetPeriod.BIWEEKLY:
        day = ref.day
        biweek = (day - 1) // 14
        start = ref.replace(day=biweek * 14 + 1, hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=13, hours=23, minutes=59, seconds=59)
    elif period == BudgetPeriod.YEARLY:
        start = ref.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        end = ref.replace(month=12, day=31, hour=23, minute=59, second=59, microsecond=999999)
    else:
        start = ref.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        _, last_day = monthrange(ref.year, ref.month)
        end = ref.replace(day=last_day, hour=23, minute=59, second=59, microsecond=999999)
    return start, end


def _recalculate_impacted_budgets(
    db: Session,
    user_id: UUID,
    dates: list[datetime],
) -> None:
    if not dates:
        return

    budgets = (
        db.query(Budget)
        .filter(Budget.user_id == user_id, Budget.is_active == True)  # noqa: E712
        .all()
    )

    impacted: list[tuple[Budget, datetime]] = []
    for budget in budgets:
        for tx_date in dates:
            if tx_date >= budget.start_date and (
                budget.end_date is None or tx_date <= budget.end_date
            ):
                impacted.append((budget, tx_date))

    # fallback to default budget if date-range matched none
    if not impacted:
        default_budget = next((b for b in budgets if b.is_default), None)
        if default_budget:
            impacted = [(default_budget, d) for d in dates]

    seen = set()
    for budget, tx_date in impacted:
        period_start, period_end = _resolve_period_bounds_for_date(budget.period, tx_date)
        key = (budget.id, period_start, period_end)
        if key in seen:
            continue
        seen.add(key)
        BudgetReportRecalculationService.recalculate(
            db=db,
            user_id=user_id,
            budget_id=budget.id,
            period_start=period_start,
            period_end=period_end,
        )


@router.get("", response_model=TransactionListResponse)
def list_transactions(
    page: int = 1,
    page_size: int = 50,
    bank_account_id: Optional[UUID] = None,
    category_id: Optional[UUID] = None,
    category_type: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    type: Optional[str] = None,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    List transactions with optional filtering.
    
    Args:
        page: Page number (1-indexed)
        page_size: Number of items per page
        bank_account_id: Filter by bank account
        category_id: Filter by category
        category_type: Filter by category type (needs, wants, savings, transfer)
        search: Search in description
        start_date: Filter by start date (ISO format)
        end_date: Filter by end date (ISO format)
        type: Filter by transaction type (income, expense, transfer)
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Paginated list of transactions
    """
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    
    # Track if we need to join with Category
    needs_category_join = category_type is not None
    
    # Apply filters
    if bank_account_id:
        query = query.filter(Transaction.bank_account_id == bank_account_id)
    
    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    
    if category_type:
        # Join with Category table and filter by category_type
        # The database stores enum values as uppercase, so we need to match that
        cat_type_upper = category_type.upper()
        query = query.join(Category, Transaction.category_id == Category.id).filter(
            cast(Category.category_type, String) == cat_type_upper
        )
    
    if search:
        query = query.filter(Transaction.description.ilike(f"%{search}%"))
    
    if start_date:
        query = query.filter(Transaction.transaction_date >= start_date)
    
    if end_date:
        query = query.filter(Transaction.transaction_date <= end_date)
    
    if type and type != "all":
        # Convert string to TransactionType enum
        try:
            transaction_type = TransactionType(type.lower())
            query = query.filter(Transaction.transaction_type == transaction_type)
        except ValueError:
            # Invalid type value, ignore filter
            pass
    
    # Order by date descending
    query = query.order_by(Transaction.transaction_date.desc())
    
    # Get total count
    total = query.count()
    
    # Apply pagination and eager loading
    offset = (page - 1) * page_size
    
    # Use contains_eager if we joined Category, otherwise use joinedload
    if needs_category_join:
        transactions = (
            query
            .options(contains_eager(Transaction.category), joinedload(Transaction.bank_account))
            .offset(offset)
            .limit(page_size)
            .all()
        )
    else:
        transactions = (
            query
            .options(joinedload(Transaction.category), joinedload(Transaction.bank_account))
            .offset(offset)
            .limit(page_size)
            .all()
        )
    
    return TransactionListResponse(
        transactions=transactions,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(
    transaction_id: UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Get a single transaction by ID.
    
    Args:
        transaction_id: Transaction UUID
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Transaction details
    """
    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id,
        )
        .first()
    )
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )
    
    return transaction


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    transaction_data: TransactionCreate,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Create a new manual transaction.
    
    Args:
        transaction_data: Transaction data
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Created transaction
    """
    # If bank_account_id not provided, check if user has any account
    if not transaction_data.bank_account_id:
        from models.bank_account import BankAccount
        default_account = (
            db.query(BankAccount)
            .filter(
                BankAccount.user_id == current_user.id,
                BankAccount.is_active == True,  # noqa: E712
            )
            .first()
        )
        if default_account:
            transaction_data.bank_account_id = default_account.id
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No bank account found. Please create a bank account first.",
            )
    
    # Create transaction
    transaction = Transaction(
        user_id=current_user.id,
        **transaction_data.model_dump(),
    )
    
    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    _recalculate_impacted_budgets(db, current_user.id, [transaction.transaction_date])
    
    logger.info(f"Created transaction {transaction.id} for user {current_user.id}")
    
    return transaction


@router.patch("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: UUID,
    transaction_data: TransactionUpdate,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Update a transaction.
    
    When a user manually changes the category of a transaction, the system
    automatically learns from this correction and creates a rule to improve
    future classifications.
    
    Args:
        transaction_id: Transaction UUID
        transaction_data: Update data
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Updated transaction
    """
    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id,
        )
        .first()
    )
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )
    
    # Capture old category_id before updating (for learning)
    old_category_id = transaction.category_id
    old_transaction_date = transaction.transaction_date
    
    # Update fields
    update_data = transaction_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(transaction, field, value)
    
    db.commit()
    db.refresh(transaction)

    dates_to_recalculate = [transaction.transaction_date]
    if old_transaction_date and old_transaction_date != transaction.transaction_date:
        dates_to_recalculate.append(old_transaction_date)
    _recalculate_impacted_budgets(db, current_user.id, dates_to_recalculate)
    
    # Learn from manual category corrections
    if "category_id" in update_data and update_data["category_id"] != old_category_id:
        from services.classification_engine import create_user_correction_rule
        
        try:
            # Create a rule so future similar transactions are auto-categorized correctly
            rule_id = create_user_correction_rule(
                db=db,
                user_id=current_user.id,
                category_id=transaction.category_id,
                description=transaction.description,
                merchant_name=transaction.merchant_name,
                amount=transaction.amount,
                old_category_id=old_category_id,
            )
            
            if rule_id:
                logger.info(
                    f"✓ Learned from user correction: Transaction {transaction_id} updated "
                    f"to category {transaction.category_id}, rule created: {rule_id}"
                )
            else:
                logger.debug(f"No rule created for correction (merchant too generic?)")
                
        except Exception as e:
            logger.error(f"Error learning from category correction: {e}", exc_info=True)
            # Don't fail the update if learning fails
    
    logger.info(f"Updated transaction {transaction.id}")
    
    return transaction


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Delete a transaction.
    
    Args:
        transaction_id: Transaction UUID
        current_user: Current authenticated user
        db: Database session
    """
    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id,
        )
        .first()
    )
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )
    
    transaction_date = transaction.transaction_date
    db.delete(transaction)
    db.commit()

    _recalculate_impacted_budgets(db, current_user.id, [transaction_date])
    
    logger.info(f"Deleted transaction {transaction_id}")


@router.post("/bulk-update", status_code=status.HTTP_200_OK)
def bulk_update_categories(
    bulk_data: BulkCategoryUpdate,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Bulk update transaction categories.
    
    When a user bulk-updates categories, the system learns from these corrections
    and creates rules for similar transactions in the future.
    
    Args:
        bulk_data: Transaction IDs and new category ID
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Number of updated transactions and learning results
    """
    from services.classification_engine import create_user_correction_rule
    
    # Get transactions before updating (to capture old categories)
    transactions_to_update = (
        db.query(Transaction)
        .filter(
            Transaction.id.in_(bulk_data.transaction_ids),
            Transaction.user_id == current_user.id,
        )
        .all()
    )
    
    # Track learning results
    rules_created = 0
    rules_skipped = 0
    
    # Learn from each correction
    for transaction in transactions_to_update:
        if transaction.category_id != bulk_data.category_id:
            try:
                rule_id = create_user_correction_rule(
                    db=db,
                    user_id=current_user.id,
                    category_id=bulk_data.category_id,
                    description=transaction.description,
                    merchant_name=transaction.merchant_name,
                    amount=transaction.amount,
                    old_category_id=transaction.category_id,
                )
                
                if rule_id:
                    rules_created += 1
                else:
                    rules_skipped += 1
                    
            except Exception as e:
                logger.error(f"Error learning from bulk correction: {e}", exc_info=True)
                rules_skipped += 1
    
    # Update transactions
    updated_count = (
        db.query(Transaction)
        .filter(
            Transaction.id.in_(bulk_data.transaction_ids),
            Transaction.user_id == current_user.id,
        )
        .update(
            {Transaction.category_id: bulk_data.category_id},
            synchronize_session=False,
        )
    )
    
    db.commit()

    recalc_dates = [t.transaction_date for t in transactions_to_update if t.transaction_date]
    _recalculate_impacted_budgets(db, current_user.id, recalc_dates)
    
    logger.info(
        f"✓ Bulk updated {updated_count} transactions for user {current_user.id}. "
        f"Learning: {rules_created} rules created, {rules_skipped} skipped"
    )
    
    return {
        "updated_count": updated_count,
        "learning": {
            "rules_created": rules_created,
            "rules_skipped": rules_skipped,
        }
    }
