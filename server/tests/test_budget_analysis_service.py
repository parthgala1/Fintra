"""Unit tests for BudgetAnalysisService."""

import unittest
from datetime import date, datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from services.budget_analysis_service import BudgetAnalysisService


class TestBudgetAnalysisService(unittest.TestCase):
    """Test suite for BudgetAnalysisService core logic."""

    def test_assess_data_quality_thresholds(self):
        self.assertEqual(BudgetAnalysisService._assess_data_quality(0), "insufficient")
        self.assertEqual(BudgetAnalysisService._assess_data_quality(9), "insufficient")
        self.assertEqual(BudgetAnalysisService._assess_data_quality(10), "low")
        self.assertEqual(BudgetAnalysisService._assess_data_quality(49), "low")
        self.assertEqual(BudgetAnalysisService._assess_data_quality(50), "moderate")
        self.assertEqual(BudgetAnalysisService._assess_data_quality(99), "moderate")
        self.assertEqual(BudgetAnalysisService._assess_data_quality(100), "high")

    def test_validate_analysis_percentage_check(self):
        warnings = BudgetAnalysisService._validate_analysis(
            total_transactions=120,
            total_spending=Decimal("1000"),
            needs_pct=Decimal("60.00"),
            wants_pct=Decimal("30.00"),
            savings_pct=Decimal("12.00"),
        )

        self.assertTrue(any("exceed 100%" in msg for msg in warnings))

    def test_store_analysis_serializes_decimal_category_breakdown(self):
        db = MagicMock()

        analysis_data = {
            "analysis_start_date": date(2026, 1, 1),
            "analysis_end_date": date(2026, 4, 30),
            "total_spending": Decimal("39000.00"),
            "needs_total": Decimal("21000.00"),
            "wants_total": Decimal("12000.00"),
            "savings_total": Decimal("6000.00"),
            "needs_percentage": Decimal("53.85"),
            "wants_percentage": Decimal("30.77"),
            "savings_percentage": Decimal("15.38"),
            "category_breakdown": {
                "Needs": {
                    "Housing": {
                        "amount": Decimal("21000.00"),
                        "percentage": Decimal("53.85"),
                        "transaction_count": 2,
                    }
                },
                "Wants": {},
                "Savings": {},
            },
            "total_transactions": 6,
            "data_quality": "insufficient",
            "validation_warnings": [],
        }

        BudgetAnalysisService.store_analysis(
            db=db,
            user_id="user-1",
            budget_id=None,
            analysis_data=analysis_data,
        )

        stored_model = db.add.call_args[0][0]
        self.assertIsInstance(
            stored_model.category_breakdown["Needs"]["Housing"]["amount"],
            float,
        )
        self.assertEqual(
            stored_model.category_breakdown["Needs"]["Housing"]["amount"],
            21000.0,
        )

    @patch.object(BudgetAnalysisService, "_calculate_category_totals")
    @patch.object(BudgetAnalysisService, "_build_category_breakdown")
    def test_analyze_spending_date_range_before_budget_start(
        self,
        mock_breakdown,
        mock_totals,
    ):
        """Budget start date must be excluded from analysis period."""
        db = MagicMock()

        # Query 1: find first transaction date — pattern: .filter().scalar()
        min_query = MagicMock()
        min_query.filter.return_value.scalar.return_value = datetime(2026, 1, 1, 9, 0, 0)

        # Query 2: count expense transactions in budget categories — pattern: .join().filter().scalar()
        expense_count_query = MagicMock()
        expense_count_query.join.return_value.filter.return_value.scalar.return_value = 60

        # Query 3: count total budget-category transactions — pattern: .join().filter().scalar()
        total_tx_query = MagicMock()
        total_tx_query.join.return_value.filter.return_value.scalar.return_value = 60

        db.query.side_effect = [min_query, expense_count_query, total_tx_query]

        mock_totals.return_value = {
            "needs": Decimal("5000.00"),
            "wants": Decimal("3000.00"),
            "savings": Decimal("2000.00"),
        }
        mock_breakdown.return_value = {
            "Needs": {"Housing": {"amount": Decimal("5000.00"), "percentage": Decimal("50.00"), "icon": "", "color": "", "transaction_count": 10}},
            "Wants": {},
            "Savings": {},
        }

        result = BudgetAnalysisService.analyze_spending(
            db=db,
            user_id="user-1",
            budget_start_date=date(2026, 5, 1),
        )

        self.assertEqual(result["analysis_start_date"], date(2026, 1, 1))
        self.assertEqual(result["analysis_end_date"], date(2026, 4, 30))
        self.assertEqual(result["needs_percentage"], Decimal("50.00"))
        self.assertEqual(result["wants_percentage"], Decimal("30.00"))
        self.assertEqual(result["savings_percentage"], Decimal("20.00"))

    # ------------------------------------------------------------------
    # Net spending tests: _calculate_category_totals
    # ------------------------------------------------------------------

    def test_calculate_category_totals_subtracts_category_income(self):
        """Net = expenses − income per category type."""
        db = MagicMock()
        # 6 scalar calls in order: (expense, income) × (NEEDS, WANTS, SAVINGS)
        # NEEDS:   5000 expense − 500 income  → 4500 net
        # WANTS:   3000 expense − 1000 income → 2000 net
        # SAVINGS: 2000 expense − 0 income    → 2000 net
        db.query.return_value.join.return_value.filter.return_value.scalar.side_effect = [
            Decimal("5000"), Decimal("500"),
            Decimal("3000"), Decimal("1000"),
            Decimal("2000"), None,
        ]
        result = BudgetAnalysisService._calculate_category_totals(
            db=db,
            user_id="user-1",
            start_date=datetime(2026, 1, 1),
            end_date=datetime(2026, 4, 30),
        )
        self.assertEqual(result["needs"], Decimal("4500"))
        self.assertEqual(result["wants"], Decimal("2000"))
        self.assertEqual(result["savings"], Decimal("2000"))

    def test_calculate_category_totals_clamped_to_zero_when_income_exceeds_expense(self):
        """If category income > expenses (net negative), result is clamped to 0."""
        db = MagicMock()
        # NEEDS: 1000 expense, 1500 income → clamped to 0
        # WANTS: 500  expense, 0    income → 500
        # SAVINGS: 0  expense, 0    income → 0
        db.query.return_value.join.return_value.filter.return_value.scalar.side_effect = [
            Decimal("1000"), Decimal("1500"),
            Decimal("500"),  None,
            None,            None,
        ]
        result = BudgetAnalysisService._calculate_category_totals(
            db=db,
            user_id="user-1",
            start_date=datetime(2026, 1, 1),
            end_date=datetime(2026, 4, 30),
        )
        self.assertEqual(result["needs"], Decimal("0"))
        self.assertEqual(result["wants"], Decimal("500"))
        self.assertEqual(result["savings"], Decimal("0"))

    def test_calculate_category_totals_no_income_equals_gross(self):
        """When no income transactions exist, net equals gross expenses (unchanged)."""
        db = MagicMock()
        db.query.return_value.join.return_value.filter.return_value.scalar.side_effect = [
            Decimal("5000"), None,
            Decimal("3000"), None,
            Decimal("2000"), None,
        ]
        result = BudgetAnalysisService._calculate_category_totals(
            db=db,
            user_id="user-1",
            start_date=datetime(2026, 1, 1),
            end_date=datetime(2026, 4, 30),
        )
        self.assertEqual(result["needs"], Decimal("5000"))
        self.assertEqual(result["wants"], Decimal("3000"))
        self.assertEqual(result["savings"], Decimal("2000"))


if __name__ == "__main__":
    unittest.main()
