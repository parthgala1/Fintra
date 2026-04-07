"""
Upload API router.

Provides endpoints for file upload and processing.
"""

import logging
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Optional
from decimal import Decimal

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from auth.router import get_current_user
from config import settings
from database import get_db
from models.bank_account import BankAccount
from models.transaction import Transaction, TransactionStatus, TransactionType
from models.upload_history import UploadHistory, UploadSource, UploadStatus
from models.user import User
from schemas.upload import (
    UploadHistoryListResponse,
    UploadHistoryResponse,
    UploadInitResponse,
    UploadResultResponse,
    UploadStatusResponse,
)
from services.bank_account_detector import (
    detect_bank_from_statement,
    extract_balance_from_statement,
    extract_statement_date,
)
from services.reconciliation_service import reconcile_account_balance
from services.classification_engine import classify_transaction, batch_ai_classification
from services.file_parser import detect_file_type, parse_file
from services.transaction_normalizer import (
    generate_transaction_hash,
    normalize_transaction,
)

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/upload", tags=["Upload"])

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# In-memory storage for upload status (use Redis in production)
upload_statuses: dict = {}


def get_current_user_dep(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    """Dependency to get current authenticated user."""
    return get_current_user(token, db)


@router.post("/initiate", response_model=UploadInitResponse)
def initiate_upload(
    source: str = "csv",
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Initiate a file upload process.
    
    Args:
        source: Upload source (csv, pdf, etc.)
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Upload ID and status
    """
    # Validate source
    try:
        upload_source = UploadSource(source.lower())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid source: {source}. Valid sources: {[s.value for s in UploadSource]}",
        )
    
    # Create upload history record
    upload_history = UploadHistory(
        user_id=current_user.id,
        source=upload_source,
        status=UploadStatus.PENDING,
    )
    
    db.add(upload_history)
    db.commit()
    db.refresh(upload_history)
    
    logger.info(f"Upload initiated: {upload_history.id} by user {current_user.id}")
    
    return UploadInitResponse(
        upload_id=upload_history.id,
        status=upload_history.status,
        message="Upload initiated. Please upload the file.",
    )


@router.post("/{upload_id}/process", response_model=UploadResultResponse)
async def process_upload(
    upload_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Process an uploaded file.
    
    Args:
        upload_id: Upload ID from initiate endpoint
        file: Uploaded file
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Upload result with statistics
    """
    # Get upload history
    upload_history = (
        db.query(UploadHistory)
        .filter(
            UploadHistory.id == upload_id,
            UploadHistory.user_id == current_user.id,
        )
        .first()
    )
    
    if not upload_history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload not found",
        )
    
    # Check if already processed
    if upload_history.status == UploadStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Upload already processed",
        )
    
    # Update status to processing
    upload_history.status = UploadStatus.PROCESSING
    upload_history.processing_started_at = datetime.now(timezone.utc)
    
    # Get file info
    file_name = file.filename
    file_type = detect_file_type(file_name)
    
    if file_type == "unknown":
        upload_history.status = UploadStatus.FAILED
        upload_history.error_message = "Unsupported file type"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Supported: PDF, CSV, XLS, XLSX",
        )
    
    upload_history.file_name = file_name
    upload_history.file_type = file_type
    
    # Get file size
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > settings.MAX_FILE_SIZE:
        upload_history.status = UploadStatus.FAILED
        upload_history.error_message = f"File too large. Max size: {settings.MAX_FILE_SIZE} bytes"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {settings.MAX_FILE_SIZE / 1024 / 1024}MB",
        )
    
    upload_history.file_size = file_size
    
    # Save file to temp location
    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, f"{upload_id}_{file_name}")
    
    try:
        # Write file
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        logger.info(f"File saved: {file_path}")
        
        # Parse file
        raw_transactions = parse_file(file_path, file_type)
        upload_history.total_transactions = len(raw_transactions)
        
        logger.info(f"Parsed {len(raw_transactions)} raw transactions")
        
        # Extract balance and statement date from file (NEW)
        extracted_balance = None
        statement_date = None
        balance_extraction_attempted = False
        
        try:
            balance_extraction_attempted = True
            balance_info = extract_balance_from_statement(file_path, raw_transactions)
            if balance_info:
                extracted_balance = Decimal(str(balance_info.get("balance", 0)))
                statement_date = balance_info.get("balance_date")
                logger.info(f"Extracted balance: {extracted_balance}, date: {statement_date}")
            
            # Also extract statement date if not already done
            if not statement_date:
                statement_date = extract_statement_date(file_path, raw_transactions)
                if statement_date:
                    logger.info(f"Extracted statement date: {statement_date}")
        
        except Exception as e:
            logger.warning(f"Error extracting balance/date from statement: {e}")
            # Don't fail the upload if extraction fails, it's optional
            balance_extraction_attempted = True
        
        upload_history.balance_extraction_attempted = balance_extraction_attempted
        if extracted_balance:
            upload_history.statement_balance_extracted = extracted_balance
        if statement_date:
            upload_history.statement_date_from_file = statement_date
        
    except Exception as e:
        logger.error(f"Error parsing file: {e}")
        upload_history.status = UploadStatus.FAILED
        upload_history.error_message = f"Error parsing file: {str(e)}"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error parsing file: {str(e)}",
        )
    
    # Initialize bank account as None (will be set based on bank detection)
    bank_account = None
    
    # Try to detect bank from statement
    try:
        logger.info(f"Attempting to detect bank from statement file: {file_path}")
        bank_info = detect_bank_from_statement(file_path, raw_transactions)
        logger.info(f"Bank detection result: {bank_info}")
        
        if bank_info and bank_info.get("institution_name"):
            logger.info(f"Bank detected: {bank_info['institution_name']}")
            # Try to find matching account by institution name
            detected_account = (
                db.query(BankAccount)
                .filter(
                    BankAccount.user_id == current_user.id,
                    BankAccount.institution_name.ilike(f"%{bank_info['institution_name']}%"),
                    BankAccount.is_active == True,  # noqa: E712
                )
                .first()
            )
            
            if detected_account:
                # Use the existing account with matching bank
                bank_account = detected_account
                # Update balance if we extracted one from the statement
                if extracted_balance:
                    bank_account.current_balance = extracted_balance
                logger.info(f"Found existing account for {bank_info['institution_name']}: {bank_account.id}, balance updated to {extracted_balance}")
            else:
                # Create new account for the detected bank
                bank_account = BankAccount(
                    user_id=current_user.id,
                    account_name=f"{bank_info['institution_name']} Account",
                    account_type=bank_info.get("account_type", "checking"),
                    institution_name=bank_info.get("institution_name"),
                    current_balance=extracted_balance,  # Set balance from extracted data
                    is_connected=False,
                )
                db.add(bank_account)
                db.commit()
                db.refresh(bank_account)
                logger.info(f"Created new bank account for {bank_info['institution_name']}: {bank_account.id} with balance {extracted_balance}")
        else:
            logger.info(f"No bank detected from statement (bank_info={bank_info}), will use default account")
    except Exception as e:
        logger.error(f"Error detecting bank from statement: {e}", exc_info=True)
        # Continue and use default account
    
    # If no account was created from bank detection, try to get existing account or create default
    if not bank_account:
        # Try to get first active account
        bank_account = (
            db.query(BankAccount)
            .filter(
                BankAccount.user_id == current_user.id,
                BankAccount.is_active == True,  # noqa: E712
            )
            .first()
        )
    
    # If still no account, create a default one
    if not bank_account:
        bank_account = BankAccount(
            user_id=current_user.id,
            account_name="Default Account",
            account_type="checking",
            current_balance=extracted_balance,  # Set balance from extracted data if available
            is_connected=False,
        )
        db.add(bank_account)
        db.commit()
        db.refresh(bank_account)
        logger.info(f"Created default account: {bank_account.id} with balance {extracted_balance}")
    
    # Commit any bank account changes (e.g., balance update for existing accounts)
    db.commit()
    
    upload_history.bank_account_id = bank_account.id
    
    # Pre-process all transactions to identify duplicates and prepare for batch classification
    # This prevents wasting AI API calls on known duplicates
    duplicate_indices = set()  # Indices of duplicate transactions
    normalized_for_batch = []  # Transactions to send to batch AI
    index_to_batch_index = {}  # Map original index -> batch index
    batch_classifications = {}  # Map batch_index -> category_id
    
    logger.info(f"Pre-processing {len(raw_transactions)} transactions for duplicate detection and batch classification")
    
    for tx_index, raw_txn in enumerate(raw_transactions):
        try:
            normalized = normalize_transaction(raw_txn)
            
            # Check for duplicate
            existing = (
                db.query(Transaction)
                .filter(
                    Transaction.user_id == current_user.id,
                    Transaction.transaction_date == normalized["transaction_date"],
                    Transaction.amount == normalized["amount"],
                    Transaction.description == normalized["description"],
                )
                .first()
            )
            
            if existing:
                duplicate_indices.add(tx_index)
                logger.debug(f"Duplicate detected at index {tx_index}")
            else:
                # Track this non-duplicate for batch classification
                batch_index = len(normalized_for_batch)
                index_to_batch_index[tx_index] = batch_index
                normalized["_batch_index"] = batch_index  # Add batch index to transaction
                normalized_for_batch.append(normalized)
        
        except Exception as e:
            logger.warning(f"Error pre-processing transaction at index {tx_index}: {e}")
            # On error, mark as duplicate-like to skip it
            duplicate_indices.add(tx_index)
    
    # Call batch AI classification if enabled and we have non-duplicate transactions
    if settings.AI_BATCH_ENABLED and len(normalized_for_batch) > 0:
        logger.info(f"Using batch AI classification for {len(normalized_for_batch)} non-duplicate transactions (out of {len(raw_transactions)} total, {len(duplicate_indices)} duplicates)")
        try:
            batch_classifications = batch_ai_classification(
                db=db,
                transactions=normalized_for_batch,
                user_id=current_user.id,
            )
            logger.info(f"Batch classification completed: {len(batch_classifications)} classifications returned")
        except Exception as e:
            logger.error(f"Error in batch classification: {e}. Will fall back to individual classification.")
            batch_classifications = {}
    
    # Process transactions
    imported_count = 0
    duplicate_count = 0
    skipped_count = 0
    failed_count = 0
    
    start_date = None
    end_date = None
    
    for tx_index, raw_txn in enumerate(raw_transactions):
        try:
            # Skip if marked as duplicate in pre-processing
            if tx_index in duplicate_indices:
                duplicate_count += 1
                continue
            
            # Normalize transaction
            normalized = normalize_transaction(raw_txn)
            
            # Classify transaction - use batch result if available
            category_id = None
            
            # Check if we have a batch classification for this transaction
            if tx_index in index_to_batch_index:
                batch_index = index_to_batch_index[tx_index]
                if str(batch_index) in batch_classifications:
                    category_id = batch_classifications[str(batch_index)]
                    logger.debug(f"Using batch classification for transaction {tx_index}")
            
            # Fall back to individual classification if no batch result
            if not category_id:
                category_id = classify_transaction(
                    db=db,
                    transaction=normalized,
                    user_id=current_user.id,
                )
            
            # Create transaction
            transaction = Transaction(
                user_id=current_user.id,
                bank_account_id=bank_account.id,
                category_id=category_id,
                original_description=normalized["original_description"],
                description=normalized["description"],
                merchant_name=normalized.get("merchant_name"),
                amount=normalized["amount"],
                transaction_type=normalized["transaction_type"],
                status=TransactionStatus.POSTED,
                transaction_date=normalized["transaction_date"],
                posted_date=normalized.get("posted_date"),
            )
            
            db.add(transaction)
            imported_count += 1
            
            # Track date range
            txn_date = normalized["transaction_date"]
            if start_date is None or txn_date < start_date:
                start_date = txn_date
            if end_date is None or txn_date > end_date:
                end_date = txn_date
            
        except Exception as e:
            logger.warning(f"Error processing transaction: {e}")
            failed_count += 1
            continue
    
    # Commit all transactions
    db.commit()
    
    # Update upload history
    upload_history.imported_transactions = imported_count
    upload_history.duplicate_transactions = duplicate_count
    upload_history.skipped_transactions = skipped_count
    upload_history.failed_transactions = failed_count
    upload_history.start_date = start_date
    upload_history.end_date = end_date
    upload_history.status = UploadStatus.COMPLETED
    upload_history.processing_completed_at = datetime.now(timezone.utc)
    
    if upload_history.processing_started_at:
        duration = (
            upload_history.processing_completed_at - upload_history.processing_started_at
        ).total_seconds()
        upload_history.processing_duration_seconds = int(duration)
    
    db.commit()
    
    # Perform reconciliation if balance was extracted (NEW)
    reconciliation_status = None
    balance_discrepancy = None
    
    if extracted_balance and statement_date:
        try:
            logger.info(f"Starting reconciliation for account {bank_account.id}")
            reconciliation_result = reconcile_account_balance(
                db=db,
                bank_account_id=bank_account.id,
                extracted_balance=extracted_balance,
                statement_date=statement_date,
            )
            
            if "status" in reconciliation_result and reconciliation_result["status"] != "error":
                reconciliation_status = reconciliation_result["status"]
                balance_discrepancy = reconciliation_result.get("discrepancy_amount")
                
                # Update bank account with reconciliation info
                bank_account.statement_balance = extracted_balance
                bank_account.statement_date = statement_date
                bank_account.reconciliation_status = reconciliation_result["status"]
                bank_account.balance_discrepancy_amount = Decimal(str(balance_discrepancy)) if balance_discrepancy else None
                bank_account.last_reconciled_at = datetime.now(timezone.utc)
                bank_account.last_statement_document_id = str(upload_id)
                
                # Update upload history
                upload_history.reconciliation_status = reconciliation_status
                
                logger.info(f"Reconciliation completed: {reconciliation_status}, Discrepancy: {balance_discrepancy}")
            else:
                logger.warning(f"Reconciliation error: {reconciliation_result.get('error')}")
        
        except Exception as e:
            logger.error(f"Error during reconciliation: {e}")
            # Don't fail the upload if reconciliation fails, it's optional
    
    db.commit()
    
    # Clean up uploaded file
    try:
        os.remove(file_path)
    except Exception:
        pass
    
    # Log API call count for this upload
    from services.classification_engine import get_api_call_count, reset_api_call_count
    api_calls = get_api_call_count()
    logger.info(f"Upload classification used {api_calls} Groq API calls for {imported_count} transactions")
    reset_api_call_count()
    
    logger.info(
        f"Upload completed: {upload_id}. "
        f"Imported: {imported_count}, Duplicates: {duplicate_count}, "
        f"Skipped: {skipped_count}, Failed: {failed_count}"
    )
    
    return UploadResultResponse(
        upload_id=upload_id,
        status=upload_history.status,
        file_name=upload_history.file_name or "",
        file_type=upload_history.file_type or "",
        total_transactions=upload_history.total_transactions or 0,
        imported_transactions=imported_count,
        skipped_transactions=skipped_count,
        duplicate_transactions=duplicate_count,
        failed_transactions=failed_count,
        start_date=start_date,
        end_date=end_date,
        processing_duration_seconds=upload_history.processing_duration_seconds or 0,
        statement_balance_extracted=float(extracted_balance) if extracted_balance else None,
        statement_date_extracted=statement_date,
        reconciliation_status=reconciliation_status,
        balance_discrepancy=balance_discrepancy,
    )


@router.get("/{upload_id}/status", response_model=UploadStatusResponse)
def get_upload_status(
    upload_id: uuid.UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Get upload processing status.
    
    Args:
        upload_id: Upload ID
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Upload status details
    """
    upload_history = (
        db.query(UploadHistory)
        .filter(
            UploadHistory.id == upload_id,
            UploadHistory.user_id == current_user.id,
        )
        .first()
    )
    
    if not upload_history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload not found",
        )
    
    return upload_history


@router.get("/history", response_model=UploadHistoryListResponse)
def list_upload_history(
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    List upload history.
    
    Args:
        page: Page number
        page_size: Items per page
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        List of upload history
    """
    query = (
        db.query(UploadHistory)
        .filter(UploadHistory.user_id == current_user.id)
        .order_by(UploadHistory.created_at.desc())
    )
    
    total = query.count()
    
    offset = (page - 1) * page_size
    uploads = query.offset(offset).limit(page_size).all()
    
    return UploadHistoryListResponse(
        uploads=uploads,
        total=total,
    )
