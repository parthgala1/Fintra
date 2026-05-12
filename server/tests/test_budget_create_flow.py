"""Integration-oriented tests for Phase 1 budget create flow helpers."""

import unittest
from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock

from services.budget_analysis_service import BudgetAnalysisService


class TestBudgetCreateFlow(unittest.TestCase):
    """Tests for storing and linking analysis records."""

    def test_store_analysis_persists_record(self):
        db = MagicMock()
        db.refresh.side_effect = lambda obj: setattr(obj, "id", "analysis-123")

        analysis_data = {
            "analysis_start_date": date(2026, 1, 1),
            "analysis_end_date": date(2026, 4, 30),
            "total_spending": Decimal("10000.00"),
            "needs_total": Decimal("5000.00"),
            "wants_total": Decimal("3000.00"),
            "savings_total": Decimal("2000.00"),
            "needs_percentage": Decimal("50.00"),
            "wants_percentage": Decimal("30.00"),
            "savings_percentage": Decimal("20.00"),
            "category_breakdown": {"Needs": {}, "Wants": {}, "Savings": {}},
            "total_transactions": 42,
            "data_quality": "low",
            "validation_warnings": [],
        }

        analysis = BudgetAnalysisService.store_analysis(
            db=db,
            user_id="user-1",
            budget_id=None,
            analysis_data=analysis_data,
        )

        self.assertEqual(analysis.user_id, "user-1")
        self.assertEqual(analysis.total_spending, Decimal("10000.00"))
        db.add.assert_called_once()
        db.commit.assert_called_once()

    def test_link_analysis_to_budget_sets_budget_id(self):
        db = MagicMock()
        analysis = MagicMock()
        analysis.budget_id = None

        BudgetAnalysisService.link_analysis_to_budget(
            db=db,
            analysis=analysis,
            budget_id="budget-1",
        )

        self.assertEqual(analysis.budget_id, "budget-1")
        db.commit.assert_called_once()
        db.refresh.assert_called_once_with(analysis)


if __name__ == "__main__":
    unittest.main()
