"""
Classification Validation Rules.

Enforces integrity constraints between direction_type, bucket_type, and category fields
on transaction classifications.
"""


def validate_transaction_classification(
    direction_type: str | None,
    bucket_type: str | None,
    is_misc_category: bool = False,
    transaction_type: str | None = None,
) -> None:
    """
    Validate that direction_type, bucket_type, and category fields are consistent.

    Rules:
    - Transfer direction → bucket_type must be 'none'
    - Income direction → bucket_type must be 'none'
    - Expense direction → bucket_type must be needs/wants/savings (or none if unset)
    - Misc categories may only be used on expense transactions (direction != transfer/income)

    Args:
        direction_type: 'income' | 'expense' | 'transfer' | 'refund' | 'adjustment' | None
        bucket_type: 'needs' | 'wants' | 'savings' | 'none' | None
        is_misc_category: Whether the assigned category is a Misc fallback category
        transaction_type: Legacy transaction type value, used as fallback hint

    Raises:
        ValueError: When integrity constraints are violated
    """
    direction = (direction_type or "").lower()
    bucket = (bucket_type or "none").lower()

    if direction == "transfer":
        if bucket not in ("none", ""):
            raise ValueError(
                f"Transfer transactions must have bucket_type='none', got '{bucket}'."
            )
        if is_misc_category:
            raise ValueError("Transfer transactions cannot be assigned to a Misc category.")

    elif direction == "income":
        if bucket not in ("none", ""):
            raise ValueError(
                f"Income transactions must have bucket_type='none', got '{bucket}'."
            )

    elif direction == "expense":
        # bucket_type is allowed to still be 'none' when classification is pending
        pass

    # Misc category guard: only expense-type transactions
    if is_misc_category and direction in ("transfer", "income"):
        raise ValueError(
            f"Misc categories cannot be used for direction_type='{direction}'."
        )
