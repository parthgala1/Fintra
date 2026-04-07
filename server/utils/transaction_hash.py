"""
Transaction hash utility for deduplication.

Generates a unique hash for transactions to detect duplicates.
"""

import hashlib
from datetime import datetime
from typing import Union
from uuid import UUID


def generate_hash(
    user_id: Union[UUID, str],
    date: Union[datetime, str],
    amount: Union[float, int, str],
    description: str,
) -> str:
    """
    Generate a unique hash for a transaction.
    
    Args:
        user_id: User UUID
        date: Transaction date (datetime or string)
        amount: Transaction amount
        description: Transaction description (will be normalized)
    
    Returns:
        SHA256 hash string
    """
    # Normalize inputs
    user_id_str = str(user_id)
    
    # Handle date
    if isinstance(date, datetime):
        date_str = date.strftime("%Y-%m-%d")
    else:
        date_str = str(date)
    
    # Handle amount - convert to string with 2 decimal places
    amount_float = float(amount)
    amount_str = f"{amount_float:.2f}"
    
    # Normalize description - lowercase and strip whitespace
    description_normalized = description.lower().strip()
    
    # Create hash input
    hash_input = f"{user_id_str}|{date_str}|{amount_str}|{description_normalized}"
    
    # Generate SHA256 hash
    return hashlib.sha256(hash_input.encode('utf-8')).hexdigest()


def generate_partial_hash(
    user_id: Union[UUID, str],
    date: Union[datetime, str],
    amount: Union[float, int, str],
) -> str:
    """
    Generate a partial hash for approximate matching.
    
    Uses date and amount only (not description) for loose matching.
    
    Args:
        user_id: User UUID
        date: Transaction date
        amount: Transaction amount
    
    Returns:
        SHA256 hash string
    """
    user_id_str = str(user_id)
    
    if isinstance(date, datetime):
        date_str = date.strftime("%Y-%m-%d")
    else:
        date_str = str(date)
    
    amount_float = float(amount)
    amount_str = f"{amount_float:.2f}"
    
    hash_input = f"{user_id_str}|{date_str}|{amount_str}"
    
    return hashlib.sha256(hash_input.encode('utf-8')).hexdigest()
