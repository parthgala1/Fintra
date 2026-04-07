"""
Pydantic schemas for BankAccount API.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from models.bank_account import AccountType


class BankAccountBase(BaseModel):
    """Base bank account schema with common fields."""

    account_name: str = Field(..., min_length=1, max_length=255)
    account_type: AccountType
    institution_name: Optional[str] = None
    institution_id: Optional[str] = None
    account_number_last4: Optional[str] = Field(None, max_length=4)
    routing_number: Optional[str] = Field(None, max_length=9)
    current_balance: Decimal = Field(default=Decimal("0.00"))
    available_balance: Optional[Decimal] = None
    credit_limit: Optional[Decimal] = None


class BankAccountCreate(BankAccountBase):
    """Schema for creating a new bank account."""

    pass


class BankAccountUpdate(BaseModel):
    """Schema for updating a bank account."""

    account_name: Optional[str] = Field(None, min_length=1, max_length=255)
    institution_name: Optional[str] = None
    institution_id: Optional[str] = None
    account_number_last4: Optional[str] = Field(None, max_length=4)
    routing_number: Optional[str] = Field(None, max_length=9)
    current_balance: Optional[Decimal] = None
    available_balance: Optional[Decimal] = None
    credit_limit: Optional[Decimal] = None
    is_active: Optional[bool] = None
    is_connected: Optional[bool] = None


class BankAccountResponse(BankAccountBase):
    """Schema for bank account response."""

    id: UUID
    user_id: UUID
    is_active: bool
    is_connected: bool
    last_synced_at: Optional[datetime] = None
    
    # Reconciliation fields
    statement_balance: Optional[Decimal] = None
    statement_date: Optional[datetime] = None
    last_reconciled_at: Optional[datetime] = None
    reconciliation_status: Optional[str] = None
    balance_discrepancy_amount: Optional[Decimal] = None
    last_statement_document_id: Optional[str] = None
    
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class BankAccountListResponse(BaseModel):
    """Schema for bank account list response."""

    accounts: list[BankAccountResponse]
    total: int
