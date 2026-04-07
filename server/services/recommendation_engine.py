"""
Recommendation Engine Service.

Generates actionable financial recommendations based on budget deviations,
goal feasibility, and spending patterns per Project.md Section 6.5.

Philosophy: Must output ACTIONS, not just insights.
"""

import json
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from models.recommendation import (
    Recommendation,
    RecommendationCategory,
    RecommendationImpact,
    RecommendationStatus,
)
from models.goal import Goal, GoalStatus
from models.budget import Budget
from models.budget_report import BudgetReport
from services.deviation_detector import DeviationDetector, DeviationLevel
from services.goal_engine import GoalEngine

logger = logging.getLogger(__name__)


class RecommendationEngine:
    """Service for generating actionable financial recommendations."""

    @staticmethod
    def generate_budget_recommendations(
        user_id: UUID,
        db: Session
    ) -> List[Recommendation]:
        """
        Generate recommendations based on budget deviations.
        
        Analyzes the latest budget report and generates specific actions
        to address overspending or opportunities for optimization.
        
        Args:
            user_id: User ID
            db: Database session
        
        Returns:
            List of newly created recommendations
        """
        recommendations = []
        
        # Get user's active budgets
        budgets = (
            db.query(Budget)
            .filter(Budget.user_id == user_id)
            .all()
        )
        
        for budget in budgets:
            # Detect deviations
            deviations = DeviationDetector.detect_deviations(db, budget.id)
            
            # Generate recommendations for each significant deviation
            for deviation in deviations:
                if deviation.level in [DeviationLevel.OVER_BUDGET, DeviationLevel.CRITICAL]:
                    rec = RecommendationEngine._create_overspending_recommendation(
                        user_id=user_id,
                        deviation=deviation,
                        budget=budget
                    )
                    recommendations.append(rec)
                    logger.info(f"Generated overspending recommendation for {deviation.category}")
                
                elif deviation.level == DeviationLevel.WARNING:
                    rec = RecommendationEngine._create_warning_recommendation(
                        user_id=user_id,
                        deviation=deviation,
                        budget=budget
                    )
                    recommendations.append(rec)
                    logger.info(f"Generated warning recommendation for {deviation.category}")
        
        # Save recommendations to database
        for rec in recommendations:
            # Check if similar recommendation already exists
            existing = (
                db.query(Recommendation)
                .filter(
                    and_(
                        Recommendation.user_id == user_id,
                        Recommendation.category == rec.category,
                        Recommendation.status == RecommendationStatus.NEW,
                        Recommendation.trigger_type == rec.trigger_type
                    )
                )
                .first()
            )
            
            if not existing:
                db.add(rec)
        
        db.commit()
        
        logger.info(f"Generated {len(recommendations)} budget recommendations for user {user_id}")
        return recommendations

    @staticmethod
    def generate_goal_recommendations(
        goal_id: UUID,
        db: Session
    ) -> List[Recommendation]:
        """
        Generate recommendations for a specific goal based on feasibility analysis.
        
        Args:
            goal_id: Goal ID
            db: Database session
        
        Returns:
            List of newly created recommendations
        """
        recommendations = []
        
        # Get goal
        goal = db.query(Goal).filter(Goal.id == goal_id).first()
        if not goal or goal.status != GoalStatus.ACTIVE:
            return recommendations
        
        # Calculate analysis
        analysis = GoalEngine.calculate_feasibility(goal)
        
        # If there's a gap, generate recommendations
        if analysis["gap"] > 0:
            recommendations.extend(
                RecommendationEngine._create_goal_gap_recommendations(
                    goal=goal,
                    analysis=analysis
                )
            )
        
        # If goal is at risk, generate recommendations
        if analysis["risk_level"] in ["medium", "high"]:
            recommendations.extend(
                RecommendationEngine._create_goal_risk_recommendations(
                    goal=goal,
                    analysis=analysis
                )
            )
        
        # Save recommendations to database
        for rec in recommendations:
            # Check if similar recommendation already exists
            existing = (
                db.query(Recommendation)
                .filter(
                    and_(
                        Recommendation.user_id == goal.user_id,
                        Recommendation.category == RecommendationCategory.GOALS,
                        Recommendation.status == RecommendationStatus.NEW,
                        Recommendation.trigger_data.contains(str(goal_id))
                    )
                )
                .first()
            )
            
            if not existing:
                db.add(rec)
        
        db.commit()
        
        logger.info(f"Generated {len(recommendations)} goal recommendations for goal {goal_id}")
        return recommendations

    @staticmethod
    def generate_savings_recommendations(
        user_id: UUID,
        db: Session
    ) -> List[Recommendation]:
        """
        Generate recommendations for improving savings based on spending patterns.
        
        Args:
            user_id: User ID
            db: Database session
        
        Returns:
            List of newly created recommendations
        """
        recommendations = []
        
        # Get user's latest budget report
        latest_report = (
            db.query(BudgetReport)
            .join(Budget)
            .filter(Budget.user_id == user_id)
            .order_by(BudgetReport.created_at.desc())
            .first()
        )
        
        if not latest_report:
            return recommendations
        
        # Check if savings is below target
        if latest_report.actual_savings and latest_report.budgeted_savings:
            if latest_report.actual_savings < latest_report.budgeted_savings:
                shortfall = latest_report.budgeted_savings - latest_report.actual_savings
                rec = RecommendationEngine._create_savings_shortfall_recommendation(
                    user_id=user_id,
                    shortfall=shortfall,
                    target_savings=latest_report.budgeted_savings
                )
                recommendations.append(rec)
        
        # Save recommendations to database
        for rec in recommendations:
            existing = (
                db.query(Recommendation)
                .filter(
                    and_(
                        Recommendation.user_id == user_id,
                        Recommendation.category == RecommendationCategory.SAVINGS,
                        Recommendation.status == RecommendationStatus.NEW
                    )
                )
                .first()
            )
            
            if not existing:
                db.add(rec)
        
        db.commit()
        
        logger.info(f"Generated {len(recommendations)} savings recommendations for user {user_id}")
        return recommendations

    @staticmethod
    def prioritize_recommendations(
        recommendations: List[Recommendation]
    ) -> List[Recommendation]:
        """
        Sort recommendations by impact and urgency.
        
        Args:
            recommendations: List of recommendations
        
        Returns:
            Sorted list (high impact first, then medium, then low)
        """
        impact_order = {
            RecommendationImpact.HIGH: 0,
            RecommendationImpact.MEDIUM: 1,
            RecommendationImpact.LOW: 2,
        }
        
        return sorted(
            recommendations,
            key=lambda r: (
                impact_order.get(r.impact, 3),
                r.created_at
            )
        )

    # Helper methods for creating specific recommendations

    @staticmethod
    def _create_overspending_recommendation(
        user_id: UUID,
        deviation,
        budget: Budget
    ) -> Recommendation:
        """Create recommendation for overspending."""
        overspend_amount = deviation.deviation_amount
        category_name = deviation.category.title()
        
        action_steps = [
            f"Review all {deviation.category} transactions from this month",
            f"Identify unnecessary expenses totaling ₹{overspend_amount:.2f}",
            f"Set up spending alerts for {deviation.category} category",
            f"Consider moving funds from other categories if essential"
        ]
        
        return Recommendation(
            user_id=user_id,
            category=RecommendationCategory.BUDGET,
            impact=RecommendationImpact.HIGH,
            status=RecommendationStatus.NEW,
            title=f"Reduce {category_name} spending by ₹{overspend_amount:.2f}",
            description=(
                f"You've exceeded your {category_name} budget by ₹{overspend_amount:.2f} "
                f"({deviation.deviation_percentage:.1f}% of budgeted amount). "
                f"Taking action now will prevent further overspending and help you stay on track."
            ),
            short_summary=f"{category_name} over budget by ₹{overspend_amount:.2f}",
            potential_savings=overspend_amount,
            estimated_time_to_impact="Immediate",
            action_steps=json.dumps(action_steps),
            trigger_type="budget_overspend",
            trigger_data=json.dumps({
                "budget_id": str(budget.id),
                "category": deviation.category,
                "overspend_amount": str(overspend_amount),
                "deviation_percentage": str(deviation.deviation_percentage)
            })
        )

    @staticmethod
    def _create_warning_recommendation(
        user_id: UUID,
        deviation,
        budget: Budget
    ) -> Recommendation:
        """Create warning recommendation for approaching budget limit."""
        remaining = deviation.budgeted_amount - deviation.actual_amount
        category_name = deviation.category.title()
        
        action_steps = [
            f"Track {deviation.category} spending closely for rest of month",
            f"Limit {deviation.category} purchases to essentials only",
            f"Review and cancel any upcoming non-essential {deviation.category} expenses"
        ]
        
        return Recommendation(
            user_id=user_id,
            category=RecommendationCategory.BUDGET,
            impact=RecommendationImpact.MEDIUM,
            status=RecommendationStatus.NEW,
            title=f"Approaching {category_name} budget limit - ₹{remaining:.2f} remaining",
            description=(
                f"You've used {deviation.deviation_percentage:.1f}% of your {category_name} budget. "
                f"Only ₹{remaining:.2f} remains. Consider slowing down spending to avoid going over budget."
            ),
            short_summary=f"{category_name} at {deviation.deviation_percentage:.1f}% of budget",
            potential_savings=remaining,
            estimated_time_to_impact="This month",
            action_steps=json.dumps(action_steps),
            trigger_type="budget_warning",
            trigger_data=json.dumps({
                "budget_id": str(budget.id),
                "category": deviation.category,
                "percentage_used": str(deviation.deviation_percentage)
            })
        )

    @staticmethod
    def _create_goal_gap_recommendations(
        goal: Goal,
        analysis: dict
    ) -> List[Recommendation]:
        """Create recommendations for goal contribution gap."""
        recommendations = []
        gap = analysis["gap"]
        required_monthly = analysis["required_monthly"]
        
        # Recommendation 1: Increase contribution
        action_steps_increase = [
            f"Increase monthly contribution to ₹{required_monthly:.2f}",
            f"Review budget to find ₹{gap:.2f} in savings",
            "Consider reducing 'wants' spending to free up funds",
            "Set up automatic transfer on payday"
        ]
        
        rec1 = Recommendation(
            user_id=goal.user_id,
            category=RecommendationCategory.GOALS,
            impact=RecommendationImpact.HIGH,
            status=RecommendationStatus.NEW,
            title=f"Increase contribution to '{goal.name}' by ₹{gap:.2f}/month",
            description=(
                f"To reach your goal of ₹{goal.target_amount:.2f} by "
                f"{goal.target_date.strftime('%B %Y') if goal.target_date else 'target date'}, "
                f"you need to contribute ₹{required_monthly:.2f}/month. "
                f"You're currently short by ₹{gap:.2f}/month."
            ),
            short_summary=f"Increase '{goal.name}' contribution by ₹{gap:.2f}",
            potential_savings=None,
            estimated_time_to_impact=f"{analysis['months_remaining']} months",
            action_steps=json.dumps(action_steps_increase),
            trigger_type="goal_gap",
            trigger_data=json.dumps({
                "goal_id": str(goal.id),
                "gap": str(gap),
                "required_monthly": str(required_monthly)
            })
        )
        recommendations.append(rec1)
        
        # Recommendation 2: Extend deadline (if applicable)
        if goal.target_date and analysis["months_remaining"] > 0:
            # Calculate new deadline for current contribution
            current_contribution = analysis["current_contribution"]
            if current_contribution > 0:
                remaining_amount = goal.target_amount - goal.current_amount
                months_needed = int((remaining_amount / current_contribution).quantize(Decimal("1")))
                
                if months_needed > analysis["months_remaining"]:
                    extension_months = months_needed - analysis["months_remaining"]
                    new_date = goal.target_date + timedelta(days=extension_months * 30)
                    
                    action_steps_extend = [
                        f"Extend goal deadline by {extension_months} months to {new_date.strftime('%B %Y')}",
                        "Keep current contribution amount the same",
                        "Review goal timeline in next budget review"
                    ]
                    
                    rec2 = Recommendation(
                        user_id=goal.user_id,
                        category=RecommendationCategory.GOALS,
                        impact=RecommendationImpact.MEDIUM,
                        status=RecommendationStatus.NEW,
                        title=f"Extend '{goal.name}' deadline by {extension_months} months",
                        description=(
                            f"If increasing your contribution is difficult, consider extending "
                            f"your goal deadline by {extension_months} months to "
                            f"{new_date.strftime('%B %Y')}. This will make the goal achievable "
                            f"with your current contribution of ₹{current_contribution:.2f}/month."
                        ),
                        short_summary=f"Extend '{goal.name}' by {extension_months} months",
                        potential_savings=None,
                        estimated_time_to_impact="Immediate",
                        action_steps=json.dumps(action_steps_extend),
                        trigger_type="goal_timeline_adjustment",
                        trigger_data=json.dumps({
                            "goal_id": str(goal.id),
                            "extension_months": extension_months,
                            "new_target_date": new_date.isoformat()
                        })
                    )
                    recommendations.append(rec2)
        
        return recommendations

    @staticmethod
    def _create_goal_risk_recommendations(
        goal: Goal,
        analysis: dict
    ) -> List[Recommendation]:
        """Create recommendations for at-risk goals."""
        recommendations = []
        
        if analysis["risk_level"] == "high":
            action_steps = [
                "Review goal timeline and make it more realistic",
                "Consider breaking goal into smaller milestones",
                "Reassess target amount if it's too ambitious",
                "Find additional income sources if possible"
            ]
            
            rec = Recommendation(
                user_id=goal.user_id,
                category=RecommendationCategory.GOALS,
                impact=RecommendationImpact.HIGH,
                status=RecommendationStatus.NEW,
                title=f"Goal '{goal.name}' at high risk - Review timeline",
                description=(
                    f"Your goal '{goal.name}' is at high risk of not being achieved. "
                    f"The required monthly contribution of ₹{analysis['required_monthly']:.2f} "
                    f"may be too aggressive. Consider adjusting your timeline or target amount."
                ),
                short_summary=f"'{goal.name}' at high risk",
                potential_savings=None,
                estimated_time_to_impact="This week",
                action_steps=json.dumps(action_steps),
                trigger_type="goal_high_risk",
                trigger_data=json.dumps({
                    "goal_id": str(goal.id),
                    "risk_level": analysis["risk_level"],
                    "feasibility_percentage": str(analysis["feasibility_percentage"])
                })
            )
            recommendations.append(rec)
        
        return recommendations

    @staticmethod
    def _create_savings_shortfall_recommendation(
        user_id: UUID,
        shortfall: Decimal,
        target_savings: Decimal
    ) -> Recommendation:
        """Create recommendation for savings shortfall."""
        action_steps = [
            f"Reduce discretionary spending by ₹{shortfall:.2f}",
            "Review and cancel unused subscriptions",
            "Cut back on dining out or entertainment",
            "Transfer saved amount directly to savings account"
        ]
        
        return Recommendation(
            user_id=user_id,
            category=RecommendationCategory.SAVINGS,
            impact=RecommendationImpact.HIGH,
            status=RecommendationStatus.NEW,
            title=f"Increase savings by ₹{shortfall:.2f} to meet target",
            description=(
                f"You're currently ₹{shortfall:.2f} short of your savings target of "
                f"₹{target_savings:.2f}. Finding ways to reduce spending and increase "
                f"savings will help you build a stronger financial foundation."
            ),
            short_summary=f"Savings shortfall of ₹{shortfall:.2f}",
            potential_savings=shortfall,
            estimated_time_to_impact="This month",
            action_steps=json.dumps(action_steps),
            trigger_type="savings_shortfall",
            trigger_data=json.dumps({
                "shortfall": str(shortfall),
                "target_savings": str(target_savings)
            })
        )

    @staticmethod
    def get_active_recommendations(
        user_id: UUID,
        db: Session,
        category: Optional[RecommendationCategory] = None,
        limit: Optional[int] = None
    ) -> List[Recommendation]:
        """
        Get active (non-dismissed, non-implemented) recommendations for a user.
        
        Args:
            user_id: User ID
            db: Database session
            category: Optional category filter
            limit: Optional limit
        
        Returns:
            List of active recommendations (sorted by priority)
        """
        query = (
            db.query(Recommendation)
            .filter(
                and_(
                    Recommendation.user_id == user_id,
                    Recommendation.status.in_([
                        RecommendationStatus.NEW,
                        RecommendationStatus.SNOOZED
                    ])
                )
            )
        )
        
        if category:
            query = query.filter(Recommendation.category == category)
        
        # Exclude snoozed recommendations if snooze period hasn't expired
        query = query.filter(
            or_(
                Recommendation.snoozed_until.is_(None),
                Recommendation.snoozed_until <= datetime.now()
            )
        )
        
        recommendations = query.all()
        
        # Prioritize and limit
        recommendations = RecommendationEngine.prioritize_recommendations(recommendations)
        
        if limit:
            recommendations = recommendations[:limit]
        
        return recommendations

    @staticmethod
    def dismiss_recommendation(
        recommendation_id: UUID,
        user_id: UUID,
        db: Session,
        reason: Optional[str] = None
    ) -> Optional[Recommendation]:
        """
        Dismiss a recommendation.
        
        Args:
            recommendation_id: Recommendation ID
            user_id: User ID (for security)
            db: Database session
            reason: Optional dismissal reason
        
        Returns:
            Updated recommendation or None if not found
        """
        rec = (
            db.query(Recommendation)
            .filter(
                and_(
                    Recommendation.id == recommendation_id,
                    Recommendation.user_id == user_id
                )
            )
            .first()
        )
        
        if not rec:
            return None
        
        rec.status = RecommendationStatus.DISMISSED
        rec.dismissal_reason = reason
        rec.dismiss_count = (rec.dismiss_count or 0) + 1
        db.commit()
        
        logger.info(f"Dismissed recommendation {recommendation_id}")
        return rec

    @staticmethod
    def implement_recommendation(
        recommendation_id: UUID,
        user_id: UUID,
        db: Session
    ) -> Optional[Recommendation]:
        """
        Mark recommendation as implemented.
        
        Args:
            recommendation_id: Recommendation ID
            user_id: User ID (for security)
            db: Database session
        
        Returns:
            Updated recommendation or None if not found
        """
        rec = (
            db.query(Recommendation)
            .filter(
                and_(
                    Recommendation.id == recommendation_id,
                    Recommendation.user_id == user_id
                )
            )
            .first()
        )
        
        if not rec:
            return None
        
        rec.status = RecommendationStatus.IMPLEMENTED
        rec.implemented_at = datetime.now()
        db.commit()
        
        logger.info(f"Implemented recommendation {recommendation_id}")
        return rec

    @staticmethod
    def snooze_recommendation(
        recommendation_id: UUID,
        user_id: UUID,
        db: Session,
        days: int = 7
    ) -> Optional[Recommendation]:
        """
        Snooze a recommendation for a specified number of days.
        
        Args:
            recommendation_id: Recommendation ID
            user_id: User ID (for security)
            db: Database session
            days: Number of days to snooze (default 7)
        
        Returns:
            Updated recommendation or None if not found
        """
        rec = (
            db.query(Recommendation)
            .filter(
                and_(
                    Recommendation.id == recommendation_id,
                    Recommendation.user_id == user_id
                )
            )
            .first()
        )
        
        if not rec:
            return None
        
        rec.status = RecommendationStatus.SNOOZED
        rec.snoozed_until = datetime.now() + timedelta(days=days)
        db.commit()
        
        logger.info(f"Snoozed recommendation {recommendation_id} for {days} days")
        return rec
