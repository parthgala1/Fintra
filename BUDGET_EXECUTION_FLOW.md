# Budget Management - Execution Flow Guide

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    BUDGET LIFECYCLE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. CREATE BUDGET          2. ADD TRANSACTIONS     3. VIEW REPORT │
│  ├─ Set total amount       ├─ Auto-categorize      ├─ Summary    │
│  ├─ Set period (monthly)   ├─ Link to categories   ├─ Per-cat    │
│  ├─ 50/30/20 split         └─ Trigger recalc       └─ Deviations │
│  └─ Initialize allocations                                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## PHASE 1: Budget Creation

### Step 1.1: Create Budget (POST /api/budgets)
```
{
  "name": "May 2026 Budget",
  "total_budget": 10000,
  "period": "monthly",
  "needs_percentage": 50,
  "wants_percentage": 30,
  "savings_percentage": 20,
  "start_date": "2026-05-01",
  "end_date": "2026-05-31"
}
```

### What Happens:
1. **Budget model created** with:
   - Total: 10,000
   - Needs: 5,000 (50%)
   - Wants: 3,000 (30%)
   - Savings: 2,000 (20%)

2. **Budget allocations initialized**:
   - System looks up all user's active categories (Needs, Wants, Savings)
   - Creates `budget_categories` rows with even split within each type:
     ```
     NEEDS categories (e.g., 5 categories):
     - Groceries: 1,000
     - Utilities: 1,000
     - Rent: 1,000
     - Insurance: 1,000
     - Phone: 1,000
     
     WANTS categories (e.g., 3 categories):
     - Entertainment: 1,000
     - Dining Out: 1,000
     - Shopping: 1,000
     
     SAVINGS categories (e.g., 2 categories):
     - Emergency Fund: 1,000
     - Investments: 1,000
     ```

### Database State After Creation:
```
budgets table:
├─ id: abc123
├─ user_id: user1
├─ total_budget: 10,000
├─ needs_amount: 5,000
├─ wants_amount: 3,000
├─ savings_amount: 2,000
└─ period: monthly

budget_categories table (allocations):
├─ budget_id: abc123, category_id: groceries, budgeted_amount: 1,000
├─ budget_id: abc123, category_id: utilities, budgeted_amount: 1,000
├─ budget_id: abc123, category_id: rent, budgeted_amount: 1,000
└─ ... (total 10 rows, one per category)
```

---

## PHASE 2: Transaction Flow & Auto-Recalculation

### Step 2.1: Create a Transaction (POST /api/transactions)
```
{
  "date": "2026-05-15",
  "description": "Whole Foods",
  "amount": 120,
  "category_id": "groceries-cat-id",
  "type": "expense"
}
```

### What Happens:

#### A. Transaction is stored
```
transactions table:
├─ id: txn1
├─ user_id: user1
├─ category_id: groceries-cat-id
├─ amount: 120
├─ date: 2026-05-15
├─ type: "expense"
└─ status: "posted"
```

#### B. Determine affected budget
System checks: "Is 2026-05-15 within any budget period for this user?"
- Finds budget with period 2026-05-01 to 2026-05-31 ✓

#### C. Trigger automatic recalculation (within routers/transaction.py)
```python
# On transaction create/update/delete:
def _trigger_report_recalculation(user_id, transaction_date, category_id):
    # Find budget containing this date
    budget = find_budget_for_date(user_id, transaction_date)
    
    if budget:
        # Recalculate report for that budget
        BudgetReportRecalculationService.recalculate(
            budget_id=budget.id,
            period_start=budget.start_date,
            period_end=budget.end_date
        )
```

---

## PHASE 3: Report Recalculation (Core Logic)

### Step 3.1: Aggregate Actuals
Service fetches all transactions in period, grouped by category type:

```python
SELECT 
  categories.category_type,
  SUM(transactions.amount) as total
FROM transactions
JOIN categories ON transactions.category_id = categories.id
WHERE 
  transactions.user_id = 'user1'
  AND transactions.date BETWEEN '2026-05-01' AND '2026-05-31'
  AND transactions.type = 'expense'
  AND categories.category_type IN ('NEEDS', 'WANTS', 'SAVINGS')
GROUP BY categories.category_type
```

**Result:**
```
NEEDS:    2,500 (e.g., groceries 120 + utilities 200 + ... = 2,500)
WANTS:    800   (e.g., dining 300 + entertainment 500)
SAVINGS:  500   (e.g., 500 to emergency fund)
─────────────────
TOTAL:    3,800 spent of 10,000 budgeted
```

### Step 3.2: Calculate Summary Statistics
```
budgeted_needs:        5,000
actual_needs:          2,500
needs_deviation:       +2,500 (under budget ✓)
needs_percentage_used: 50%

budgeted_wants:        3,000
actual_wants:          800
wants_deviation:       +2,200 (under budget ✓)
wants_percentage_used: 27%

budgeted_savings:      2,000
actual_savings:        500
savings_deviation:     +1,500 (under budget ✓)
savings_percentage_used: 25%

──────────────────────────────────────────
total_budgeted:        10,000
total_spent:           3,800
is_over_budget:        false
remaining_budget:      6,200
last_calculated_at:    2026-05-13 12:34:56
```

### Step 3.3: Update or Create Report
```
budget_reports table:
├─ id: report1
├─ budget_id: abc123
├─ period_start: 2026-05-01
├─ period_end: 2026-05-31
├─ total_budgeted: 10,000
├─ total_spent: 3,800
├─ remaining_budget: 6,200
├─ last_calculated_at: 2026-05-13 12:34:56
├─ is_over_budget: false
└─ summary: "You're on track! You've spent $3,800 of $10,000 budgeted. $6,200 remaining."
```

### Step 3.4: Generate Per-Category Breakdowns
For each category in `budget_categories`, create a `budget_category_breakdown`:

```
budget_category_breakdown table:
├─ id: bd1, category: Groceries,    budgeted: 1,000, actual: 120, deviation: +880
├─ id: bd2, category: Utilities,    budgeted: 1,000, actual: 200, deviation: +800
├─ id: bd3, category: Rent,         budgeted: 1,000, actual: 1,200, deviation: -200 (OVER!)
├─ id: bd4, category: Entertainment, budgeted: 1,000, actual: 500, deviation: +500
└─ ... (one row per category in budget_categories)
```

**Key Insight:** The `budgeted_amount` comes from `budget_categories.budgeted_amount`, NOT calculated fresh every time.

---

## PHASE 4: Frontend Display

### Step 4.1: User visits Budget Detail Page
```
GET /api/budgets/{budget_id}
GET /api/budgets/{budget_id}/reports/current
```

### Step 4.2: Frontend Receives Report
```json
{
  "id": "report1",
  "budget_id": "abc123",
  "total_budgeted": 10000,
  "total_spent": 3800,
  "remaining_budget": 6200,
  "last_calculated_at": "2026-05-13T12:34:56Z",
  "is_over_budget": false,
  "summary": "You're on track!...",
  "category_breakdown": [
    {
      "category_id": "groceries-id",
      "category_name": "Groceries",
      "category_type": "needs",
      "budgeted_amount": 1000,
      "actual_amount": 120,
      "deviation": 880,
      "deviation_percentage": 88,
      "transaction_count": 3
    },
    ...
  ]
}
```

### Step 4.3: UI Renders
- **Summary Card**: Shows "You're on track!" with remaining $6,200
- **Category Grid**: Shows per-category cards with:
  - 📊 Bar chart (budgeted vs actual)
  - 💰 Amount spent vs budget
  - 📈 Deviation (under/over by how much)
  - 🏷️ Bucket type badge (Needs/Wants/Savings)
  - 🔗 Link to category transactions

---

## Key Architecture Decisions

### 1. Strict Planning vs Actuals Separation

| Data Type | Source | Table | Updated |
|-----------|--------|-------|---------|
| **Planned** | User's budget setup + allocations | `budget_categories` | On budget create/edit |
| **Actual** | Transactions in period | `transactions` | Real-time as txns added |
| **Summary** | Calculated from above | `budget_reports` | On report recalculation |

### 2. Recalculation Triggers

```
Transaction Created    ──┐
Transaction Updated    ──┼──> Find affected budget ──> Recalculate Report
Transaction Deleted    ──┤
Budget Updated ─────────┘

Manual: GET /api/budgets/{id}/reports/current?recalculate=true
Manual: POST /api/budgets/{id}/reports/recalculate
```

### 3. Per-Category Allocation Strategy

**Option A: Explicit Allocations** (Current - Task 18)
- User can customize each category's amount
- Example: Groceries = 1,500, not evenly split
- More control, more setup

**Option B: Percentage Distribution** (Alternative)
- Categories split a percentage of bucket
- Example: 50% of Needs split among 5 categories

Current system uses **Option A** with **Option B as fallback** if no explicit allocations exist.

---

## Data Flow Diagram

```
┌──────────────┐
│ Create Budget│
└──────┬───────┘
       │
       ▼
   ┌────────────────────────────────────────┐
   │ Initialize budget_categories           │
   │ (even split if no custom allocation)   │
   └────────────────────────────────────────┘
       │
       ▼
   ┌──────────────────────────────────────────────┐
   │                                               │
   │  User adds Transaction                        │
   │  (Expense + Category)                         │
   │                                               │
   └──────────────────────────────────────────────┘
       │
       ▼
   ┌────────────────────────────────────────────────────┐
   │ Transaction Router detects budget period overlap   │
   │ Calls: BudgetReportRecalculationService.recalculate│
   └────────────────────────────────────────────────────┘
       │
       ▼
   ┌──────────────────────────────────────┐
   │ Query 1: Aggregate actuals by type   │
   │ (SUM of expenses grouped by category │
   │  type: NEEDS, WANTS, SAVINGS)        │
   └──────────────────────────────────────┘
       │
       ▼
   ┌──────────────────────────────────────┐
   │ Query 2: Calculate deviations        │
   │ (Planned - Actual per category type) │
   └──────────────────────────────────────┘
       │
       ▼
   ┌──────────────────────────────────────────┐
   │ Query 3: Build per-category breakdowns   │
   │ (Use budget_categories allocations as    │
   │  source of truth for "budgeted_amount")  │
   └──────────────────────────────────────────┘
       │
       ▼
   ┌──────────────────────────────────────┐
   │ Update/Create budget_reports record  │
   │ (summary + metadata)                 │
   │                                      │
   │ Update:                              │
   │ - total_spent                        │
   │ - remaining_budget                   │
   │ - last_calculated_at                 │
   │ - is_over_budget                     │
   └──────────────────────────────────────┘
       │
       ▼
   ┌──────────────────────────────────────┐
   │ Frontend fetches report              │
   │ (GET /api/budgets/{id}/reports/cur   │
   │  with category_breakdown data)       │
   └──────────────────────────────────────┘
       │
       ▼
   ┌──────────────────────────────────────┐
   │ User sees:                           │
   │ - Summary (on track / over)          │
   │ - Remaining budget                   │
   │ - Per-category status                │
   │ - Last calculated time               │
   └──────────────────────────────────────┘
```

---

## Example: Transaction Updates Report in Real-Time

### Scenario
1. User has $5,000 Needs budget, split among:
   - Groceries: $1,000
   - Utilities: $1,000
   - Rent: $3,000

2. User spends:
   - Groceries: $120 (Report shows: $880 remaining)
   - Utilities: $150 (Report shows: $850 remaining)

3. **User adds Rent: $3,200** (over the $3,000 budget!)

### What Happens:
```
1. Transaction inserted into database
   
2. Router checks: Is 2026-05-15 in a budget period? YES (May budget)

3. Calls: BudgetReportRecalculationService.recalculate(
     budget_id='may-budget',
     period_start=2026-05-01,
     period_end=2026-05-31
   )

4. Service aggregates: NEEDS total = 120 + 150 + 3200 = 3470

5. Compares: Budgeted 5000 vs Actual 3470 = Still under (-530)

6. BUT: Per-category, Rent is now 3200 vs budget 3000 = OVER by 200!

7. Updates budget_reports:
   - total_spent: 3470
   - is_over_budget: false (overall)
   - BUT category breakdown shows Rent is +200 over

8. Frontend updates immediately showing:
   - ⚠️ Rent badge highlighted in red (over budget)
   - Overall "on track" message
   - Breakdown shows Rent deviation: -200
```

---

## API Endpoints in Budget Flow

### Creation Phase
- `POST /api/budgets` → Create budget, initialize allocations
- `PATCH /api/budgets/{id}` → Update budget, rescale allocations

### Transaction Phase
- `POST /api/transactions` → Triggers auto-recalc
- `PATCH /api/transactions/{id}` → Triggers auto-recalc
- `DELETE /api/transactions/{id}` → Triggers auto-recalc

### Allocation Phase
- `GET /api/budgets/{id}/categories` → View per-budget allocations
- `PUT /api/budgets/{id}/categories` → Customize allocations

### Report Phase
- `GET /api/budgets/{id}/reports/current` → Get latest report
- `GET /api/budgets/{id}/reports/current?recalculate=true` → Force recalc
- `POST /api/budgets/{id}/reports/recalculate` → Manual recalc

---

## Testing the Flow

### Quick Test:
```bash
# 1. Create a budget
curl -X POST http://localhost:8000/api/budgets \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Test Budget",
    "total_budget": 5000,
    "period": "monthly",
    "start_date": "2026-05-01",
    "end_date": "2026-05-31"
  }'

# 2. Add a transaction
curl -X POST http://localhost:8000/api/transactions \
  -H "Authorization: Bearer <token>" \
  -d '{
    "date": "2026-05-15",
    "description": "Test expense",
    "amount": 100,
    "category_id": "<category-id>",
    "type": "expense"
  }'

# 3. View report (should auto-recalculate)
curl http://localhost:8000/api/budgets/<budget-id>/reports/current \
  -H "Authorization: Bearer <token>"
```

---

## Performance Considerations

1. **Recalculation is Synchronous** (can be made async later)
   - User adds transaction → Report updates immediately
   - Might add 200-500ms latency for complex budgets
   - Could move to background queue if needed

2. **Queries are Optimized**
   - Budget queries: Single indexed lookup
   - Category aggregation: GROUP BY with index on category_type
   - Breakdown generation: Batch insert per-category rows
   - Uses `flush()` and `commit()` strategically

3. **Scalability Points**
   - Large number of categories (100+) in one bucket
   - Long date ranges with millions of transactions
   - Multiple users (each isolated by user_id filter)

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Report shows $0 spent | No transactions in period | Add transactions with correct date |
| Categories missing from breakdown | Not in budget_categories | Use allocate endpoint or create explicitly |
| Report seems stale | last_calculated_at is old | Call with `?recalculate=true` |
| Over budget not detected | Transaction outside date range | Check budget period matches txn date |

