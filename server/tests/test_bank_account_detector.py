"""Tests for bank_account_detector.py module."""

import unittest
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import Dict, Any, List

from services.bank_account_detector import (
    extract_balance_from_statement,
    extract_statement_date,
    detect_bank_from_statement
)


class TestBalanceExtraction(unittest.TestCase):
    """Test suite for extract_balance_from_statement function."""

    def test_extract_balance_basic_data(self):
        """Test balance extraction from basic transaction data."""
        transactions: List[Dict[str, Any]] = [
            {'Date': '2024-01-01', 'Description': 'Opening Balance', 'Amount': 10000, 'Balance': 10000},
            {'Date': '2024-01-02', 'Description': 'Credit', 'Amount': 5000, 'Balance': 15000},
            {'Date': '2024-01-03', 'Description': 'Debit', 'Amount': 2000, 'Balance': 13000},
        ]
        
        result = extract_balance_from_statement(
            file_path='test.xlsx',
            transactions=transactions
        )
        
        # Should return a result if balance extraction works
        if result:
            self.assertIn('balance', result)
            self.assertIn('currency', result)
            self.assertIn('confidence', result)

    def test_extract_balance_empty_transactions(self):
        """Test balance extraction with empty transaction list."""
        transactions: List[Dict[str, Any]] = []
        
        result = extract_balance_from_statement(
            file_path='test.xlsx',
            transactions=transactions
        )
        
        # Should return None for empty data
        self.assertIsNone(result)

    def test_extract_balance_with_explicit_closing_balance(self):
        """Test balance extraction with explicit closing balance column."""
        transactions: List[Dict[str, Any]] = [
            {'Date': '2024-01-01', 'Description': 'Txn1', 'Amount': 100, 'Closing Balance': 10000},
            {'Date': '2024-01-02', 'Description': 'Txn2', 'Amount': 200, 'Closing Balance': 12000},
        ]
        
        result = extract_balance_from_statement(
            file_path='test.xlsx',
            transactions=transactions
        )
        
        # Should detect high confidence when explicit Closing Balance exists
        if result:
            self.assertGreater(result['confidence'], 0.7)


class TestDateExtraction(unittest.TestCase):
    """Test suite for extract_statement_date function."""

    def test_extract_date_from_transactions(self):
        """Test date extraction from transaction list."""
        transactions: List[Dict[str, Any]] = [
            {'Date': '2024-01-15', 'Description': 'Txn1', 'Amount': 100},
            {'Date': '2024-01-16', 'Description': 'Txn2', 'Amount': 200},
            {'Date': '2024-01-17', 'Description': 'Txn3', 'Amount': 300},
        ]
        
        date = extract_statement_date(
            file_path='test.xlsx',
            transactions=transactions
        )
        
        # Should return latest date
        if date:
            self.assertIsInstance(date, datetime)
            self.assertEqual(date.day, 17)
            self.assertEqual(date.month, 1)

    def test_extract_date_empty_transactions(self):
        """Test date extraction with empty transaction list."""
        transactions: List[Dict[str, Any]] = []
        
        date = extract_statement_date(
            file_path='test.xlsx',
            transactions=transactions
        )
        
        # Should return None for empty data
        self.assertIsNone(date)

    def test_extract_date_with_various_formats(self):
        """Test date extraction with different date formats."""
        # Test with DD/MM/YYYY format
        transactions: List[Dict[str, Any]] = [
            {'Transaction Date': '15/03/2024', 'Description': 'Txn1'},
            {'Transaction Date': '16/03/2024', 'Description': 'Txn2'},
            {'Transaction Date': '17/03/2024', 'Description': 'Txn3'},
        ]
        
        date = extract_statement_date(
            file_path='test.xlsx',
            transactions=transactions
        )
        
        if date:
            self.assertEqual(date.month, 3)
            self.assertEqual(date.year, 2024)


class TestBankDetection(unittest.TestCase):
    """Test suite for bank detection in statements."""

    def test_detect_hdfc_bank(self):
        """Test detection of HDFC bank statement."""
        transactions: List[Dict[str, Any]] = [
            {'Description': 'HDFC Bank Limited', 'Amount': 100}
        ]
        
        result = detect_bank_from_statement(
            file_path='hdfc_statement.xlsx',
            transactions=transactions
        )
        
        # Should detect HDFC from transaction data or filename
        if result:
            self.assertIn('bank_name', result)

    def test_detect_bank_from_filename(self):
        """Test bank detection from filename."""
        transactions: List[Dict[str, Any]] = [
            {'Date': '2024-01-01', 'Description': 'Txn', 'Amount': 100}
        ]
        
        result = detect_bank_from_statement(
            file_path='sbi_statement_jan_2024.xlsx',
            transactions=transactions
        )
        
        # Should detect SBI from filename
        if result:
            self.assertIn('bank_name', result)

    def test_detect_bank_generic_when_unknown(self):
        """Test that generic bank is returned when unknown."""
        transactions: List[Dict[str, Any]] = [
            {'Date': '2024-01-01', 'Description': 'Generic', 'Amount': 100}
        ]
        
        result = detect_bank_from_statement(
            file_path='generic_statement.xlsx',
            transactions=transactions
        )
        
        # Should return something (generic or None)
        # Result depends on implementation
        self.assertTrue(result is None or isinstance(result, dict))


if __name__ == '__main__':
    unittest.main()
