"""
File parser service for parsing bank statement files.

Supports PDF, CSV, XLS, XLSX, and any table format.
"""

import logging
import os
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
from dateutil import parser as date_parser

logger = logging.getLogger(__name__)

# Extended column mappings for Indian and international bank statements
DATE_COLUMNS = [
    # English variations
    "date", "transaction_date", "posting_date", "trans_date", "value_date",
    "post_date", "transaction date", "posting date", "date time", "datetime",
    "trn date", "txn date", "value date", "trans. date", "date/posted",
    # Hindi/Regional (common Indian bank terms)
    "दिनांक", "तारीख", "dt", "dt.",
    # Other international
    "fecha", "datum", "dat", "dato", "tarih", "ημερομηνία"
]

DESCRIPTION_COLUMNS = [
    "description", "memo", "narrative", "details", "particulars",
    "transaction_description", "transaction details", "narration", "remarks",
    "reference", "ref", "particular", "cheque no", "chq no", "instrument no",
    "desc", "transaction", "transaction details", "details of transaction",
    # Hindi/Regional
    "विवरण", "विवरण/साखा", "narration"
]

AMOUNT_COLUMNS = [
    "amount", "debit", "credit", "withdrawal", "deposit",
    "transaction_amount", "amount_inr", "value", "sum", "total",
    "transaction amount", "inr", "rs", "₹"
]

DEBIT_COLUMNS = [
    "debit", "withdrawal", "debit_amount", "dr", "debit rs", "withdrawal rs",
    "amount debited", "debit amount", "debited", "withdrawals"
]

CREDIT_COLUMNS = [
    "credit", "deposit", "credit_amount", "cr", "credit rs", "deposit rs",
    "amount credited", "credit amount", "credited", "deposits"
]

# Date patterns to detect date-like data
DATE_PATTERNS = [
    r"\d{1,2}/\d{1,2}/\d{2,4}",           # DD/MM/YYYY or MM/DD/YYYY
    r"\d{1,2}-\d{1,2}-\d{2,4}",           # DD-MM-YYYY
    r"\d{1,2}\.\d{1,2}\.\d{2,4}",         # DD.MM.YYYY
    r"\d{4}-\d{2}-\d{2}",                  # YYYY-MM-DD
    r"\d{1,2}/\d{1,2}/\d{2}",             # Short year
    r"\d{1,2}-[A-Za-z]{3}-\d{2,4}",       # DD-Mon-YYYY
    r"[A-Za-z]{3}\s+\d{1,2},?\s+\d{4}",   # Mon DD, YYYY
    r"\d{1,2}\s+[A-Za-z]{3}\s+\d{4}",     # DD Mon YYYY
]


def detect_file_type(filename: str) -> str:
    """Detect file type from filename."""
    ext = os.path.splitext(filename)[1].lower()
    
    if ext == ".pdf":
        return "pdf"
    elif ext == ".csv":
        return "csv"
    elif ext == ".xlsx":
        return "xlsx"
    elif ext == ".xls":
        return "xls"
    else:
        return "unknown"


def find_column(df: pd.DataFrame, possible_names: List[str]) -> Optional[str]:
    """Find a column in the dataframe from a list of possible names."""
    for name in possible_names:
        # Try exact match
        if name in df.columns:
            return name
        # Try case-insensitive match
        for col in df.columns:
            if col.lower().strip() == name.lower():
                return col
            # Try partial match (column contains the name)
            if name.lower() in col.lower():
                return col
    return None


def parse_file(file_path: str, file_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """Parse a bank statement file and extract transactions."""
    if file_type is None:
        file_type = detect_file_type(file_path)
    
    logger.info(f"Parsing file: {file_path}, type: {file_type}")
    
    if file_type == "csv":
        return parse_csv(file_path)
    elif file_type == "xlsx":
        return parse_xlsx(file_path)
    elif file_type == "xls":
        return parse_xls(file_path)
    elif file_type == "pdf":
        return parse_pdf(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")


def parse_csv(file_path: str) -> List[Dict[str, Any]]:
    """Parse a CSV bank statement."""
    logger.info(f"Parsing CSV file: {file_path}")
    
    # Try different encodings
    encodings = ["utf-8", "latin-1", "cp1252", "iso-8859-1", "utf-16"]
    df = None
    
    for encoding in encodings:
        try:
            df = pd.read_csv(file_path, encoding=encoding)
            break
        except (UnicodeDecodeError, pd.errors.ParserError):
            continue
    
    if df is None:
        raise ValueError(f"Could not read CSV file with any encoding: {file_path}")
    
    return _extract_transactions_flexible(df)


def parse_xlsx(file_path: str) -> List[Dict[str, Any]]:
    """Parse an XLSX bank statement."""
    logger.info(f"Parsing XLSX file: {file_path}")
    
    # Read all sheets and find the one with transactions
    excel_file = pd.ExcelFile(file_path)
    
    df = None
    for sheet_name in excel_file.sheet_names:
        temp_df = pd.read_excel(file_path, sheet_name=sheet_name)
        if _has_useful_data(temp_df):
            df = temp_df
            logger.info(f"Found transaction sheet: {sheet_name}")
            break
    
    if df is None:
        # Try first sheet
        df = pd.read_excel(file_path, sheet_name=0)
    
    return _extract_transactions_flexible(df)


def parse_xls(file_path: str) -> List[Dict[str, Any]]:
    """Parse an XLS bank statement."""
    logger.info(f"Parsing XLS file: {file_path}")
    
    # First, try to detect if this is an HDFC bank statement
    df_raw = pd.read_excel(file_path, sheet_name=0, engine="xlrd", header=None)
    
    # Check for HDFC signature in first few rows
    is_hdfc = False
    for idx in range(min(5, len(df_raw))):
        row_text = " ".join([str(v) for v in df_raw.iloc[idx].values if pd.notna(v)])
        if "HDFC BANK" in row_text.upper():
            is_hdfc = True
            logger.info("Detected HDFC Bank statement format")
            break
    
    if is_hdfc:
        return _parse_hdfc_statement(df_raw)
    
    # Fallback to standard parsing
    excel_file = pd.ExcelFile(file_path, engine="xlrd")
    
    df = None
    for sheet_name in excel_file.sheet_names:
        temp_df = pd.read_excel(file_path, sheet_name=sheet_name, engine="xlrd")
        if _has_useful_data(temp_df):
            df = temp_df
            logger.info(f"Found transaction sheet: {sheet_name}")
            break
    
    if df is None:
        df = pd.read_excel(file_path, sheet_name=0, engine="xlrd")
    
    return _extract_transactions_flexible(df)


def parse_pdf(file_path: str) -> List[Dict[str, Any]]:
    """Parse a PDF bank statement using OCR service."""
    logger.info(f"Parsing PDF file: {file_path}")
    
    from services.ocr_service import extract_tables_from_pdf
    
    return extract_tables_from_pdf(file_path)


def _has_useful_data(df: pd.DataFrame) -> bool:
    """Check if dataframe has potentially useful data for transactions."""
    if df is None or len(df) < 2:
        return False
    
    # Check if there's at least some numeric data (amounts)
    for col in df.columns:
        if df[col].dtype in ['float64', 'int64']:
            return True
    
    return True


def _find_date_column_flexible(df: pd.DataFrame) -> Tuple[Optional[str], Optional[pd.Series]]:
    """
    Flexibly find a date column by checking both column names and actual data patterns.
    
    Returns:
        Tuple of (column_name, extracted_dates_series)
    """
    # First try column name matching
    date_col = find_column(df, DATE_COLUMNS)
    if date_col:
        return date_col, None
    
    # Check each column for date-like data
    for col in df.columns:
        sample_values = df[col].dropna().head(10)
        if len(sample_values) == 0:
            continue
            
        # Check if values look like dates
        date_count = 0
        for val in sample_values:
            if _looks_like_date(val):
                date_count += 1
        
        if date_count >= len(sample_values) * 0.5:  # At least 50% look like dates
            logger.info(f"Found date-like column: {col}")
            return col, None
    
    # Last resort: try parsing first column as dates
    if len(df.columns) > 0:
        first_col = df.columns[0]
        sample_values = df[first_col].dropna().head(5)
        parsed_dates = []
        for val in sample_values:
            try:
                parsed = date_parser.parse(str(val), fuzzy=True)
                parsed_dates.append(parsed)
            except:
                break
        
        if len(parsed_dates) >= len(sample_values) * 0.5:
            logger.info(f"Using first column as date: {first_col}")
            return first_col, None
    
    return None, None


def _looks_like_date(value: Any) -> bool:
    """Check if a value looks like a date."""
    if pd.isna(value):
        return False
    
    value_str = str(value).strip()
    
    # Check against regex patterns
    for pattern in DATE_PATTERNS:
        if re.search(pattern, value_str):
            return True
    
    # Try parsing
    try:
        date_parser.parse(value_str, fuzzy=False)
        return True
    except:
        pass
    
    try:
        date_parser.parse(value_str, fuzzy=True)
        return True
    except:
        pass
    
    return False


def _extract_transactions_flexible(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Flexibly extract transactions from any table format.
    """
    # Clean up the dataframe
    df = df.copy()
    
    # Remove completely empty rows
    df = df.dropna(how="all")
    
    # Skip header rows that might be empty or title rows
    # Find the first row that contains date-like data
    header_row = 0
    for idx, row in df.iterrows():
        row_str = " ".join([str(v) for v in row.values if pd.notna(v)])
        if _looks_like_date(row_str) or _has_date_in_row(row):
            header_row = idx
            break
    
    if header_row > 0:
        df = df.iloc[header_row:].reset_index(drop=True)
    
    # Remove empty rows again after header adjustment
    df = df.dropna(how="all")
    
    if len(df) == 0:
        raise ValueError("No data found in file")
    
    logger.info(f"Processing {len(df)} rows")
    
    # Find column mappings flexibly
    date_col, _ = _find_date_column_flexible(df)
    desc_col = find_column(df, DESCRIPTION_COLUMNS)
    amount_col = find_column(df, AMOUNT_COLUMNS)
    debit_col = find_column(df, DEBIT_COLUMNS)
    credit_col = find_column(df, CREDIT_COLUMNS)
    
    # If no description column found, use any non-date, non-amount column
    if desc_col is None:
        for col in df.columns:
            if col != date_col and col != amount_col and col != debit_col and col != credit_col:
                if df[col].dtype == 'object':
                    desc_col = col
                    break
    
    logger.info(f"Detected columns: date={date_col}, desc={desc_col}, amount={amount_col}, debit={debit_col}, credit={credit_col}")
    
    # If still no date column, try to use first column
    if date_col is None and len(df.columns) > 0:
        date_col = df.columns[0]
        logger.warning(f"No date column found, using first column: {date_col}")
    
    if date_col is None:
        raise ValueError("Could not find any date-like data in the file. Please ensure your file has date information.")
    
    transactions = []
    
    for idx, row in df.iterrows():
        try:
            transaction = _extract_transaction_flexible(
                row, date_col, desc_col, amount_col, debit_col, credit_col
            )
            if transaction:
                transactions.append(transaction)
        except Exception as e:
            logger.debug(f"Skipping row {idx}: {e}")
            continue
    
    if len(transactions) == 0:
        # Try even more flexible extraction
        logger.info("Standard extraction failed, trying fallback method")
        transactions = _extract_transactions_fallback(df)
    
    logger.info(f"Extracted {len(transactions)} transactions")
    return transactions


def _has_date_in_row(row: pd.Series) -> bool:
    """Check if a row contains any date-like value."""
    for val in row.values:
        if _looks_like_date(val):
            return True
    return False


def _extract_transaction_flexible(
    row: pd.Series,
    date_col: str,
    desc_col: Optional[str],
    amount_col: Optional[str],
    debit_col: Optional[str],
    credit_col: Optional[str],
) -> Optional[Dict[str, Any]]:
    """Extract a single transaction from a DataFrame row flexibly."""
    # Get date
    date_value = row.get(date_col)
    if pd.isna(date_value):
        return None
    
    # Try to parse the date
    parsed_date = None
    try:
        if isinstance(date_value, (datetime, pd.Timestamp)):
            parsed_date = date_value
        else:
            parsed_date = date_parser.parse(str(date_value), fuzzy=True)
    except:
        # Try regex extraction
        date_str = str(date_value)
        for pattern in DATE_PATTERNS:
            match = re.search(pattern, date_str)
            if match:
                try:
                    parsed_date = date_parser.parse(match.group(), fuzzy=True)
                    break
                except:
                    continue
        
        if parsed_date is None:
            return None
    
    # Get description - combine all non-numeric columns
    description_parts = []
    if desc_col:
        desc_value = row.get(desc_col)
        if pd.notna(desc_col):
            description_parts.append(str(desc_value).strip())
    
    # If no description found, combine all columns except date/amounts
    if not description_parts:
        for col in row.index:
            if col != date_col and col != amount_col and col != debit_col and col != credit_col:
                val = row.get(col)
                if pd.notna(val):
                    val_str = str(val).strip()
                    if val_str and val_str.lower() not in ['nan', 'none', '']:
                        description_parts.append(val_str)
    
    description = " ".join(description_parts) if description_parts else "Unknown Transaction"
    
    if not description or description.lower() in ['nan', 'none', 'unknown transaction']:
        return None
    
    # Get amount
    amount = None
    
    if amount_col:
        amount_value = row.get(amount_col)
        if pd.notna(amount_value):
            try:
                amount = float(str(amount_value).replace(',', '').replace('₹', '').replace('Rs', '').strip())
            except (ValueError, TypeError):
                pass
    
    # Check debit/credit columns
    if amount is None:
        debit = 0.0
        credit = 0.0
        
        if debit_col:
            debit_value = row.get(debit_col)
            if pd.notna(debit_value):
                try:
                    debit = abs(float(str(debit_value).replace(',', '').replace('₹', '').strip()))
                except (ValueError, TypeError):
                    pass
        
        if credit_col:
            credit_value = row.get(credit_col)
            if pd.notna(credit_value):
                try:
                    credit = abs(float(str(credit_value).replace(',', '').replace('₹', '').strip()))
                except (ValueError, TypeError):
                    pass
        
        if credit > 0:
            amount = credit
        elif debit > 0:
            amount = -debit
    
    # If still no amount, look for any numeric column
    if amount is None:
        for col in row.index:
            if col != date_col:
                val = row.get(col)
                if pd.notna(val):
                    try:
                        # Try to convert to float
                        test_val = float(str(val).replace(',', '').replace('₹', '').replace('-', '').strip())
                        if test_val != 0:
                            amount = test_val
                            # If it's in what seems like a debit column, make it negative
                            if 'debit' in str(col).lower() or 'withdrawal' in str(col).lower():
                                amount = -abs(amount)
                            break
                    except:
                        continue
    
    if amount is None:
        return None
    
    # Format the date
    try:
        date_str = parsed_date.strftime("%Y-%m-%d") if parsed_date else str(date_value)
    except:
        date_str = str(date_value)
    
    # Build transaction
    transaction = {
        "date": date_str,
        "description": description.strip(),
        "amount": amount,
    }
    
    return transaction


def _extract_transactions_fallback(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Fallback extraction method - tries to extract any structured data.
    """
    logger.info("Using fallback extraction method")
    transactions = []
    
    for idx, row in df.iterrows():
        try:
            # Get first column as date if possible
            date_val = row.iloc[0] if len(row) > 0 else None
            
            # Try to parse date
            try:
                if isinstance(date_val, (datetime, pd.Timestamp)):
                    date_str = date_val.strftime("%Y-%m-%d")
                else:
                    parsed = date_parser.parse(str(date_val), fuzzy=True)
                    date_str = parsed.strftime("%Y-%m-%d")
            except:
                date_str = str(date_val)
            
            # Combine all other columns as description
            description_parts = []
            for i in range(1, len(row)):
                val = row.iloc[i]
                if pd.notna(val):
                    val_str = str(val).strip()
                    if val_str and val_str.lower() not in ['nan', 'none', '']:
                        description_parts.append(val_str)
            
            description = " | ".join(description_parts) if description_parts else "Unknown"
            
            # Find any numeric value for amount
            amount = None
            for i in range(1, len(row)):
                val = row.iloc[i]
                if pd.notna(val):
                    try:
                        test_val = float(str(val).replace(',', '').replace('₹', '').replace('-', '').strip())
                        if test_val != 0:
                            amount = test_val
                            break
                    except:
                        continue
            
            if amount is not None:
                transactions.append({
                    "date": date_str,
                    "description": description,
                    "amount": amount
                })
        except Exception as e:
            logger.debug(f"Error in fallback row {idx}: {e}")
            continue
    
    return transactions


def _parse_hdfc_statement(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Parse HDFC Bank statement format.
    
    HDFC statements have a specific structure:
    - Header information in first ~20 rows
    - Column headers at row with 'Date', 'Narration', 'Withdrawal Amt.', 'Deposit Amt.', 'Closing Balance'
    - Transaction data follows
    - Summary rows at the end
    
    Expected columns:
    - Date (DD/MM/YY format)
    - Narration (transaction description)
    - Chq./Ref.No.
    - Value Dt
    - Withdrawal Amt. (debit)
    - Deposit Amt. (credit)
    - Closing Balance
    """
    logger.info("Parsing HDFC Bank statement format")
    
    # Find the header row with column names
    header_row_idx = None
    for idx in range(min(30, len(df))):
        row = df.iloc[idx]
        row_text = " ".join([str(v).lower() for v in row.values if pd.notna(v)])
        
        # Look for key column indicators
        if "date" in row_text and "narration" in row_text and ("withdrawal" in row_text or "deposit" in row_text):
            header_row_idx = idx
            logger.info(f"Found HDFC header row at index {idx}")
            break
    
    if header_row_idx is None:
        logger.warning("Could not find HDFC header row, falling back to standard parsing")
        return _extract_transactions_flexible(df)
    
    # Extract column names from header row
    header_row = df.iloc[header_row_idx]
    columns = []
    for val in header_row.values:
        if pd.notna(val):
            columns.append(str(val).strip())
        else:
            columns.append(f"col_{len(columns)}")
    
    # Create new dataframe starting from data rows (skip header and separator rows)
    data_start_idx = header_row_idx + 1
    
    # Skip separator rows (rows with asterisks or dashes)
    while data_start_idx < len(df):
        row_text = " ".join([str(v) for v in df.iloc[data_start_idx].values if pd.notna(v)])
        if not re.match(r'^[\*\-\s]+$', row_text):
            break
        data_start_idx += 1
    
    if data_start_idx >= len(df):
        logger.error("No transaction data found after header")
        return []
    
    # Create dataframe with proper columns
    transaction_df = df.iloc[data_start_idx:].copy()
    transaction_df.columns = range(len(transaction_df.columns))  # Reset to numeric indices
    
    # Map columns based on header
    col_mapping = {}
    for idx, col_name in enumerate(columns):
        col_name_lower = col_name.lower()
        if "date" in col_name_lower and "value" not in col_name_lower:
            col_mapping['date'] = idx
        elif "narration" in col_name_lower or "description" in col_name_lower:
            col_mapping['narration'] = idx
        elif "withdrawal" in col_name_lower:
            col_mapping['withdrawal'] = idx
        elif "deposit" in col_name_lower:
            col_mapping['deposit'] = idx
        elif "closing" in col_name_lower or "balance" in col_name_lower:
            col_mapping['balance'] = idx
        elif "chq" in col_name_lower or "ref" in col_name_lower:
            col_mapping['reference'] = idx
    
    logger.info(f"HDFC column mapping: {col_mapping}")
    
    # Extract transactions
    transactions = []
    for idx, row in transaction_df.iterrows():
        try:
            # Check if this is a valid transaction row (has a date)
            if 'date' not in col_mapping:
                continue
                
            date_value = row.iloc[col_mapping['date']]
            
            # Skip empty rows or summary rows
            if pd.isna(date_value):
                continue
            
            date_str = str(date_value).strip()
            
            # Skip rows that don't start with a date pattern
            if not re.match(r'\d{1,2}/\d{1,2}/\d{2}', date_str):
                continue
            
            # Parse date (HDFC uses DD/MM/YY format)
            try:
                parsed_date = date_parser.parse(date_str, dayfirst=True)
                # If year is in the future (2-digit year parsing issue), adjust it
                if parsed_date.year > datetime.now().year + 1:
                    parsed_date = parsed_date.replace(year=parsed_date.year - 100)
                date_formatted = parsed_date.strftime("%Y-%m-%d")
            except Exception as e:
                logger.warning(f"Could not parse date '{date_str}': {e}")
                continue
            
            # Get description/narration
            description = ""
            if 'narration' in col_mapping:
                desc_value = row.iloc[col_mapping['narration']]
                if pd.notna(desc_value):
                    description = str(desc_value).strip()
            
            if not description:
                description = "Unknown Transaction"
            
            # Get withdrawal (debit) amount
            withdrawal = None
            if 'withdrawal' in col_mapping:
                withdrawal_value = row.iloc[col_mapping['withdrawal']]
                if pd.notna(withdrawal_value):
                    try:
                        withdrawal = float(str(withdrawal_value).replace(',', '').strip())
                    except (ValueError, TypeError):
                        pass
            
            # Get deposit (credit) amount
            deposit = None
            if 'deposit' in col_mapping:
                deposit_value = row.iloc[col_mapping['deposit']]
                if pd.notna(deposit_value):
                    try:
                        deposit = float(str(deposit_value).replace(',', '').strip())
                    except (ValueError, TypeError):
                        pass
            
            # Determine final amount
            # Credit (deposit) = positive, Debit (withdrawal) = negative
            amount = None
            if deposit is not None and deposit > 0:
                amount = deposit
            elif withdrawal is not None and withdrawal > 0:
                amount = -withdrawal
            
            if amount is None:
                logger.debug(f"Row {idx}: No valid amount found (withdrawal={withdrawal}, deposit={deposit})")
                continue
            
            # Get reference number if available
            reference = ""
            if 'reference' in col_mapping:
                ref_value = row.iloc[col_mapping['reference']]
                if pd.notna(ref_value):
                    reference = str(ref_value).strip()
            
            # Build transaction
            transaction = {
                "date": date_formatted,
                "description": description,
                "amount": amount,
            }
            
            if reference and reference != "0" and not reference.startswith("000000000000"):
                transaction["reference"] = reference
            
            transactions.append(transaction)
            logger.debug(f"Extracted: {date_formatted} | {description[:50]} | {amount}")
            
        except Exception as e:
            logger.debug(f"Error parsing row {idx}: {e}")
            continue
    
    logger.info(f"Extracted {len(transactions)} transactions from HDFC statement")
    return transactions
