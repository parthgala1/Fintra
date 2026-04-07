"""
Goal API router.

Provides CRUD endpoints for goals, goal analysis,
and contribution tracking.
"""

import logging
from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from auth.router import get_current_user
from database import get_db
from models.goal import Goal, GoalStatus
from models.goal_contribution import GoalContribution
from models.goal_milestone import GoalMilestone
from models.user import User
from schemas.goal import (
    GoalAnalysisResponse,
    GoalContributionCreate,
    GoalCreate,
    GoalListResponse,
    GoalResponse,
    GoalUpdate,
    MilestoneCreate,
    MilestoneResponse,
)
from services.goal_engine import GoalEngine
from services.goal_report_service import GoalReportService

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/goals", tags=["Goals"])

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user_dep(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    """Dependency to get current authenticated user."""
    return get_current_user(token, db)


@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
def create_goal(
    goal_data: GoalCreate,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Create a new goal.
    
    Args:
        goal_data: Goal creation data
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Created goal
    """
    logger.info(f"Creating goal for user {current_user.id}: {goal_data.name}")
    
    # Create goal
    goal = Goal(
        user_id=current_user.id,
        name=goal_data.name,
        description=goal_data.description,
        goal_type=goal_data.goal_type,
        target_amount=goal_data.target_amount,
        current_amount=goal_data.current_amount,
        target_date=goal_data.target_date,
        monthly_contribution=goal_data.monthly_contribution,
        priority=goal_data.priority,
        status=GoalStatus.ACTIVE,
    )
    
    # Calculate initial progress
    goal = GoalEngine.update_goal_progress(goal)
    
    db.add(goal)
    db.commit()
    db.refresh(goal)
    
    logger.info(f"Created goal {goal.id}")
    
    return goal


@router.get("", response_model=GoalListResponse)
def list_goals(
    status_filter: Optional[GoalStatus] = None,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    List all goals for the current user.
    
    Args:
        status_filter: Filter by goal status (optional)
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        List of goals
    """
    query = db.query(Goal).filter(Goal.user_id == current_user.id)
    
    if status_filter:
        query = query.filter(Goal.status == status_filter)
    
    goals = query.order_by(Goal.created_at.desc()).all()
    
    return GoalListResponse(
        goals=[GoalResponse.model_validate(g) for g in goals],
        total=len(goals),
    )


@router.get("/{goal_id}", response_model=GoalResponse)
def get_goal(
    goal_id: UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Get a single goal by ID.
    
    Args:
        goal_id: Goal UUID
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Goal details
    """
    goal = (
        db.query(Goal)
        .filter(
            Goal.id == goal_id,
            Goal.user_id == current_user.id,
        )
        .first()
    )
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Goal {goal_id} not found",
        )
    
    return goal


@router.patch("/{goal_id}", response_model=GoalResponse)
def update_goal(
    goal_id: UUID,
    goal_data: GoalUpdate,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Update a goal.
    
    Args:
        goal_id: Goal UUID
        goal_data: Goal update data
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Updated goal
    """
    goal = (
        db.query(Goal)
        .filter(
            Goal.id == goal_id,
            Goal.user_id == current_user.id,
        )
        .first()
    )
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Goal {goal_id} not found",
        )
    
    # Update fields
    update_data = goal_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(goal, field, value)
    
    # Recalculate progress if amounts changed
    if "current_amount" in update_data or "target_amount" in update_data:
        goal = GoalEngine.update_goal_progress(goal)
        
        # Check if goal completed
        if GoalEngine.check_goal_completion(goal) and goal.status != GoalStatus.COMPLETED:
            goal.status = GoalStatus.COMPLETED
            goal.completed_at = datetime.now()
            logger.info(f"Goal {goal_id} marked as completed")
    
    db.commit()
    db.refresh(goal)
    
    logger.info(f"Updated goal {goal_id}")
    
    return goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Delete (archive) a goal.
    
    Args:
        goal_id: Goal UUID
        current_user: Current authenticated user
        db: Database session
    """
    goal = (
        db.query(Goal)
        .filter(
            Goal.id == goal_id,
            Goal.user_id == current_user.id,
        )
        .first()
    )
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Goal {goal_id} not found",
        )
    
    # Soft delete by setting status to cancelled
    goal.status = GoalStatus.CANCELLED
    db.commit()
    
    logger.info(f"Deleted (cancelled) goal {goal_id}")


@router.post("/{goal_id}/contribute", response_model=GoalResponse)
def record_contribution(
    goal_id: UUID,
    contribution_data: GoalContributionCreate,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Record a contribution to a goal.
    
    Args:
        goal_id: Goal UUID
        contribution_data: Contribution data
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Updated goal
    """
    goal = (
        db.query(Goal)
        .filter(
            Goal.id == goal_id,
            Goal.user_id == current_user.id,
        )
        .first()
    )
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Goal {goal_id} not found",
        )
    
    # Save state before contribution
    amount_before = goal.current_amount
    progress_before = goal.progress_percentage
    
    # Update goal current amount
    goal.current_amount += contribution_data.amount
    
    # Create contribution record
    contribution = GoalContribution(
        goal_id=goal_id,
        user_id=current_user.id,
        amount=contribution_data.amount,
        contribution_date=contribution_data.contribution_date,
        amount_before=amount_before,
        amount_after=goal.current_amount,
        progress_before=progress_before,
        progress_after=None,  # Will be calculated below
    )
    
    db.add(contribution)
    
    # Update progress
    goal = GoalEngine.update_goal_progress(goal)
    
    # Update contribution's progress_after
    contribution.progress_after = goal.progress_percentage
    
    # Check if goal completed
    if GoalEngine.check_goal_completion(goal) and goal.status != GoalStatus.COMPLETED:
        goal.status = GoalStatus.COMPLETED
        goal.completed_at = datetime.now()
        logger.info(f"Goal {goal_id} marked as completed after contribution")
    
    db.commit()
    db.refresh(goal)
    
    logger.info(
        f"Recorded contribution of {contribution_data.amount} to goal {goal_id}"
    )
    
    return goal


@router.get("/{goal_id}/analysis", response_model=GoalAnalysisResponse)
def get_goal_analysis(
    goal_id: UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Get goal feasibility analysis.
    
    Args:
        goal_id: Goal UUID
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Goal analysis with feasibility metrics
    """
    goal = (
        db.query(Goal)
        .filter(
            Goal.id == goal_id,
            Goal.user_id == current_user.id,
        )
        .first()
    )
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Goal {goal_id} not found",
        )
    
    # Calculate full analysis
    analysis = GoalEngine.calculate_full_analysis(goal)
    
    # Generate and save report
    GoalReportService.generate_feasibility_report(goal_id, db)
    
    logger.info(f"Generated analysis for goal {goal_id}")
    
    return GoalAnalysisResponse(**analysis)


@router.get("/{goal_id}/milestones", response_model=list[MilestoneResponse])
def list_milestones(
    goal_id: UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    List milestones for a goal.
    
    Args:
        goal_id: Goal UUID
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        List of milestones
    """
    # Verify goal ownership
    goal = (
        db.query(Goal)
        .filter(
            Goal.id == goal_id,
            Goal.user_id == current_user.id,
        )
        .first()
    )
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Goal {goal_id} not found",
        )
    
    milestones = (
        db.query(GoalMilestone)
        .filter(GoalMilestone.goal_id == goal_id)
        .order_by(GoalMilestone.created_at)
        .all()
    )
    
    return [MilestoneResponse.model_validate(m) for m in milestones]


@router.post("/{goal_id}/milestones", response_model=MilestoneResponse, status_code=status.HTTP_201_CREATED)
def create_milestone(
    goal_id: UUID,
    milestone_data: MilestoneCreate,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Create a milestone for a goal.
    
    Args:
        goal_id: Goal UUID
        milestone_data: Milestone creation data
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Created milestone
    """
    # Verify goal ownership
    goal = (
        db.query(Goal)
        .filter(
            Goal.id == goal_id,
            Goal.user_id == current_user.id,
        )
        .first()
    )
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Goal {goal_id} not found",
        )
    
    # Create milestone
    milestone = GoalMilestone(
        goal_id=goal_id,
        user_id=current_user.id,
        name=milestone_data.name,
        description=milestone_data.description,
        target_amount=milestone_data.target_amount,
        target_date=milestone_data.target_date,
    )
    
    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    
    logger.info(f"Created milestone {milestone.id} for goal {goal_id}")
    
    return milestone
