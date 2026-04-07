"""
Pydantic schemas for Upload API.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from models.upload_history import UploadSource, UploadStatus


class UploadInitResponse(BaseModel):
    """Response schema for upload initiation."""

    upload_id: UUID
    status: UploadStatus
    message: str


class UploadStatusResponse(BaseModel):
    """Response schema for upload status check."""

    upload_id: UUID
    status: UploadStatus
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    
    # Progress info
    total_transactions: Optional[int] = None
    imported_transactions: Optional[int] = None
    skipped_transactions: Optional[int] = None
    duplicate_transactions: Optional[int] = None
    failed_transactions: Optional[int] = None
    
    # Error info
    error_message: Optional[str] = None
    error_details: Optional[str] = None
    
    # Timing
    processing_started_at: Optional[datetime] = None
    processing_completed_at: Optional[datetime] = None
    processing_duration_seconds: Optional[int] = None
    
    # Date range
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    
    # Reconciliation info
    statement_balance_extracted: Optional[float] = None
    statement_date_from_file: Optional[datetime] = None
    reconciliation_status: Optional[str] = None
    
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UploadResultResponse(BaseModel):
    """Response schema for upload result."""

    upload_id: UUID
    status: UploadStatus
    file_name: str
    file_type: str
    
    # Stats
    total_transactions: int
    imported_transactions: int
    skipped_transactions: int
    duplicate_transactions: int
    failed_transactions: int
    
    # Date range
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    
    # Processing time
    processing_duration_seconds: int
    
    # Errors
    error_message: Optional[str] = None
    
    # Reconciliation info
    statement_balance_extracted: Optional[float] = None
    statement_date_extracted: Optional[datetime] = None
    reconciliation_status: Optional[str] = None
    balance_discrepancy: Optional[float] = None


class UploadHistoryResponse(BaseModel):
    """Response schema for upload history."""

    id: UUID
    user_id: UUID
    bank_account_id: Optional[UUID] = None
    source: UploadSource
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    status: UploadStatus
    total_transactions: Optional[int] = None
    imported_transactions: Optional[int] = None
    skipped_transactions: Optional[int] = None
    duplicate_transactions: Optional[int] = None
    failed_transactions: Optional[int] = None
    error_message: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UploadHistoryListResponse(BaseModel):
    """Response schema for upload history list."""

    uploads: list[UploadHistoryResponse]
    total: int


class ParseError(BaseModel):
    """Schema for parsing errors."""

    row: int
    error: str
    original_data: dict
