import logging
import secrets
import uuid
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from auth.jwt import create_access_token, verify_token
from auth.password import get_password_hash, verify_password
from config import settings
from database import get_db
from models.user import User
from models.category import Category
from schemas.user import (
    PasswordResetConfirm,
    PasswordResetRequest,
    Token,
    UserCreate,
    UserLogin,
    UserResponse,
)

# Setup logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/auth", tags=["Authentication"])

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# In-memory token storage for password reset (use Redis in production)
password_reset_tokens: dict[str, dict] = {}


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    """Dependency to get current authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = verify_token(token)
    if payload is None:
        raise credentials_exception
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_uuid).first()
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    return user


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user.
    
    Validates:
    - Email format and uniqueness
    - Password strength requirements
    - User is at least 13 years old
    """
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )
    
    # Hash password
    hashed_password = get_password_hash(user_data.password)
    
    # Create user
    new_user = User(
        email=user_data.email,
        name=user_data.name,
        hashed_password=hashed_password,
        date_of_birth=user_data.date_of_birth,
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    logger.info(f"New user registered: {new_user.email}")
    
    # Seed default categories and mappings for new user
    try:
        from data.seed_categories import seed_all
        result = seed_all(db, new_user.id)
        logger.info(
            f"Seeded {result['categories_created']} categories and "
            f"{result['mappings_created']} mappings for user {new_user.id}"
        )
        
        # Validate that categories were created
        if result['categories_created'] == 0:
            logger.error(f"WARNING: No categories were created for user {new_user.id}. This is unexpected!")
        
    except Exception as e:
        logger.error(f"Failed to seed categories for user {new_user.id}: {e}", exc_info=True)
        # Continue anyway - user can create categories manually
    
    return new_user


@router.post("/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate a user and return JWT token.
    
    Validates:
    - Email exists in database
    - Password matches hashed password
    - Auto-seeds categories if user doesn't have any (for existing users)
    """
    # Find user by email
    user = db.query(User).filter(User.email == user_data.email).first()
    
    if not user:
        logger.warning(f"Login attempt with non-existent email: {user_data.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Verify password
    if not verify_password(user_data.password, user.hashed_password):
        logger.warning(f"Failed login attempt for: {user_data.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.is_active:
        logger.warning(f"Inactive user login attempt: {user_data.email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Auto-seed categories if user doesn't have any (for existing users)
    try:
        user_category_count = db.query(Category).filter(
            Category.user_id == user.id
        ).count()
        
        if user_category_count == 0:
            logger.info(f"User {user.email} has no categories, auto-seeding...")
            from data.seed_categories import seed_all
            result = seed_all(db, user.id)
            logger.info(
                f"Auto-seeded {user.email}: {result['categories_created']} categories, "
                f"{result['mappings_created']} mappings"
            )
    except Exception as e:
        logger.error(f"Failed to auto-seed categories for {user.email}: {e}", exc_info=True)
        # Continue anyway - don't block login if seeding fails
    
    # Create access token
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email},
        expires_delta=timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    )
    
    logger.info(f"User logged in: {user.email}")
    
    return Token(access_token=access_token, token_type="bearer")


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(
    request: PasswordResetRequest, db: Session = Depends(get_db)
):
    """
    Request password reset.
    
    Always returns success to prevent email enumeration.
    If email exists, generates reset token and "sends" email (logs in dev).
    """
    user = db.query(User).filter(User.email == request.email).first()
    
    if user:
        # Generate reset token
        reset_token = secrets.token_urlsafe(32)
        password_reset_tokens[reset_token] = {
            "user_id": str(user.id),
            "email": user.email,
        }
        
        # In production, send email here
        logger.info(f"Password reset requested for: {user.email}")
        logger.info(f"Reset token (DEV ONLY): {reset_token}")
        print(f"=" * 60)
        print(f"PASSWORD RESET LINK (Development)")
        print(f"Email: {user.email}")
        print(f"Token: {reset_token}")
        print(f"URL: http://localhost:3000/reset-password?token={reset_token}")
        print(f"=" * 60)
    
    # Always return success to prevent email enumeration
    return {
        "message": "If the email exists, a password reset link has been sent"
    }


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(
    reset_data: PasswordResetConfirm, db: Session = Depends(get_db)
):
    """
    Reset password using token.
    
    Validates:
    - Token exists and is valid
    - New password meets strength requirements
    """
    token_data = password_reset_tokens.get(reset_data.token)
    
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Get user
    try:
        user_uuid = uuid.UUID(token_data["user_id"])
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token"
        )
    
    user = db.query(User).filter(User.id == user_uuid).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update password
    user.hashed_password = get_password_hash(reset_data.new_password)
    db.commit()
    
    # Remove used token
    del password_reset_tokens[reset_data.token]
    
    logger.info(f"Password reset successful for: {user.email}")
    
    return {"message": "Password reset successful"}


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user information."""
    return current_user


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(current_user: User = Depends(get_current_user)):
    """
    Logout user.
    
    In a more complete implementation, this would invalidate the token
    by adding it to a blacklist in Redis.
    """
    logger.info(f"User logged out: {current_user.email}")
    return {"message": "Successfully logged out"}
