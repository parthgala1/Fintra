"""
Transaction API router.

Provides CRUD endpoints for transactions.
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session, joinedload

from auth.jwt import verify_token
from auth.router import get_current_user
from database import get_db
from models.transaction import Transaction
from models.user import User
from models.transaction import TransactionType
from schemas.transaction import (
    BulkCategoryUpdate,
    TransactionCreate,
    TransactionListResponse,
    TransactionResponse,
    TransactionUpdate,
)

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


@router.get("", response_model=TransactionListResponse)
def list_transactions(
    page: int = 1,
    page_size: int = 50,
    bank_account_id: Optional[UUID] = None,
    category_id: Optional[UUID] = None,
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
    
    # Apply filters
    if bank_account_id:
        query = query.filter(Transaction.bank_account_id == bank_account_id)
    
    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    
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
    
    # Apply pagination
    offset = (page - 1) * page_size
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
    
    # Update fields
    update_data = transaction_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(transaction, field, value)
    
    db.commit()
    db.refresh(transaction)
    
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
    
    db.delete(transaction)
    db.commit()
    
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
