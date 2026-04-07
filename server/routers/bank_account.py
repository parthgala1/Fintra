"""
BankAccount API router.

Provides CRUD endpoints for bank accounts.
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from auth.router import get_current_user
from database import get_db
from models.bank_account import BankAccount
from models.user import User
from schemas.bank_account import (
    BankAccountCreate,
    BankAccountListResponse,
    BankAccountResponse,
    BankAccountUpdate,
)

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/bank-accounts", tags=["Bank Accounts"])

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user_dep(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    """Dependency to get current authenticated user."""
    return get_current_user(token, db)


@router.get("", response_model=BankAccountListResponse)
def list_bank_accounts(
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    List all bank accounts for the current user.
    
    Args:
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        List of bank accounts
    """
    accounts = (
        db.query(BankAccount)
        .filter(
            BankAccount.user_id == current_user.id,
            BankAccount.is_active == True,  # noqa: E712
        )
        .order_by(BankAccount.account_name)
        .all()
    )
    
    return BankAccountListResponse(
        accounts=accounts,
        total=len(accounts),
    )


@router.get("/{account_id}", response_model=BankAccountResponse)
def get_bank_account(
    account_id: UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Get a single bank account by ID.
    
    Args:
        account_id: Bank account UUID
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Bank account details
    """
    account = (
        db.query(BankAccount)
        .filter(
            BankAccount.id == account_id,
            BankAccount.user_id == current_user.id,
        )
        .first()
    )
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bank account not found",
        )
    
    return account


@router.post("", response_model=BankAccountResponse, status_code=status.HTTP_201_CREATED)
def create_bank_account(
    account_data: BankAccountCreate,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Create a new bank account.
    
    Args:
        account_data: Bank account data
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Created bank account
    """
    # Create account
    account = BankAccount(
        user_id=current_user.id,
        **account_data.model_dump(),
    )
    
    db.add(account)
    db.commit()
    db.refresh(account)
    
    logger.info(f"Created bank account {account.id} for user {current_user.id}")
    
    return account


@router.patch("/{account_id}", response_model=BankAccountResponse)
def update_bank_account(
    account_id: UUID,
    account_data: BankAccountUpdate,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Update a bank account.
    
    Args:
        account_id: Bank account UUID
        account_data: Update data
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Updated bank account
    """
    account = (
        db.query(BankAccount)
        .filter(
            BankAccount.id == account_id,
            BankAccount.user_id == current_user.id,
        )
        .first()
    )
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bank account not found",
        )
    
    # Update fields
    update_data = account_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(account, field, value)
    
    db.commit()
    db.refresh(account)
    
    logger.info(f"Updated bank account {account.id}")
    
    return account


@router.get("/{account_id}/reconciliation")
def get_reconciliation_status(
    account_id: UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Get reconciliation status and details for a bank account.
    
    Args:
        account_id: Bank account UUID
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Reconciliation status details
    """
    account = (
        db.query(BankAccount)
        .filter(
            BankAccount.id == account_id,
            BankAccount.user_id == current_user.id,
        )
        .first()
    )
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bank account not found",
        )
    
    from models.transaction import Transaction
    from datetime import datetime, timezone
    
    # Get transaction count up to statement date
    transactions_count = 0
    if account.statement_date:
        transactions_count = (
            db.query(Transaction)
            .filter(
                Transaction.bank_account_id == account_id,
                Transaction.date <= account.statement_date,
            )
            .count()
        )
    
    return {
        "account_id": account.id,
        "reconciliation_status": account.reconciliation_status,
        "statement_balance": float(account.statement_balance) if account.statement_balance else None,
        "current_balance": float(account.current_balance),
        "balance_discrepancy_amount": float(account.balance_discrepancy_amount) if account.balance_discrepancy_amount else None,
        "statement_date": account.statement_date,
        "last_reconciled_at": account.last_reconciled_at,
        "transactions_in_range": transactions_count,
        "last_statement_document_id": account.last_statement_document_id,
    }


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bank_account(
    account_id: UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Delete a bank account.
    
    Args:
        account_id: Bank account UUID
        current_user: Current authenticated user
        db: Database session
    """
    account = (
        db.query(BankAccount)
        .filter(
            BankAccount.id == account_id,
            BankAccount.user_id == current_user.id,
        )
        .first()
    )
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bank account not found",
        )
    
    # Check if any transactions use this account
    from models.transaction import Transaction
    transaction_count = (
        db.query(Transaction)
        .filter(Transaction.bank_account_id == account_id)
        .count()
    )
    
    if transaction_count > 0:
        # Instead of deleting, just mark as inactive
        account.is_active = False
        db.commit()
        logger.info(f"Marked bank account {account_id} as inactive (has {transaction_count} transactions)")
    else:
        db.delete(account)
        db.commit()
        logger.info(f"Deleted bank account {account_id}")
