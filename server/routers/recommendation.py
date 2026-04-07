"""
Recommendation Router.

API endpoints for financial recommendations.
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from auth.router import get_current_user
from database import get_db
from models.user import User
from models.recommendation import Recommendation, RecommendationCategory, RecommendationStatus
from schemas.recommendation import (
    RecommendationResponse,
    RecommendationListResponse,
    RecommendationGenerateRequest,
    RecommendationDismissRequest,
    RecommendationSnoozeRequest,
)
from services.recommendation_engine import RecommendationEngine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


# Auth dependency wrapper
def get_current_user_dep(
    token: str = Depends(OAuth2PasswordBearer(tokenUrl="/api/auth/login")),
    db: Session = Depends(get_db),
) -> User:
    return get_current_user(token, db)


@router.get("", response_model=RecommendationListResponse)
def list_recommendations(
    category: Optional[RecommendationCategory] = Query(None, description="Filter by category"),
    status: Optional[RecommendationStatus] = Query(None, description="Filter by status"),
    limit: Optional[int] = Query(None, description="Limit results"),
    offset: int = Query(0, description="Offset for pagination"),
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    List recommendations for the current user.
    
    By default, returns active (NEW and unexpired SNOOZED) recommendations.
    """
    try:
        if status:
            # If status specified, get recommendations with that status
            query = db.query(Recommendation).filter(
                Recommendation.user_id == current_user.id,
                Recommendation.status == status
            )
            
            if category:
                query = query.filter(Recommendation.category == category)
            
            total = query.count()
            
            recommendations = query.offset(offset).limit(limit if limit else 100).all()
        else:
            # Default: get active recommendations
            recommendations = RecommendationEngine.get_active_recommendations(
                user_id=current_user.id,
                db=db,
                category=category,
                limit=limit
            )
            total = len(recommendations)
        
        logger.info(f"Retrieved {len(recommendations)} recommendations for user {current_user.id}")
        
        return RecommendationListResponse(
            recommendations=recommendations,
            total=total
        )
    
    except Exception as e:
        logger.error(f"Error listing recommendations: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve recommendations")


@router.get("/{recommendation_id}", response_model=RecommendationResponse)
def get_recommendation(
    recommendation_id: UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """Get a specific recommendation by ID."""
    from models.recommendation import Recommendation
    
    rec = (
        db.query(Recommendation)
        .filter(
            Recommendation.id == recommendation_id,
            Recommendation.user_id == current_user.id
        )
        .first()
    )
    
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    
    # Increment view count
    rec.view_count = (rec.view_count or 0) + 1
    db.commit()
    
    logger.info(f"Retrieved recommendation {recommendation_id}")
    
    return rec


@router.post("/generate", response_model=RecommendationListResponse, status_code=201)
def generate_recommendations(
    request: RecommendationGenerateRequest,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Generate new recommendations for the current user.
    
    Can generate:
    - Budget recommendations (based on deviations)
    - Savings recommendations (based on spending patterns)
    - All recommendations (if type not specified)
    """
    try:
        recommendations = []
        
        if request.type == "budget" or request.type is None:
            budget_recs = RecommendationEngine.generate_budget_recommendations(
                user_id=current_user.id,
                db=db
            )
            recommendations.extend(budget_recs)
        
        if request.type == "savings" or request.type is None:
            savings_recs = RecommendationEngine.generate_savings_recommendations(
                user_id=current_user.id,
                db=db
            )
            recommendations.extend(savings_recs)
        
        # Note: Goal recommendations are generated per-goal, not for all goals at once
        # They are triggered when viewing a specific goal
        
        logger.info(f"Generated {len(recommendations)} recommendations for user {current_user.id}")
        
        return RecommendationListResponse(
            recommendations=recommendations,
            total=len(recommendations)
        )
    
    except Exception as e:
        logger.error(f"Error generating recommendations: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate recommendations")


@router.patch("/{recommendation_id}/dismiss", response_model=RecommendationResponse)
def dismiss_recommendation(
    recommendation_id: UUID,
    request: RecommendationDismissRequest,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """Dismiss a recommendation."""
    try:
        rec = RecommendationEngine.dismiss_recommendation(
            recommendation_id=recommendation_id,
            user_id=current_user.id,
            db=db,
            reason=request.reason
        )
        
        if not rec:
            raise HTTPException(status_code=404, detail="Recommendation not found")
        
        logger.info(f"Dismissed recommendation {recommendation_id}")
        
        return rec
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error dismissing recommendation: {e}")
        raise HTTPException(status_code=500, detail="Failed to dismiss recommendation")


@router.patch("/{recommendation_id}/implement", response_model=RecommendationResponse)
def implement_recommendation(
    recommendation_id: UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """Mark a recommendation as implemented."""
    try:
        rec = RecommendationEngine.implement_recommendation(
            recommendation_id=recommendation_id,
            user_id=current_user.id,
            db=db
        )
        
        if not rec:
            raise HTTPException(status_code=404, detail="Recommendation not found")
        
        logger.info(f"Implemented recommendation {recommendation_id}")
        
        return rec
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error implementing recommendation: {e}")
        raise HTTPException(status_code=500, detail="Failed to implement recommendation")


@router.patch("/{recommendation_id}/snooze", response_model=RecommendationResponse)
def snooze_recommendation(
    recommendation_id: UUID,
    request: RecommendationSnoozeRequest,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """Snooze a recommendation for a specified number of days."""
    try:
        rec = RecommendationEngine.snooze_recommendation(
            recommendation_id=recommendation_id,
            user_id=current_user.id,
            db=db,
            days=request.days
        )
        
        if not rec:
            raise HTTPException(status_code=404, detail="Recommendation not found")
        
        logger.info(f"Snoozed recommendation {recommendation_id} for {request.days} days")
        
        return rec
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error snoozing recommendation: {e}")
        raise HTTPException(status_code=500, detail="Failed to snooze recommendation")
