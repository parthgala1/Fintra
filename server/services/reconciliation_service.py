"""
Reconciliation service for bank account balance reconciliation.

Handles reconciliation logic to compare extracted balance from statements
with calculated balance from imported transactions.
"""

import logging
from typing import Any, Dict, Optional, Tuple
from decimal import Decimal
from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session
from models.transaction import Transaction, TransactionStatus
from models.bank_account import BankAccount

logger = logging.getLogger(__name__)

# Reconciliation threshold: 1% or minimum $1
DISCREPANCY_PERCENTAGE_THRESHOLD = 0.01  # 1%
DISCREPANCY_AMOUNT_THRESHOLD = Decimal("1.00")  # Minimum $1


def reconcile_account_balance(
    db: Session,
    bank_account_id: UUID,
    extracted_balance: Decimal,
    statement_date: datetime,
    transactions_range: Optional[Tuple[datetime, datetime]] = None,
) -> Dict[str, Any]:
    """
    Reconcile extracted balance with transaction sum.
    
    Args:
        db: Database session
        bank_account_id: ID of the bank account
        extracted_balance: Balance extracted from statement
        statement_date: Date of the statement
        transactions_range: Optional tuple of (start_date, end_date) to limit transactions
    
    Returns:
        Dictionary with reconciliation results:
        {
            "status": "reconciled|discrepancy",
            "extracted_balance": Decimal,
            "calculated_balance": Decimal,
            "opening_balance": Optional[Decimal],
            "discrepancy_amount": Decimal,
            "discrepancy_percentage": float,
            "transactions_in_range": int,
            "reconciliation_details": str,
            "is_reconciled": bool,
        }
    """
    logger.info(f"Starting reconciliation for account {bank_account_id}")
    logger.info(f"Extracted balance: {extracted_balance}, Statement date: {statement_date}")
    
    try:
        # Get the bank account
        bank_account = db.query(BankAccount).filter(BankAccount.id == bank_account_id).first()
        if not bank_account:
            logger.error(f"Bank account {bank_account_id} not found")
            return {
                "status": "error",
                "error": "Bank account not found",
            }
        
        # Determine opening balance
        opening_balance = bank_account.current_balance
        logger.info(f"Opening balance: {opening_balance}")
        
        # Calculate balance from transactions
        calculated_balance = calculate_running_balance(
            db=db,
            bank_account_id=bank_account_id,
            opening_balance=opening_balance,
            up_to_date=statement_date,
            transactions_range=transactions_range,
        )
        
        logger.info(f"Calculated balance: {calculated_balance}")
        
        # Calculate discrepancy
        discrepancy_amount = abs(extracted_balance - calculated_balance)
        discrepancy_percentage = 0.0
        
        if calculated_balance != 0:
            discrepancy_percentage = float(discrepancy_amount / abs(calculated_balance))
        
        # Determine reconciliation status
        has_discrepancy = detect_balance_discrepancies(
            extracted_balance,
            calculated_balance,
            threshold_percentage=DISCREPANCY_PERCENTAGE_THRESHOLD,
        )
        
        # Get transaction count
        query = db.query(Transaction).filter(
            Transaction.bank_account_id == bank_account_id,
            Transaction.date <= statement_date,
        )
        
        if transactions_range:
            start_date, end_date = transactions_range
            query = query.filter(
                Transaction.date >= start_date,
                Transaction.date <= end_date,
            )
        
        transactions_in_range = query.count()
        
        reconciliation_status_value = "discrepancy" if has_discrepancy else "reconciled"
        
        result = {
            "status": reconciliation_status_value,
            "extracted_balance": float(extracted_balance),
            "calculated_balance": float(calculated_balance),
            "opening_balance": float(opening_balance),
            "discrepancy_amount": float(discrepancy_amount),
            "discrepancy_percentage": discrepancy_percentage * 100,  # As percentage
            "transactions_in_range": transactions_in_range,
            "reconciliation_details": f"Extracted: {extracted_balance}, Calculated: {calculated_balance}, Difference: {discrepancy_amount}",
            "is_reconciled": reconciliation_status_value == "reconciled",
        }
        
        logger.info(f"Reconciliation completed: {result['status']}, Discrepancy: {discrepancy_amount} ({result['discrepancy_percentage']:.2f}%)")
        
        return validate_reconciliation(result)
    
    except Exception as e:
        logger.error(f"Error during reconciliation: {e}")
        return {
            "status": "error",
            "error": str(e),
        }


def calculate_running_balance(
    db: Session,
    bank_account_id: UUID,
    opening_balance: Decimal,
    up_to_date: datetime,
    transactions_range: Optional[Tuple[datetime, datetime]] = None,
) -> Decimal:
    """
    Calculate balance by summing transactions up to a date.
    
    Args:
        db: Database session
        bank_account_id: ID of the bank account
        opening_balance: Starting balance
        up_to_date: Calculate balance up to this date
        transactions_range: Optional (start_date, end_date) range
    
    Returns:
        Calculated balance as Decimal
    """
    logger.info(f"Calculating running balance for account {bank_account_id} up to {up_to_date}")
    
    try:
        # Query all transactions for this account up to the date
        query = db.query(Transaction).filter(
            Transaction.bank_account_id == bank_account_id,
            Transaction.date <= up_to_date,
        )
        
        # Apply date range filter if provided
        if transactions_range:
            start_date, end_date = transactions_range
            query = query.filter(
                Transaction.date >= start_date,
                Transaction.date <= end_date,
            )
        
        transactions = query.all()
        
        # Sum all amounts (including debits as negative)
        total_amount = Decimal("0")
        for txn in transactions:
            # Assuming amount is positive for credits, negative for debits
            # Adjust this logic based on your transaction model
            amount = Decimal(str(txn.amount))
            total_amount += amount
        
        calculated_balance = opening_balance + total_amount
        logger.info(f"Calculated balance: opening {opening_balance} + transactions {total_amount} = {calculated_balance}")
        
        return calculated_balance
    
    except Exception as e:
        logger.error(f"Error calculating running balance: {e}")
        return opening_balance


def detect_balance_discrepancies(
    extracted_balance: Decimal,
    calculated_balance: Decimal,
    threshold_percentage: float = 0.01,  # 1%
) -> bool:
    """
    Check if discrepancy exceeds threshold.
    
    Args:
        extracted_balance: Balance from statement
        calculated_balance: Calculated balance from transactions
        threshold_percentage: Threshold as decimal (0.01 = 1%)
    
    Returns:
        True if discrepancy exceeds threshold, False otherwise
    """
    discrepancy = abs(extracted_balance - calculated_balance)
    
    # Check against percentage threshold
    if calculated_balance != 0:
        percentage_diff = float(discrepancy / abs(calculated_balance))
        if percentage_diff >= threshold_percentage:
            logger.warning(f"Discrepancy detected: {percentage_diff * 100:.2f}% exceeds threshold {threshold_percentage * 100:.2f}%")
            return True
    
    # Check against amount threshold
    if discrepancy >= DISCREPANCY_AMOUNT_THRESHOLD:
        logger.warning(f"Discrepancy amount {discrepancy} exceeds minimum threshold {DISCREPANCY_AMOUNT_THRESHOLD}")
        return True
    
    logger.info(f"No significant discrepancy detected: {discrepancy}")
    return False


def validate_reconciliation(reconciliation_result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate reconciliation result and return detailed info.
    
    Args:
        reconciliation_result: Result from reconcile_account_balance
    
    Returns:
        Validated reconciliation result
    """
    logger.info("Validating reconciliation result")
    
    # Check for required fields
    required_fields = [
        "status",
        "extracted_balance",
        "calculated_balance",
        "discrepancy_amount",
        "is_reconciled",
    ]
    
    for field in required_fields:
        if field not in reconciliation_result:
            logger.warning(f"Missing required field in reconciliation result: {field}")
    
    # Add timestamp
    reconciliation_result["validated_at"] = datetime.now().isoformat()
    
    # Validate numeric values
    try:
        extracted = float(reconciliation_result.get("extracted_balance", 0))
        calculated = float(reconciliation_result.get("calculated_balance", 0))
        discrepancy = float(reconciliation_result.get("discrepancy_amount", 0))
        
        logger.info(f"Reconciliation validated: extracted={extracted}, calculated={calculated}, discrepancy={discrepancy}")
    except (ValueError, TypeError) as e:
        logger.error(f"Error validating numeric values: {e}")
    
    return reconciliation_result


def mark_transactions_as_reconciled(
    db: Session,
    bank_account_id: UUID,
    up_to_date: datetime,
) -> int:
    """
    Mark all transactions for an account as reconciled (optional feature).
    
    Args:
        db: Database session
        bank_account_id: ID of the bank account
        up_to_date: Mark transactions up to this date as reconciled
    
    Returns:
        Number of transactions marked as reconciled
    """
    logger.info(f"Marking transactions as reconciled for account {bank_account_id} up to {up_to_date}")
    
    try:
        count = db.query(Transaction).filter(
            Transaction.bank_account_id == bank_account_id,
            Transaction.date <= up_to_date,
        ).update({Transaction.status: TransactionStatus.RECONCILED})
        
        db.commit()
        logger.info(f"Marked {count} transactions as reconciled")
        return count
    
    except Exception as e:
        logger.error(f"Error marking transactions as reconciled: {e}")
        db.rollback()
        return 0
