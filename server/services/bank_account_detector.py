"""
Bank account detector service for detecting bank from statement.

Analyzes statement content to identify the bank and account type.
"""

import logging
import re
from typing import Any, Dict, List, Optional
from datetime import datetime
from decimal import Decimal

from models.bank_account import AccountType

logger = logging.getLogger(__name__)

# Known Indian bank names and their identifiers
KNOWN_BANKS = {
    "sbi": ["state bank", "sbi", "statebank"],
    "hdfc": ["hdfc", "hdfc bank"],
    "icici": ["icici", "icici bank"],
    "axis": ["axis bank", "axis"],
    "kotak": ["kotak", "kotak bank"],
    "indusind": ["indusind", "indusind bank"],
    "pnb": ["punjab national bank", "pnb"],
    "bank of baroda": ["bank of baroda", "bob"],
    "canara": ["canara bank"],
    "union bank": ["union bank"],
    "yes bank": ["yes bank", "yesbank"],
    "idfc": ["idfc first", "idfc"],
    "rbl": ["rbl bank"],
    "federal": ["federal bank"],
    "south indian": ["south indian bank", "sib"],
    "city union": ["city union bank"],
    "au small finance": ["au small finance", "au bank"],
    "paytm": ["paytm bank"],
    "airtel": ["airtel payments bank"],
    "india post": ["india post payments bank", "post office"],
}


def detect_bank_from_statement(
    file_path: str,
    transactions: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """
    Detect bank and account information from statement content.
    
    Args:
        file_path: Path to the statement file
        transactions: List of extracted transactions
    
    Returns:
        Dictionary with detected bank info or None
    """
    logger.info(f"Detecting bank from statement: {file_path}")
    
    # Try to extract text from the file
    try:
        # Read first few lines to look for bank name
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            first_lines = []
            for _ in range(20):
                line = f.readline()
                if not line:
                    break
                first_lines.append(line)
        
        text = " ".join(first_lines)
        
        # Extract institution name
        institution_name = extract_institution_name(text)
        
        if institution_name:
            logger.info(f"Detected bank: {institution_name}")
            return {
                "institution_name": institution_name,
                "account_type": detect_account_type(transactions),
            }
    except Exception as e:
        logger.error(f"Error detecting bank from statement: {e}")
    
    return None


def extract_institution_name(text: str) -> Optional[str]:
    """
    Extract institution name from statement text.
    
    Args:
        text: Statement text
    
    Returns:
        Detected institution name or None
    """
    text_lower = text.lower()
    
    # Check against known banks
    for bank_name, keywords in KNOWN_BANKS.items():
        for keyword in keywords:
            if keyword in text_lower:
                # Return the proper bank name
                return bank_name.title()
    
    # Try to extract from common patterns
    # Pattern: "Bank Name Bank" or "Bank Name Limited"
    patterns = [
        r"([A-Z][a-zA-Z\s]+(?:Bank|Limited|Finance|Payments\s*Bank))",
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1).strip()
    
    return None


def detect_account_type(transactions: List[Dict[str, Any]]) -> AccountType:
    """
    Detect account type based on transaction patterns.
    
    Args:
        transactions: List of transactions
    
    Returns:
        Detected AccountType
    """
    # Count transaction types
    credit_count = 0
    debit_count = 0
    
    # Common salary/income keywords
    income_keywords = ["salary", "salary credit", "inward", "neft credit", "imps credit"]
    
    # Common credit card keywords
    credit_card_keywords = ["credit card", "cc payment", "card payment", "visa", "mastercard"]
    
    has_income = False
    has_credit_card_payment = False
    
    for txn in transactions:
        description = txn.get("description", "").lower()
        amount = txn.get("amount", 0)
        
        # Check for income
        for keyword in income_keywords:
            if keyword in description and amount > 0:
                has_income = True
                credit_count += 1
                break
        
        # Check for credit card payments
        for keyword in credit_card_keywords:
            if keyword in description:
                has_credit_card_payment = True
                break
        
        if amount > 0:
            credit_count += 1
        else:
            debit_count += 1
    
    # Heuristics for account type detection
    if has_credit_card_payment:
        return AccountType.CREDIT_CARD
    
    # If mostly credits with income keywords, likely salary account (checking)
    if has_income and credit_count > debit_count:
        return AccountType.CHECKING
    
    # Default to checking
    return AccountType.CHECKING


def extract_account_number(text: str) -> Optional[str]:
    """
    Extract account number from statement text.
    
    Args:
        text: Statement text
    
    Returns:
        Masked account number or None
    """
    # Pattern: Account Number: XXXX or A/C: XXXX
    patterns = [
        r"(?:account|a/c|ac)\s*(?:no|number|#)?[:\s]*([\d*]{8,20})",
        r"(?:account|a/c|ac)\s*(?:no|number|#)?[:\s]*([\d]+[\d*]+[\d]+)",
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1)
    
    return None


def extract_ifsc_code(text: str) -> Optional[str]:
    """
    Extract IFSC code from statement text.
    
    Args:
        text: Statement text
    
    Returns:
        IFSC code or None
    """
    # IFSC pattern: 11-character alphanumeric code
    pattern = r"\b([A-Z]{4}0[A-Z0-9]{6})\b"
    
    match = re.search(pattern, text)
    if match:
        return match.group(1)
    
    return None


def extract_balance_from_statement(
    file_path: str,
    transactions: List[Dict[str, Any]],
    parsed_data: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    """
    Extract closing/current balance from statement document.
    
    Args:
        file_path: Path to the statement file
        transactions: List of extracted transactions
        parsed_data: Pre-parsed statement data (optional)
    
    Returns:
        Dictionary with balance info or None:
        {
            "balance": float,
            "currency": str,  # "INR", "USD", etc.
            "balance_type": str,  # "closing", "current", "opening"
            "balance_date": datetime,
            "confidence": float,  # 0.0-1.0
        }
    """
    logger.info(f"Extracting balance from statement: {file_path}")
    
    try:
        # Try to extract text from the file
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        
        # If parsed_data is provided, use it for better accuracy
        if parsed_data and isinstance(parsed_data, dict):
            return _extract_balance_from_parsed_data(parsed_data, content)
        
        # Otherwise, try text-based extraction
        return _extract_balance_from_text(content, transactions)
    
    except Exception as e:
        logger.error(f"Error extracting balance from statement: {e}")
        return None


def _extract_balance_from_parsed_data(
    parsed_data: Dict[str, Any],
    text_content: str,
) -> Optional[Dict[str, Any]]:
    """
    Extract balance from pre-parsed structured data (from Excel/CSV parsing).
    
    Args:
        parsed_data: Parsed statement data
        text_content: Raw text content for fallback
    
    Returns:
        Balance dict or None
    """
    # Check if parsed_data has balance information in common locations
    # This is optimized for Excel files from file_parser.py
    
    balance_keywords = ["balance", "closing", "total", "closing balance", "current balance", "balance as on"]
    currency_pattern = r"(?:₹|INR|USD|\$|€|GBP|£)"
    
    for key, value in parsed_data.items():
        if isinstance(key, str):
            key_lower = key.lower()
            
            # Check if key contains balance keywords
            for keyword in balance_keywords:
                if keyword in key_lower:
                    # Try to extract numeric value
                    if isinstance(value, (int, float)):
                        return {
                            "balance": float(value),
                            "currency": _extract_currency_from_text(text_content),
                            "balance_type": "closing" if "closing" in key_lower else "current",
                            "balance_date": datetime.now(),
                            "confidence": 0.85,
                        }
                    elif isinstance(value, str):
                        # Try to parse numeric value from string
                        numeric_val = _extract_numeric_value(value)
                        if numeric_val is not None:
                            return {
                                "balance": numeric_val,
                                "currency": _extract_currency_from_text(text_content),
                                "balance_type": "closing" if "closing" in key_lower else "current",
                                "balance_date": datetime.now(),
                                "confidence": 0.80,
                            }
    
    # Fallback to text-based extraction
    return _extract_balance_from_text(text_content, [])


def _extract_balance_from_text(
    text: str,
    transactions: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """
    Extract balance using text pattern matching.
    
    Args:
        text: Text content from statement
        transactions: List of transactions (for validation)
    
    Returns:
        Balance dict or None
    """
    # Common patterns for balance in statements
    patterns = [
        r"(?:closing|current|balance)?\s*balance[:\s]+(?:₹\s*)?([0-9,]+\.?[0-9]*)",
        r"balance\s+as\s+on[:\s]+(?:₹\s*)?([0-9,]+\.?[0-9]*)",
        r"₹\s*([0-9,]+\.?[0-9]*)\s*(?:closing|current|balance)",
        r"total\s+balance[:\s]+(?:₹\s*)?([0-9,]+\.?[0-9]*)",
        r"(?:dr|cr)\s*balance[:\s]+(?:₹\s*)?([0-9,]+\.?[0-9]*)",
    ]
    
    text_lower = text.lower()
    highest_confidence = 0.0
    best_match = None
    
    for pattern in patterns:
        matches = re.finditer(pattern, text_lower)
        for match in matches:
            try:
                # Extract and clean the numeric value
                value_str = match.group(1).replace(",", "").strip()
                numeric_val = float(value_str)
                
                # Determine confidence based on pattern match
                confidence = 0.70
                if "closing" in match.group(0):
                    confidence = 0.85
                if "balance as on" in match.group(0):
                    confidence = 0.90
                
                if confidence > highest_confidence:
                    highest_confidence = confidence
                    best_match = {
                        "balance": numeric_val,
                        "currency": _extract_currency_from_text(text),
                        "balance_type": _determine_balance_type(match.group(0)),
                        "balance_date": datetime.now(),
                        "confidence": confidence,
                    }
            except (ValueError, AttributeError):
                continue
    
    if best_match and highest_confidence >= 0.70:
        logger.info(f"Extracted balance: {best_match['balance']} with confidence {highest_confidence}")
        return best_match
    
    logger.warning("Could not extract balance from statement text")
    return None


def extract_statement_date(
    file_path: str,
    transactions: List[Dict[str, Any]],
) -> Optional[datetime]:
    """
    Extract statement date/period from document.
    
    Args:
        file_path: Path to the statement file
        transactions: List of extracted transactions
    
    Returns:
        datetime for statement end date or None
    """
    logger.info(f"Extracting statement date from: {file_path}")
    
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        
        # Try to find statement date patterns
        date_patterns = [
            r"(?:statement|period)\s+(?:date|from|to)[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})",
            r"(?:as\s+on|as of)[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})",
            r"(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\s+(?:to|-)\s+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})",
        ]
        
        for pattern in date_patterns:
            matches = re.finditer(pattern, content, re.IGNORECASE)
            for match in matches:
                date_str = match.group(1)
                # If it's a range (group 2 exists), use the end date
                if match.lastindex and match.lastindex > 1:
                    date_str = match.group(2)
                
                # Try to parse the date
                parsed_date = _parse_date_string(date_str)
                if parsed_date:
                    logger.info(f"Extracted statement date: {parsed_date}")
                    return parsed_date
        
        # Fallback: Try to infer from transaction dates
        if transactions:
            return _infer_date_from_transactions(transactions)
    
    except Exception as e:
        logger.error(f"Error extracting statement date: {e}")
    
    return None


def _parse_date_string(date_str: str) -> Optional[datetime]:
    """
    Parse a date string with various formats.
    
    Args:
        date_str: Date string to parse
    
    Returns:
        Parsed datetime or None
    """
    date_formats = [
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%m/%d/%Y",
        "%m-%d-%Y",
        "%d/%m/%y",
        "%d-%m-%y",
        "%m/%d/%y",
        "%m-%d-%y",
        "%Y/%m/%d",
        "%Y-%m-%d",
        "%d %B %Y",
        "%d %b %Y",
        "%B %d, %Y",
        "%b %d, %Y",
    ]
    
    # Clean the date string
    date_str = date_str.strip()
    
    for fmt in date_formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    
    return None


def _infer_date_from_transactions(transactions: List[Dict[str, Any]]) -> Optional[datetime]:
    """
    Infer statement date from transaction dates (use the latest date).
    
    Args:
        transactions: List of transactions with dates
    
    Returns:
        Inferred date (latest transaction date) or None
    """
    latest_date = None
    
    for txn in transactions:
        if "date" in txn:
            date_val = txn["date"]
            if isinstance(date_val, datetime):
                if latest_date is None or date_val > latest_date:
                    latest_date = date_val
    
    return latest_date


def extract_account_details(
    file_path: str,
    transactions: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """
    Extract account details from statement (account number, IFSC, etc.)
    Uses existing functions, combine results.
    
    Args:
        file_path: Path to the statement file
        transactions: List of extracted transactions
    
    Returns:
        Dictionary with account details or None
    """
    logger.info(f"Extracting account details from: {file_path}")
    
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        
        details = {
            "account_number": extract_account_number(content),
            "ifsc_code": extract_ifsc_code(content),
            "institution_name": extract_institution_name(content),
            "account_type": detect_account_type(transactions),
        }
        
        logger.info(f"Extracted account details: {details}")
        return details
    
    except Exception as e:
        logger.error(f"Error extracting account details: {e}")
        return None


# Helper functions

def _extract_numeric_value(text: str) -> Optional[float]:
    """Extract numeric value from text string."""
    # Remove currency symbols and whitespace
    cleaned = re.sub(r"[₹\$€£,\s]", "", text)
    try:
        return float(cleaned)
    except ValueError:
        return None


def _extract_currency_from_text(text: str) -> str:
    """Extract currency code from text."""
    if "₹" in text or "inr" in text.lower():
        return "INR"
    elif "$" in text or "usd" in text.lower():
        return "USD"
    elif "€" in text or "eur" in text.lower():
        return "EUR"
    elif "£" in text or "gbp" in text.lower():
        return "GBP"
    
    return "INR"  # Default to INR


def _determine_balance_type(match_text: str) -> str:
    """Determine balance type from matched text."""
    text_lower = match_text.lower()
    if "closing" in text_lower:
        return "closing"
    elif "opening" in text_lower:
        return "opening"
    elif "current" in text_lower:
        return "current"
    
    return "closing"  # Default
