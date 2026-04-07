from datetime import date, datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserBase(BaseModel):
    """Base user schema with common fields."""

    email: EmailStr
    name: str = Field(..., min_length=2, max_length=255)


class UserCreate(UserBase):
    """Schema for user signup."""

    password: str = Field(..., min_length=8)
    date_of_birth: date

    @field_validator("date_of_birth")
    @classmethod
    def validate_age(cls, v: date) -> date:
        """Validate user is at least 13 years old."""
        today = date.today()
        age = (
            today.year
            - v.year
            - ((today.month, today.day) < (v.month, v.day))
        )
        if age < 13:
            raise ValueError("User must be at least 13 years old")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password meets requirements."""
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least 1 uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least 1 lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least 1 number")
        return v


class UserLogin(BaseModel):
    """Schema for user login."""

    email: EmailStr
    password: str


class UserResponse(UserBase):
    """Schema for user response (excludes password)."""

    id: UUID
    date_of_birth: date
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PasswordResetRequest(BaseModel):
    """Schema for password reset request."""

    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Schema for password reset confirmation."""

    token: str
    new_password: str = Field(..., min_length=8)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password meets requirements."""
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least 1 uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least 1 lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least 1 number")
        return v


class Token(BaseModel):
    """Schema for JWT token response."""

    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Schema for JWT token payload."""

    user_id: Optional[UUID] = None
    email: Optional[str] = None
