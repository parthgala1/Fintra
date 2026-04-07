"""
CategoryMapping API router.

Provides CRUD endpoints for category mappings (classification rules).
"""

import logging
import re
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from auth.router import get_current_user
from database import get_db
from models.category_mapping import CategoryMapping
from models.user import User
from schemas.category_mapping import (
    CategoryMappingCreate,
    CategoryMappingListResponse,
    CategoryMappingResponse,
    CategoryMappingTest,
    CategoryMappingTestResult,
    CategoryMappingUpdate,
)
from services.classification_engine import (
    apply_keyword_matching,
    apply_rule_based_classification,
)

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/category-mappings", tags=["Category Mappings"])

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user_dep(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    """Dependency to get current authenticated user."""
    return get_current_user(token, db)


@router.get("", response_model=CategoryMappingListResponse)
def list_mappings(
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    List all category mappings for the current user.
    
    Args:
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        List of category mappings
    """
    mappings = (
        db.query(CategoryMapping)
        .filter(CategoryMapping.user_id == current_user.id)
        .order_by(CategoryMapping.priority.desc())
        .all()
    )
    
    return CategoryMappingListResponse(
        mappings=mappings,
        total=len(mappings),
    )


@router.get("/{mapping_id}", response_model=CategoryMappingResponse)
def get_mapping(
    mapping_id: UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Get a single category mapping by ID.
    
    Args:
        mapping_id: Mapping UUID
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Category mapping details
    """
    mapping = (
        db.query(CategoryMapping)
        .filter(
            CategoryMapping.id == mapping_id,
            CategoryMapping.user_id == current_user.id,
        )
        .first()
    )
    
    if not mapping:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category mapping not found",
        )
    
    return mapping


@router.post("", response_model=CategoryMappingResponse, status_code=status.HTTP_201_CREATED)
def create_mapping(
    mapping_data: CategoryMappingCreate,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Create a new category mapping.
    
    Args:
        mapping_data: Category mapping data
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Created category mapping
    """
    # Verify category exists and belongs to user
    from models.category import Category
    category = (
        db.query(Category)
        .filter(
            Category.id == mapping_data.category_id,
            Category.user_id == current_user.id,
        )
        .first()
    )
    
    if not category:
        # Check if it's a system category
        category = db.query(Category).filter(Category.id == mapping_data.category_id).first()
        if not category or not category.is_system:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category not found",
            )
    
    # Create mapping
    mapping = CategoryMapping(
        user_id=current_user.id,
        **mapping_data.model_dump(),
    )
    
    db.add(mapping)
    db.commit()
    db.refresh(mapping)
    
    logger.info(f"Created category mapping {mapping.id} for user {current_user.id}")
    
    return mapping


@router.patch("/{mapping_id}", response_model=CategoryMappingResponse)
def update_mapping(
    mapping_id: UUID,
    mapping_data: CategoryMappingUpdate,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Update a category mapping.
    
    Args:
        mapping_id: Mapping UUID
        mapping_data: Update data
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Updated category mapping
    """
    mapping = (
        db.query(CategoryMapping)
        .filter(
            CategoryMapping.id == mapping_id,
            CategoryMapping.user_id == current_user.id,
            CategoryMapping.is_system == False,  # noqa: E712
        )
        .first()
    )
    
    if not mapping:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category mapping not found or cannot be modified",
        )
    
    # Update fields
    update_data = mapping_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(mapping, field, value)
    
    db.commit()
    db.refresh(mapping)
    
    logger.info(f"Updated category mapping {mapping.id}")
    
    return mapping


@router.delete("/{mapping_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mapping(
    mapping_id: UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Delete a category mapping.
    
    Args:
        mapping_id: Mapping UUID
        current_user: Current authenticated user
        db: Database session
    """
    mapping = (
        db.query(CategoryMapping)
        .filter(
            CategoryMapping.id == mapping_id,
            CategoryMapping.user_id == current_user.id,
            CategoryMapping.is_system == False,  # noqa: E712
        )
        .first()
    )
    
    if not mapping:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category mapping not found or cannot be deleted",
        )
    
    db.delete(mapping)
    db.commit()
    
    logger.info(f"Deleted category mapping {mapping_id}")


@router.post("/test", response_model=CategoryMappingTestResult)
def test_mapping(
    test_data: CategoryMappingTest,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Test category mappings against a description.
    
    Args:
        test_data: Test data with description
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Test result with matching mappings
    """
    description = test_data.description
    amount = test_data.amount or 0.0
    
    # Get all user mappings
    all_mappings = (
        db.query(CategoryMapping)
        .filter(
            CategoryMapping.user_id == current_user.id,
            CategoryMapping.is_active == True,  # noqa: E712
        )
        .order_by(CategoryMapping.priority.desc())
        .all()
    )
    
    # Test rule-based classification first
    matched_id = apply_rule_based_classification(db, description, amount, current_user.id)
    
    matched_mapping = None
    if matched_id:
        # Find the matching rule (not just by category_id, but the actual matching rule)
        for mapping in all_mappings:
            if mapping.category_id == matched_id:
                # Verify this rule actually matches (in case multiple rules map to same category)
                # by re-checking the conditions
                matches = True
                description_lower = description.lower()
                
                if mapping.contains_text:
                    if mapping.contains_text.lower() not in description_lower:
                        matches = False
                
                if matches and mapping.starts_with:
                    if not description_lower.startswith(mapping.starts_with.lower()):
                        matches = False
                
                if matches and mapping.ends_with:
                    if not description_lower.endswith(mapping.ends_with.lower()):
                        matches = False
                
                if matches and mapping.regex_pattern:
                    try:
                        if not re.search(mapping.regex_pattern, description, re.IGNORECASE):
                            matches = False
                    except re.error:
                        pass
                
                if matches and mapping.merchant_name:
                    if mapping.merchant_name.lower() not in description_lower:
                        matches = False
                
                if matches and (mapping.amount_min or mapping.amount_max):
                    try:
                        if mapping.amount_min:
                            if amount < float(str(mapping.amount_min)):
                                matches = False
                        if matches and mapping.amount_max:
                            if amount > float(str(mapping.amount_max)):
                                matches = False
                    except (ValueError, TypeError):
                        pass
                
                if matches:
                    matched_mapping = mapping
                    break
    
    return CategoryMappingTestResult(
        matches=matched_mapping is not None,
        matched_mapping=matched_mapping,
        all_mappings_tested=all_mappings,
    )
