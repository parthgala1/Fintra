"""
Goal Report Service.

Generates feasibility reports and analysis for goals.
Persists reports to GoalReport model.
"""

import logging
from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from models.goal import Goal, GoalStatus
from models.goal_report import GoalReport
from services.goal_engine import GoalEngine

logger = logging.getLogger(__name__)


class GoalReportService:
    """Service for generating goal feasibility reports."""

    @staticmethod
    def generate_feasibility_report(
        goal_id: UUID,
        db: Session
    ) -> Optional[GoalReport]:
        """
        Generate a feasibility report for a goal.
        
        Args:
            goal_id: Goal UUID
            db: Database session
        
        Returns:
            GoalReport object or None if goal not found
        """
        logger.info(f"Generating feasibility report for goal {goal_id}")
        
        # Fetch goal
        goal = db.query(Goal).filter(Goal.id == goal_id).first()
        if not goal:
            logger.warning(f"Goal {goal_id} not found")
            return None
        
        # Calculate full analysis
        analysis = GoalEngine.calculate_full_analysis(goal)
        
        # Create or update report
        existing_report = (
            db.query(GoalReport)
            .filter(GoalReport.goal_id == goal_id)
            .order_by(GoalReport.created_at.desc())
            .first()
        )
        
        # Create new report matching GoalReport model fields
        report = GoalReport(
            goal_id=goal_id,
            user_id=goal.user_id,
            report_date=datetime.now(),
            goal_amount=goal.target_amount,
            current_amount=goal.current_amount,
            target_date=goal.target_date,
            required_monthly_contribution=analysis["required_monthly"],
            current_monthly_contribution=analysis["current_contribution"],
            additional_monthly_needed=analysis["gap"],
            is_on_track=analysis["is_on_track"],
            months_remaining=Decimal(str(analysis["months_remaining"])),
            projected_completion_date=analysis["projected_completion_date"],
            shortfall_amount=analysis["shortfall_amount"],
            risk_level=analysis["risk_level"],
        )
        
        db.add(report)
        db.commit()
        db.refresh(report)
        
        logger.info(
            f"Created feasibility report {report.id} for goal {goal_id}: "
            f"feasibility={analysis['feasibility_percentage']}%, "
            f"risk={analysis['risk_level']}"
        )
        
        return report

    @staticmethod
    def get_latest_report(
        goal_id: UUID,
        db: Session
    ) -> Optional[GoalReport]:
        """
        Get the most recent report for a goal.
        
        Args:
            goal_id: Goal UUID
            db: Database session
        
        Returns:
            Latest GoalReport or None
        """
        report = (
            db.query(GoalReport)
            .filter(GoalReport.goal_id == goal_id)
            .order_by(GoalReport.created_at.desc())
            .first()
        )
        
        return report

    @staticmethod
    def calculate_projected_completion(
        goal: Goal
    ) -> Optional[datetime]:
        """
        Calculate projected completion date.
        
        Wrapper around GoalEngine method for consistency.
        
        Args:
            goal: Goal object
        
        Returns:
            Projected completion date or None
        """
        return GoalEngine.calculate_projected_completion_date(goal)

    @staticmethod
    def calculate_shortfall(
        goal: Goal
    ) -> Decimal:
        """
        Calculate shortfall amount (remaining to save).
        
        Args:
            goal: Goal object
        
        Returns:
            Shortfall amount (0 if goal complete)
        """
        shortfall = goal.target_amount - goal.current_amount
        return max(Decimal("0"), shortfall)

    @staticmethod
    def assess_risk(
        goal: Goal
    ) -> str:
        """
        Assess risk level for goal achievement.
        
        Args:
            goal: Goal object
        
        Returns:
            Risk level: "low", "medium", "high"
        """
        # Get current contribution
        current_contribution = goal.monthly_contribution or Decimal("0")
        
        # Calculate metrics
        months_remaining = GoalEngine.calculate_months_remaining(goal.target_date)
        required_monthly = GoalEngine.calculate_required_monthly(
            goal.target_amount,
            goal.current_amount,
            months_remaining
        )
        gap = GoalEngine.calculate_gap(required_monthly, current_contribution)
        feasibility = GoalEngine.calculate_feasibility(
            current_contribution,
            required_monthly
        )
        
        # Assess risk
        risk_level = GoalEngine.assess_risk_level(
            feasibility,
            months_remaining,
            gap
        )
        
        logger.debug(
            f"Risk assessment for goal {goal.id}: {risk_level} "
            f"(feasibility={feasibility}%, months={months_remaining}, gap={gap})"
        )
        
        return risk_level
