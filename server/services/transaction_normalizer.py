"""
Transaction normalizer service for normalizing raw transaction data.

Converts raw data from bank statements into a standardized format.
"""

import logging
import re
from datetime import datetime
from typing import Any, Dict, Optional, Union
from uuid import UUID

from models.transaction import TransactionType

logger = logging.getLogger(__name__)

# Common merchant name patterns to extract
MERCHANT_PATTERNS = [
    # UPI transactions
    (r"^([a-zA-Z0-9]+)@([a-zA-Z]+)$", 1),  # UPI ID -> merchant
    # Card transactions
    (r"^(?:card|card\s*\.?)\s*(\d{4})\s+(.+)$", 2),  # Card XXXX Description
    # POS transactions
    (r"^pos\s+(.+)$", 1),  # POS Merchant
    # ATM transactions
    (r"^atm\s+(.+)$", 1),  # ATM Merchant
    # IMPS/NEFT/RTGS
    (r"^(?:imps|neft|rtgs|upi)\s*[-:]\s*(.+)$", 1),
    # Standard merchant format
    (r"^([A-Z][A-Za-z\s&]+?)(?:\s+(?:card|upi|pos|atm))?$", 1),
]

# Keywords for transaction type detection
INCOME_KEYWORDS = [
    "salary", "income", "deposit", "credit", "refund", "return",
    "interest", "dividend", "dividend", "commission", "bonus",
    "transfer in", "received", "payment received", "credit note",
]

TRANSFER_KEYWORDS = [
    "transfer", "send money", "receive money", "imps", "neft",
    "rtgs", "upi transfer", "bank transfer", "internal transfer",
    "self transfer", "own account",
]


def normalize_transaction(raw_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize a raw transaction dictionary into a standard format.
    
    Args:
        raw_data: Raw transaction data from file parser
    
    Returns:
        Normalized transaction dictionary
    """
    logger.debug(f"Normalizing transaction: {raw_data}")
    
    # Extract and normalize date
    transaction_date = normalize_date(raw_data.get("date"))
    
    # Extract description
    description = clean_description(raw_data.get("description", ""))
    
    # Extract merchant name
    merchant_name = extract_merchant_name(description)
    
    # Get amount
    amount = raw_data.get("amount")
    if amount is None:
        raise ValueError("Amount is required")
    
    # Determine transaction type
    transaction_type = determine_transaction_type(amount, description)
    
    # Normalize amount (ensure negative for expenses)
    if transaction_type == TransactionType.EXPENSE:
        amount = abs(float(amount))
    elif transaction_type == TransactionType.INCOME:
        amount = abs(float(amount))
    else:  # Transfer
        amount = float(amount)
    
    # Build normalized transaction
    normalized = {
        "transaction_date": transaction_date,
        "original_description": raw_data.get("description", description),
        "description": description,
        "merchant_name": merchant_name,
        "amount": amount,
        "transaction_type": transaction_type,
        "currency": raw_data.get("currency", "INR"),
        "balance": raw_data.get("balance"),  # Optional
        "raw_data": raw_data,  # Keep original for debugging
    }
    
    # Add optional fields
    if "external_transaction_id" in raw_data:
        normalized["external_transaction_id"] = raw_data["external_transaction_id"]
    
    if "posted_date" in raw_data:
        normalized["posted_date"] = normalize_date(raw_data["posted_date"])
    
    return normalized


def extract_merchant_name(description: str) -> Optional[str]:
    """
    Extract merchant name from transaction description.
    
    Args:
        description: Transaction description
    
    Returns:
        Extracted merchant name or None
    """
    if not description:
        return None
    
    description = description.strip()
    
    # Try each pattern
    for pattern, group_num in MERCHANT_PATTERNS:
        match = re.match(pattern, description, re.IGNORECASE)
        if match and group_num <= len(match.groups()):
            merchant = match.group(group_num).strip()
            if merchant and len(merchant) > 1:
                return merchant.title()
    
    # Default: use first few words as merchant name
    words = description.split()
    if words:
        # Filter out common transaction words
        filtered = [
            w for w in words
            if w.lower() not in ["upi", "imps", "neft", "rtgs", "card", "pos", "atm"]
        ]
        if filtered:
            return filtered[0].title()
    
    return None


def clean_description(description: str) -> str:
    """
    Clean and normalize transaction description.
    
    Args:
        description: Raw description
    
    Returns:
        Cleaned description
    """
    if not description:
        return ""
    
    # Strip whitespace
    description = description.strip()
    
    # Remove multiple spaces
    description = re.sub(r"\s+", " ", description)
    
    # Remove special characters at the beginning/end
    description = description.strip(".,-:;")
    
    # Normalize UPI transaction format
    # e.g., "PAYTM MERCHANT@paytm" -> "PAYTM MERCHANT"
    description = re.sub(r"^([A-Z]+)\s*[-:]\s*", r"\1 ", description)
    
    # Remove card number references
    description = re.sub(r"card\s*\.?\s*\d{4}", "", description, flags=re.IGNORECASE)
    
    # Remove multiple spaces again
    description = re.sub(r"\s+", " ", description)
    
    return description.strip()


def normalize_date(date_value: Union[str, datetime, Any]) -> Optional[datetime]:
    """
    Normalize date from various formats.
    
    Args:
        date_value: Date in any format
    
    Returns:
        Normalized datetime object or None
    """
    if date_value is None:
        return None
    
    # If already datetime
    if isinstance(date_value, datetime):
        return date_value
    
    # If it's a pandas timestamp
    if hasattr(date_value, "to_pydatetime"):
        return date_value.to_pydatetime()
    
    # If it's a date object
    if hasattr(date_value, "date"):
        dt = datetime.combine(date_value.date(), datetime.min.time())
        return dt
    
    # Try to parse as string
    from utils.date_parser import parse_date
    
    return parse_date(str(date_value))


def determine_transaction_type(amount: float, description: str) -> TransactionType:
    """
    Determine transaction type based on amount and description.
    
    Args:
        amount: Transaction amount (negative for withdrawals/expenses, positive for deposits/income)
        description: Transaction description
    
    Returns:
        TransactionType enum value
    """
    description_lower = description.lower()
    
    # Check for transfer keywords
    for keyword in TRANSFER_KEYWORDS:
        if keyword in description_lower:
            return TransactionType.TRANSFER
    
    # Check for income keywords
    for keyword in INCOME_KEYWORDS:
        if keyword in description_lower:
            return TransactionType.INCOME
    
    # Check amount sign:
    # Positive amount = deposit/income (in most bank statement formats)
    # Negative amount = withdrawal/expense
    if amount > 0:
        return TransactionType.INCOME
    elif amount < 0:
        return TransactionType.EXPENSE
    
    # If description contains typical expense keywords
    expense_indicators = [
        "purchase", "payment", "buy", "shop", "store", "restaurant",
        "food", "travel", "bill", "fee", "charge", "subscription",
    ]
    
    for indicator in expense_indicators:
        if indicator in description_lower:
            return TransactionType.EXPENSE
    
    # Default to income for positive amounts and expense otherwise
    # This should rarely be reached due to the amount check above
    return TransactionType.EXPENSE


def generate_transaction_hash(
    user_id: Union[UUID, str],
    transaction_data: Dict[str, Any],
) -> str:
    """
    Generate a unique hash for a transaction for deduplication.
    
    Args:
        user_id: User UUID
        transaction_data: Normalized transaction data
    
    Returns:
        Transaction hash string
    """
    from utils.transaction_hash import generate_hash
    
    return generate_hash(
        user_id=user_id,
        date=transaction_data.get("transaction_date"),
        amount=transaction_data.get("amount"),
        description=transaction_data.get("description", ""),
    )
