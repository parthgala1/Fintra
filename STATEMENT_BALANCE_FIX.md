# Statement Balance Persistence Fix

## The Problem

Even though the backend was correctly detecting HDFC Bank statements and extracting the balance, the data wasn't being **saved to the database**:

```json
{
  "institution_name": null, // ❌ Not saved
  "current_balance": "0.00", // ❌ Not saved
  "account_name": "Default Account" // ❌ Wrong name
}
```

**Logs showed:**

```
Detected HDFC Bank statement format ✓
Parsing HDFC Bank statement format ✓
Found HDFC header row at index 20 ✓
Extracted balance: 50000.00 ✓
```

But the account still had `institution_name: null` and `current_balance: 0.00`.

## Root Cause

In `server/routers/upload.py`, the balance extraction was happening correctly, but it **wasn't being saved to the `BankAccount` record**:

**Before (Buggy):**

```python
# Extract balance ✓
extracted_balance = extract_balance_from_statement(...)  # Returns: Decimal('50000.00')

# Try to find or create bank account
if bank_info:
    if detected_account:
        bank_account = detected_account  # ❌ Use existing, but don't update balance
    else:
        bank_account = BankAccount(     # ❌ Create new, but don't include balance
            institution_name=...,
            # Missing: current_balance=extracted_balance
        )
```

The extracted balance was calculated but never used!

## The Solution

### 1. **Save Balance When Creating New Account**

```python
bank_account = BankAccount(
    user_id=current_user.id,
    account_name=f"{bank_info['institution_name']} Account",
    institution_name=bank_info.get("institution_name"),
    current_balance=extracted_balance,  # ✅ NOW SET!
)
```

### 2. **Update Balance When Account Exists**

```python
if detected_account:
    bank_account = detected_account
    if extracted_balance:
        bank_account.current_balance = extracted_balance  # ✅ NOW UPDATED!
```

### 3. **Set Balance for Default Account**

```python
if not bank_account:
    bank_account = BankAccount(
        account_name="Default Account",
        current_balance=extracted_balance,  # ✅ NOW SET!
    )
```

### 4. **Commit Changes**

```python
# Commit any bank account changes before processing transactions
db.commit()
```

## What Now Happens

### Upload Flow

```
1. Parse statement file
   ↓
2. Detect bank from statement     → "Hdfc"
   ↓
3. Extract balance from statement → Decimal('50000.00')
   ↓
4. Create/update bank account WITH balance
   ↓
5. Save to database
   ↓
✅ Account has: institution_name="Hdfc", current_balance=50000.00
```

### Expected Result After Upload

**API Response: `GET /api/bank-accounts`**

```json
{
  "accounts": [
    {
      "id": "53f0e12b-...",
      "account_name": "HDFC Account",
      "institution_name": "Hdfc", // ✅ NOW POPULATED!
      "account_type": "credit_card",
      "current_balance": "50000.00", // ✅ NOW POPULATED!
      "is_connected": false,
      "created_at": "2026-04-06T10:00:00Z"
    }
  ],
  "total": 1
}
```

## Files Modified

**server/routers/upload.py**

- Line 277: Added `current_balance=extracted_balance` when creating new account
- Line 280: Added balance update for existing accounts
- Line 283: Updated log message to show balance
- Line 299: Added `current_balance=extracted_balance` for default account
- Line 306: Added `db.commit()` to save bank account changes

## Testing the Fix

### Manual Test

1. Delete all bank accounts from your database
2. Upload an HDFC Bank statement (or any statement with "HDFC" in transactions)
3. Check bank accounts API: `GET /api/bank-accounts`
4. Expected:
   - `institution_name: "Hdfc"` ✓
   - `current_balance: <extracted amount>` ✓

### Verification Queries

```bash
# Check bank account details
docker-compose exec postgres psql -U fintra_user -d fintra_db -c \
  "SELECT account_name, institution_name, current_balance FROM bank_accounts LIMIT 5;"

# Should show:
# account_name       | institution_name | current_balance
# HDFC Account       | Hdfc             | 50000.00
```

### Log Messages After Fix

```
Extracted balance: 50000.00, date: 2026-04-06
Created new bank account for Hdfc: <id> with balance 50000.00
  OR
Found existing account for Hdfc: <id>, balance updated to 50000.00
```

## Impact

✅ **Users now see:**

- Bank name displayed in accounts list
- Current balance from statement shown in dashboard
- Proper account identification for multiple banks
- Balance updates on each statement upload

## Future Enhancements

1. **Balance History** - Maintain historical balance records
2. **Balance Reconciliation** - Compare calculated vs statement balance
3. **Statement Recognition** - Detect statement format and extraction period
4. **Multi-Account Detection** - Extract multiple accounts from single statement
