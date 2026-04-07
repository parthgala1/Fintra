import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, String, Boolean, Text, Numeric, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from database import Base


class RefreshToken(Base):
    """RefreshToken model for session management."""

    __tablename__ = "refresh_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Token details
    token = Column(String(500), nullable=False, unique=True, index=True)
    token_family = Column(String(100), nullable=True)  # Group tokens from same device/session
    
    # Device info
    device_type = Column(String(50), nullable=True)  # mobile, desktop, tablet
    browser = Column(String(100), nullable=True)
    operating_system = Column(String(100), nullable=True)
    ip_address = Column(String(45), nullable=True)  # IPv6 compatible
    user_agent = Column(Text, nullable=True)
    
    # Location
    city = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    
    # Validity
    expires_at = Column(DateTime(timezone=True), nullable=False)
    issued_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    revoked_reason = Column(String(255), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_revoked = Column(Boolean, default=False)
    
    # Last usage
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    use_count = Column(Numeric(10, 0), nullable=True, default=0)
    
    # Session info
    session_id = Column(String(100), nullable=True, index=True)
    remember_me = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index('idx_refresh_tokens_user_active', 'user_id', 'is_active'),
        Index('idx_refresh_tokens_expires', 'expires_at'),
    )

    def __repr__(self):
        return f"<RefreshToken {self.id} - user {self.user_id}>"
