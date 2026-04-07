# Bank Account Detection Fix

## The Problem

When uploading a statement file, the system was creating a **"Default Account"** instead of detecting and creating the actual bank account from the statement.

### What Was Happening

1. ❌ User uploads a CSV statement from HDFC Bank
2. ❌ System detects "HDFC" from the transaction descriptions
3. ❌ But creates "Default Account" instead of "HDFC Account"
4. ❌ Result: `institution_name: null` in the database

### Root Cause

The bug was in `server/routers/upload.py` in the bank account detection logic:

**Before (Buggy Logic):**

```python
# Step 1: Get first active account (finds existing "Default Account")
bank_account = db.query(BankAccount).filter(...).first()

# Step 2: Detect bank from statement
bank_info = detect_bank_from_statement(...)  # Returns: {institution_name: "Hdfc", ...}

# Step 3: Check condition BEFORE creating new account
if not bank_account and bank_info.get("institution_name"):  # ❌ FALSE!
    # Create new account  # ❌ NEVER EXECUTES because bank_account already exists
```

**Why it failed:**

- Line 1: Query found existing "Default Account" → `bank_account = <DefaultAccount>`
- Line 2: Bank info detected successfully → `bank_info = {institution_name: "Hdfc"}`
- Line 3: Condition evaluated as `if not <DefaultAccount>` → **FALSE**
- Line 4: New HDFC account was never created
- Line 5: Existing "Default Account" was used instead

## The Solution

**After (Fixed Logic):**

```python
# Step 1: Get first active account (may get existing "Default Account")
bank_account = db.query(BankAccount).filter(...).first()

# Step 2: Detect bank from statement
bank_info = detect_bank_from_statement(...)  # Returns: {institution_name: "Hdfc", ...}

# Step 3: If bank was detected, look for matching account OR create new one
if bank_info and bank_info.get("institution_name"):
    # Look for existing account with this bank name
    detected_account = db.query(BankAccount).filter(
        BankAccount.institution_name.ilike(f"%{bank_info['institution_name']}%"),
        ...
    ).first()

    if detected_account:
        bank_account = detected_account  # Use existing
    else:
        bank_account = BankAccount(       # ✅ CREATE NEW with proper bank info
            account_name=f"{bank_info['institution_name']} Account",
            institution_name=bank_info.get("institution_name"),  # ✅ SET BANK NAME
            ...
        )
```

**Key improvements:**

1. ✅ Bank detection happens REGARDLESS of whether default account exists
2. ✅ New account is created WITH the detected bank `institution_name`
3. ✅ Won't overwrite existing default account (uses it only if no bank detected)
4. ✅ Log messages clearly show what happened

## What Now Happens

### Scenario 1: First Upload (No Account Yet)

```
1. Query finds no account → bank_account = None
2. Bank detection finds HDFC
3. ✅ Creates "HDFC Account" with institution_name="Hdfc"
4. Transactions imported to HDFC Account
```

### Scenario 2: Subsequent Upload from Different Bank

```
1. Query finds "HDFC Account" → bank_account = HdfcAccount
2. Bank detection finds SBI from new statement
3. ✅ Creates "SBI Account" with institution_name="Sbi"
4. Transactions imported to SBI Account
```

### Scenario 3: No Bank Detected (Generic CSV)

```
1. Query finds existing account or None
2. Bank detection returns None
3. ✅ Creates/Uses "Default Account"
4. Transactions imported to Default Account
```

## Testing the Fix

### Manual Test

1. Delete all your bank accounts
2. Upload a statement file (e.g., sample_transactions.csv with HDFC entries)
3. Check bank accounts API: `GET /api/bank-accounts`
4. Expected: Account should have `institution_name: "Hdfc"` ✅

### CLI Test

```bash
# Inside server directory
python -c "
from services.file_parser import parse_file
from services.bank_account_detector import detect_bank_from_statement

transactions = parse_file('../dev/samples/sample_transactions.csv', 'csv')
bank_info = detect_bank_from_statement('../dev/samples/sample_transactions.csv', transactions)
print(f'Detected bank: {bank_info}')
# Should output: Detected bank: {'institution_name': 'Hdfc', 'account_type': <AccountType.CREDIT_CARD: 'credit_card'>}
"
```

## Backend Restart

The fix was deployed with `docker-compose restart backend`. The backend is now running with the corrected logic.

## Files Modified

- **server/routers/upload.py** - Fixed bank account detection and creation logic (lines 248-297)

## Impact

✅ **Users will now get proper bank accounts with correct institution names from statement uploads instead of generic "Default Account"**

This enables:

- Better account organization (multiple banks)
- Proper transaction reconciliation
- Account-specific features and displays
