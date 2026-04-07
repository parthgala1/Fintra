"""
OCR service for extracting text and tables from PDF files.

Uses pdfplumber for text extraction and Tesseract for image-based PDFs.
"""

import logging
import os
import tempfile
from typing import Any, Dict, List, Optional

import pdfplumber

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_path: str) -> str:
    """
    Extract text from a PDF file using pdfplumber.
    
    Args:
        file_path: Path to the PDF file
    
    Returns:
        Extracted text
    """
    logger.info(f"Extracting text from PDF: {file_path}")
    
    text = ""
    
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {e}")
        # Fall back to OCR
        return extract_text_with_ocr(file_path)
    
    if not text.strip():
        logger.warning("No text extracted from PDF, falling back to OCR")
        return extract_text_with_ocr(file_path)
    
    return text


def extract_tables_from_pdf(file_path: str) -> List[Dict[str, Any]]:
    """
    Extract tables from a PDF bank statement.
    
    Uses pdfplumber for table extraction first, falls back to OCR if needed.
    
    Args:
        file_path: Path to the PDF file
    
    Returns:
        List of transaction dictionaries
    """
    logger.info(f"Extracting tables from PDF: {file_path}")
    
    transactions = []
    
    # Try pdfplumber first
    try:
        with pdfplumber.open(file_path) as pdf:
            for page_num, page in enumerate(pdf.pages):
                # Try to extract tables
                tables = page.extract_tables()
                
                if tables:
                    for table in tables:
                        table_transactions = _parse_pdf_table(table)
                        transactions.extend(table_transactions)
                else:
                    # Try to extract text and parse as transactions
                    text = page.extract_text()
                    if text:
                        text_transactions = _parse_pdf_text(text)
                        transactions.extend(text_transactions)
    except Exception as e:
        logger.error(f"Error extracting tables from PDF with pdfplumber: {e}")
    
    # If no transactions found, try OCR
    if not transactions:
        logger.info("No tables found, trying OCR extraction")
        transactions = extract_text_with_ocr_and_parse(file_path)
    
    # If still no transactions, try basic text parsing
    if not transactions:
        logger.info("Trying basic text extraction and parsing")
        text = extract_text_from_pdf(file_path)
        transactions = _parse_pdf_text(text)
    
    logger.info(f"Extracted {len(transactions)} transactions from PDF")
    return transactions


def process_with_tesseract(image_path: str) -> str:
    """
    Process an image with Tesseract OCR.
    
    Args:
        image_path: Path to the image file
    
    Returns:
        Extracted text
    """
    logger.info(f"Processing image with Tesseract: {image_path}")
    
    try:
        import pytesseract
        from PIL import Image
        
        # Check if Tesseract is available
        image = Image.open(image_path)
        text = pytesseract.image_to_string(image)
        
        return text
    except Exception as e:
        logger.error(f"Error processing with Tesseract: {e}")
        return ""


def extract_text_with_ocr(file_path: str) -> str:
    """
    Extract text from PDF using OCR (Tesseract).
    
    Args:
        file_path: Path to the PDF file
    
    Returns:
        Extracted text
    """
    logger.info(f"Extracting text from PDF with OCR: {file_path}")
    
    try:
        from pdf2image import convert_from_path
        
        # Convert PDF to images
        images = convert_from_path(file_path)
        
        text = ""
        for image in images:
            # Save image to temp file
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                image.save(tmp.name)
                page_text = process_with_tesseract(tmp.name)
                text += page_text + "\n"
                os.unlink(tmp.name)
        
        return text
    except Exception as e:
        logger.error(f"Error extracting text with OCR: {e}")
        return fallback_cloud_ocr(file_path)


def extract_text_with_ocr_and_parse(file_path: str) -> List[Dict[str, Any]]:
    """
    Extract text from PDF using OCR and parse as transactions.
    
    Args:
        file_path: Path to the PDF file
    
    Returns:
        List of transaction dictionaries
    """
    text = extract_text_with_ocr(file_path)
    return _parse_pdf_text(text)


def fallback_cloud_ocr(file_path: str) -> str:
    """
    Fallback to cloud OCR service if local OCR fails.
    
    This is a placeholder for cloud OCR integration (e.g., Google Cloud Vision,
    AWS Textract, Azure Form Recognizer).
    
    Args:
        file_path: Path to the PDF file
    
    Returns:
        Extracted text
    """
    logger.warning("Cloud OCR fallback not implemented")
    return ""


def _parse_pdf_table(table: List[List[str]]) -> List[Dict[str, Any]]:
    """
    Parse a PDF table into transaction dictionaries.
    
    Args:
        table: List of rows, each row is a list of cell values
    
    Returns:
        List of transaction dictionaries
    """
    if not table or len(table) < 2:
        return []
    
    # First row is likely the header
    header = table[0]
    
    # Try to identify columns
    date_col = None
    desc_col = None
    amount_col = None
    debit_col = None
    credit_col = None
    
    for idx, cell in enumerate(header):
        cell_lower = str(cell).lower().strip()
        
        if "date" in cell_lower:
            if date_col is None:
                date_col = idx
        elif "description" in cell_lower or "narrative" in cell_lower:
            desc_col = idx
        elif "amount" in cell_lower or "value" in cell_lower:
            amount_col = idx
        elif "debit" in cell_lower or "withdrawal" in cell_lower:
            debit_col = idx
        elif "credit" in cell_lower or "deposit" in cell_lower:
            credit_col = idx
    
    # Default to first columns if not found
    if date_col is None:
        date_col = 0
    if desc_col is None:
        desc_col = 1 if len(header) > 1 else 0
    if amount_col is None and debit_col is None and credit_col is None:
        amount_col = 2 if len(header) > 2 else (1 if len(header) > 1 else 0)
    
    transactions = []
    
    for row in table[1:]:
        if not row or len(row) <= max(date_col, desc_col or 0):
            continue
        
        date_value = row[date_col] if date_col < len(row) else None
        if not date_value:
            continue
        
        description = ""
        if desc_col is not None and desc_col < len(row):
            description = str(row[desc_col]).strip()
        
        if not description:
            continue
        
        # Get amount
        amount = None
        
        if amount_col is not None and amount_col < len(row):
            amount_str = row[amount_col]
            if amount_str:
                try:
                    # Remove currency symbols and commas
                    amount_str = str(amount_str).replace(",", "").replace("₹", "").replace("Rs", "").strip()
                    amount = float(amount_str)
                except (ValueError, TypeError):
                    pass
        
        if amount is None:
            # Try debit/credit columns
            debit = 0.0
            credit = 0.0
            
            if debit_col is not None and debit_col < len(row):
                debit_str = row[debit_col]
                if debit_str:
                    try:
                        debit_str = str(debit_str).replace(",", "").replace("₹", "").strip()
                        debit = abs(float(debit_str))
                    except (ValueError, TypeError):
                        pass
            
            if credit_col is not None and credit_col < len(row):
                credit_str = row[credit_col]
                if credit_str:
                    try:
                        credit_str = str(credit_str).replace(",", "").replace("₹", "").strip()
                        credit = abs(float(credit_str))
                    except (ValueError, TypeError):
                        pass
            
            if credit > 0:
                amount = credit
            elif debit > 0:
                amount = -debit
        
        if amount is None:
            continue
        
        transaction = {
            "date": date_value,
            "description": description,
            "amount": amount,
        }
        
        transactions.append(transaction)
    
    return transactions


def _parse_pdf_text(text: str) -> List[Dict[str, Any]]:
    """
    Parse extracted PDF text into transaction dictionaries.
    
    Uses regex patterns to find transaction-like lines.
    
    Args:
        text: Extracted text from PDF
    
    Returns:
        List of transaction dictionaries
    """
    import re
    from utils.date_parser import parse_date
    
    transactions = []
    
    # Common patterns for transaction lines
    # Pattern: Date Description Amount
    patterns = [
        # DD/MM/YYYY Description Amount
        r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+([\d,]+\.?\d*)\s*$",
        # DD Mon YYYY Description Amount
        r"(\d{1,2}\s+\w{3}\s+\d{2,4})\s+(.+?)\s+([\d,]+\.?\d*)\s*$",
    ]
    
    lines = text.split("\n")
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        for pattern in patterns:
            match = re.match(pattern, line, re.IGNORECASE)
            if match:
                date_str = match.group(1)
                description = match.group(2).strip()
                amount_str = match.group(3).replace(",", "").strip()
                
                try:
                    amount = float(amount_str)
                except ValueError:
                    continue
                
                date = parse_date(date_str)
                if date:
                    transactions.append({
                        "date": date,
                        "description": description,
                        "amount": amount,
                    })
                    break
    
    return transactions
