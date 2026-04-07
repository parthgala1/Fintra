"""
Category API router.

Provides CRUD endpoints for categories.
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from auth.router import get_current_user
from database import get_db
from models.category import Category
from models.user import User
from schemas.category import (
    CategoryCreate,
    CategoryListResponse,
    CategoryResponse,
    CategoryUpdate,
)

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/categories", tags=["Categories"])

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user_dep(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    """Dependency to get current authenticated user."""
    return get_current_user(token, db)


@router.get("", response_model=CategoryListResponse)
def list_categories(
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    List all categories for the current user.
    
    Args:
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        List of categories
    """
    categories = (
        db.query(Category)
        .filter(
            Category.user_id == current_user.id,
            Category.is_active == True,  # noqa: E712
        )
        .order_by(Category.name)
        .all()
    )
    
    return CategoryListResponse(
        categories=categories,
        total=len(categories),
    )


@router.get("/system", response_model=CategoryListResponse)
def list_system_categories(
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    List all system categories.
    
    Args:
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        List of system categories
    """
    categories = (
        db.query(Category)
        .filter(Category.is_system == True)  # noqa: E712
        .order_by(Category.name)
        .all()
    )
    
    return CategoryListResponse(
        categories=categories,
        total=len(categories),
    )


@router.get("/{category_id}", response_model=CategoryResponse)
def get_category(
    category_id: UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Get a single category by ID.
    
    Args:
        category_id: Category UUID
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Category details
    """
    category = (
        db.query(Category)
        .filter(
            Category.id == category_id,
            Category.user_id == current_user.id,
        )
        .first()
    )
    
    if not category:
        # Check if it's a system category
        category = db.query(Category).filter(Category.id == category_id).first()
        if not category or not category.is_system:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found",
            )
    
    return category


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    category_data: CategoryCreate,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Create a new category.
    
    Args:
        category_data: Category data
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Created category
    """
    # Check if category name already exists for user
    existing = (
        db.query(Category)
        .filter(
            Category.user_id == current_user.id,
            Category.name == category_data.name,
        )
        .first()
    )
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category with this name already exists",
        )
    
    # Create category
    category = Category(
        user_id=current_user.id,
        **category_data.model_dump(),
    )
    
    db.add(category)
    db.commit()
    db.refresh(category)
    
    logger.info(f"Created category {category.id} for user {current_user.id}")
    
    return category


@router.patch("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: UUID,
    category_data: CategoryUpdate,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Update a category.
    
    Args:
        category_id: Category UUID
        category_data: Update data
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Updated category
    """
    category = (
        db.query(Category)
        .filter(
            Category.id == category_id,
            Category.user_id == current_user.id,
            Category.is_system == False,  # noqa: E712
        )
        .first()
    )
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found or cannot be modified",
        )
    
    # Update fields
    update_data = category_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)
    
    db.commit()
    db.refresh(category)
    
    logger.info(f"Updated category {category.id}")
    
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Delete a category.
    
    Args:
        category_id: Category UUID
        current_user: Current authenticated user
        db: Database session
    """
    category = (
        db.query(Category)
        .filter(
            Category.id == category_id,
            Category.user_id == current_user.id,
            Category.is_system == False,  # noqa: E712
        )
        .first()
    )
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found or cannot be deleted",
        )
    
    # Check if any transactions use this category
    from models.transaction import Transaction
    transaction_count = (
        db.query(Transaction)
        .filter(Transaction.category_id == category_id)
        .count()
    )
    
    if transaction_count > 0:
        # Instead of deleting, just mark as inactive
        category.is_active = False
        db.commit()
        logger.info(f"Marked category {category_id} as inactive (has {transaction_count} transactions)")
    else:
        db.delete(category)
        db.commit()
        logger.info(f"Deleted category {category_id}")
