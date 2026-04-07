"""Tests for reconciliation_service.py module - Core Logic Tests."""

import unittest
from decimal import Decimal

from services.reconciliation_service import detect_balance_discrepancies


class TestDetectBalanceDiscrepancies(unittest.TestCase):
    """Test suite for detect_balance_discrepancies function."""

    def test_no_discrepancy_exact_match(self):
        """Test when calculated and extracted balances match exactly."""
        extracted_balance = Decimal('10000')
        calculated_balance = Decimal('10000')
        
        has_discrepancy = detect_balance_discrepancies(
            extracted_balance, calculated_balance, threshold_percentage=0.01
        )
        
        self.assertFalse(has_discrepancy)

    def test_small_discrepancy_within_threshold(self):
        """Test when discrepancy is within acceptable threshold (0.5%)."""
        extracted_balance = Decimal('1000000')
        calculated_balance = Decimal('1005000')  # 0.5% difference ($5000)
        
        has_discrepancy = detect_balance_discrepancies(
            extracted_balance, calculated_balance, threshold_percentage=0.01
        )
        
        # $5000 discrepancy exceeds $1 minimum, but let's test with percentage below threshold
        # Actually, 0.5% < 1%, so this should still be flagged due to amount threshold
        self.assertTrue(has_discrepancy)

    def test_large_discrepancy_percentage(self):
        """Test when discrepancy exceeds percentage threshold (5%)."""
        extracted_balance = Decimal('10000')
        calculated_balance = Decimal('10500')  # 5% difference
        
        has_discrepancy = detect_balance_discrepancies(
            extracted_balance, calculated_balance, threshold_percentage=0.01
        )
        
        self.assertTrue(has_discrepancy)

    def test_small_discrepancy_above_minimum_amount(self):
        """Test when discrepancy is above minimum amount threshold."""
        extracted_balance = Decimal('100')
        calculated_balance = Decimal('102')  # $2 difference (2% but > $1 minimum)
        
        has_discrepancy = detect_balance_discrepancies(
            extracted_balance, calculated_balance, threshold_percentage=0.01
        )
        
        # Over $1 minimum, so should be True
        self.assertTrue(has_discrepancy)

    def test_negative_discrepancy(self):
        """Test when extracted balance is less than calculated."""
        extracted_balance = Decimal('10000')
        calculated_balance = Decimal('9900')  # -1%
        
        has_discrepancy = detect_balance_discrepancies(
            extracted_balance, calculated_balance, threshold_percentage=0.01
        )
        
        self.assertTrue(has_discrepancy)

    def test_zero_balance_discrepancy(self):
        """Test discrepancy when calculated balance is zero."""
        extracted_balance = Decimal('100')
        calculated_balance = Decimal('0')
        
        has_discrepancy = detect_balance_discrepancies(
            extracted_balance, calculated_balance, threshold_percentage=0.01
        )
        
        # Should check amount threshold when calculated is zero
        self.assertTrue(has_discrepancy)

    def test_both_balances_zero(self):
        """Test when both balances are zero (perfect match)."""
        extracted_balance = Decimal('0')
        calculated_balance = Decimal('0')
        
        has_discrepancy = detect_balance_discrepancies(
            extracted_balance, calculated_balance, threshold_percentage=0.01
        )
        
        self.assertFalse(has_discrepancy)

    def test_very_small_discrepancy_below_minimum(self):
        """Test when discrepancy is below minimum $1."""
        extracted_balance = Decimal('10000')
        calculated_balance = Decimal('10000.50')  # $0.50 difference
        
        has_discrepancy = detect_balance_discrepancies(
            extracted_balance, calculated_balance, threshold_percentage=0.01
        )
        
        # Below $1 minimum and low percentage
        self.assertFalse(has_discrepancy)


if __name__ == '__main__':
    unittest.main()
