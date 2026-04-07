import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, String, Numeric, Boolean, Text, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import enum

from database import Base


class UploadSource(str, enum.Enum):
    """Upload source enum."""
    MANUAL = "manual"
    PLAID = "plaid"
    OFX = "ofx"
    QIF = "qif"
    CSV = "csv"
    PDF = "pdf"


class UploadStatus(str, enum.Enum):
    """Upload status enum."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class UploadHistory(Base):
    """UploadHistory model for statement import history."""

    __tablename__ = "upload_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    bank_account_id = Column(UUID(as_uuid=True), ForeignKey("bank_accounts.id"), nullable=True)
    
    # Upload details
    source = Column(SQLEnum(UploadSource), nullable=False)
    file_name = Column(String(500), nullable=True)
    file_type = Column(String(50), nullable=True)
    file_size = Column(Numeric(15, 0), nullable=True)
    
    # Status
    status = Column(SQLEnum(UploadStatus), nullable=False, default=UploadStatus.PENDING)
    
    # Processing results
    total_transactions = Column(Numeric(10, 0), nullable=True)
    imported_transactions = Column(Numeric(10, 0), nullable=True)
    skipped_transactions = Column(Numeric(10, 0), nullable=True)
    duplicate_transactions = Column(Numeric(10, 0), nullable=True)
    failed_transactions = Column(Numeric(10, 0), nullable=True)
    
    # Error details
    error_message = Column(Text, nullable=True)
    error_details = Column(Text, nullable=True)
    
    # Date range of imported data
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    def __repr__(self):
        return f"<UploadHistory {self.source.value} - {self.status.value}>"
