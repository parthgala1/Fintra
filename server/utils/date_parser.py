"""
Date parsing utility for various date formats.

Handles multiple date formats commonly found in bank statements.
"""

import re
from datetime import datetime, date
from typing import Optional

import dateutil.parser


# Common date formats found in bank statements
DATE_FORMATS = [
    "%Y-%m-%d",           # 2024-01-15
    "%d-%m-%Y",           # 15-01-2024
    "%m-%d-%Y",           # 01-15-2024
    "%d/%m/%Y",           # 15/01/2024
    "%m/%d/%Y",           # 01/15/2024
    "%d.%m.%Y",           # 15.01.2024
    "%m.%d.%Y",           # 01.15.2024
    "%Y/%m/%d",           # 2024/01/15
    "%Y.%m.%d",           # 2024.01.15
    "%d %b %Y",           # 15 Jan 2024
    "%d %B %Y",           # 15 January 2024
    "%b %d, %Y",          # Jan 15, 2024
    "%B %d, %Y",          # January 15, 2024
    "%d-%b-%Y",           # 15-Jan-2024
    "%d/%b/%Y",           # 15/Jan/2024
]


def parse_date(date_str: str) -> Optional[datetime]:
    """
    Parse a date string into a datetime object.
    
    Tries multiple formats and falls back to dateutil parser.
    
    Args:
        date_str: Date string to parse
    
    Returns:
        datetime object or None if parsing fails
    """
    if not date_str:
        return None
    
    # Clean the input
    date_str = str(date_str).strip()
    
    # Try standard formats first
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    
    # Fall back to dateutil parser (handles many variations)
    try:
        return dateutil.parser.parse(date_str, dayfirst=False)
    except (ValueError, TypeError):
        pass
    
    # Try with dayfirst=True for ambiguous formats
    try:
        return dateutil.parser.parse(date_str, dayfirst=True)
    except (ValueError, TypeError):
        pass
    
    return None


def detect_date_format(date_str: str) -> str:
    """
    Detect the format of a date string.
    
    Args:
        date_str: Date string to analyze
    
    Returns:
        Format string or "unknown" if detection fails
    """
    if not date_str:
        return "unknown"
    
    date_str = str(date_str).strip()
    
    # Check each format
    for fmt in DATE_FORMATS:
        try:
            datetime.strptime(date_str, fmt)
            return fmt
        except ValueError:
            continue
    
    return "unknown"


def normalize_date_string(date_str: str) -> str:
    """
    Normalize a date string to ISO format (YYYY-MM-DD).
    
    Args:
        date_str: Date string to normalize
    
    Returns:
        ISO format date string or original if parsing fails
    """
    parsed = parse_date(date_str)
    
    if parsed:
        return parsed.strftime("%Y-%m-%d")
    
    return date_str


def parse_date_to_date(date_str: str) -> Optional[date]:
    """
    Parse a date string into a date object (without time).
    
    Args:
        date_str: Date string to parse
    
    Returns:
        date object or None if parsing fails
    """
    parsed = parse_date(date_str)
    
    if parsed:
        return parsed.date()
    
    return None


def is_valid_date(date_str: str) -> bool:
    """
    Check if a string is a valid date.
    
    Args:
        date_str: Date string to validate
    
    Returns:
        True if valid, False otherwise
    """
    return parse_date(date_str) is not None
