# Budget System - Technical Implementation Roadmap

**Status:** Ready for Development  
**Total Estimated Effort:** 60-80 hours across 5 phases  
**Target Goal:** Complete, working budget system with all features

---

## PHASE 1: Historical Analysis & Budget Creation (18 hours)

### Goal
User can create a budget, system analyzes historical spending, displays breakdown.

### Backend Work

#### 1.1 Create `BudgetHistoryAnalysis` Model
**File:** `server/models/budget_history_analysis.py` (NEW)
```python
class BudgetHistoryAnalysis(Base):
    """Stores historical spending breakdown for a budget."""
    
    __tablename__ = "budget_history_analysis"
    
    id: UUID
    budget_id: UUID (foreign key)
    user_id: UUID (foreign key)
    
    analysis_start_date: date
    analysis_end_date: date
    
    # Rollup totals
    total_spending: decimal
    needs_total: decimal
    wants_total: decimal
    investments_total: decimal
    
    needs_percentage: decimal
    wants_percentage: decimal
    investments_percentage: decimal
    
    # Detailed breakdown (stored as JSON)
    category_breakdown: JSON
    # {
    #   "Needs": {
    #     "Housing": { amount: 15000, percentage: 35 },
    #     ...
    #   },
    #   ...
    # }
    
    created_at: timestamp
```

#### 1.2 Create Budget Analysis Service
**File:** `server/services/budget_analysis_service.py` (NEW)
```python
class BudgetAnalysisService:
    """
    Core service for analyzing historical spending and creating budgets.
    
    Responsibilities:
    - Query transactions for a date range
    - Categorize and group by category/subcategory
    - Calculate percentages
    - Return structured breakdown
    - Validate analysis for correctness
    """
    
    def analyze_spending(
        self,
        user_id: UUID,
        analysis_start: date,
        analysis_end: date
    ) -> BudgetHistoryAnalysis:
        """
        Analyze spending for period and return structured data.
        
        Args:
            user_id: User to analyze
            analysis_start: Period start (inclusive)
            analysis_end: Period end (inclusive)
        
        Returns:
            BudgetHistoryAnalysis object with breakdown
        """
        # Implementation checklist:
        # [ ] Query transactions WHERE date >= start AND date <= end
        # [ ] Filter: exclude income transactions (type='expense')
        # [ ] Group by category/subcategory
        # [ ] Calculate subcategory totals
        # [ ] Calculate category rollups
        # [ ] Calculate percentages (use DECIMAL for precision)
        # [ ] Validate: totals add up, percentages <= 100%
        # [ ] Return structured object
        pass
```

#### 1.3 Update Budget Creation Endpoint
**File:** `server/routers/budget.py` (MODIFY)
```python
# CHANGE: POST /api/budgets endpoint
# BEFORE: User manually entered allocations
# AFTER: System auto-analyzes history

@router.post("", response_model=BudgetResponse)
def create_budget(
    budget_data: CreateBudgetData,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Create a new budget with historical analysis.
    
    NEW LOGIC:
    1. Extract budget_start_month from budget_data
    2. Calculate analysis period: first transaction ~ (budget_start - 1 day)
    3. Call BudgetAnalysisService.analyze_spending()
    4. Store BudgetHistoryAnalysis
    5. Create Budget with analyzed allocations
    6. Return Budget + Analysis
    """
    pass
```

#### 1.4 Add Budget Analysis Query Endpoint
**File:** `server/routers/budget.py` (NEW ENDPOINT)
```python
@router.get("/{budget_id}/history-analysis", response_model=HistoryAnalysisResponse)
def get_budget_history_analysis(
    budget_id: UUID,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get historical spending breakdown for a budget.
    
    Returns:
    {
        analysis_start_date: date,
        analysis_end_date: date,
        total_spending: decimal,
        breakdown: {
            "Needs": {
                "Housing": { amount, percentage },
                ...
            },
            ...
        }
    }
    """
    pass
```

#### 1.5 Validation & Error Handling
**In:** `server/services/budget_analysis_service.py`
```python
# Add checks for:
# [ ] No transactions found (raise ValueError)
# [ ] Date calculation is off (unit test this!)
# [ ] Transactions on boundary dates (inclusion/exclusion edge cases)
# [ ] Decimal precision (use DECIMAL(15,2))
# [ ] Category matching failures (log warnings, track unmatched)
```

### Frontend Work

#### 1.6 Create Historical Breakdown Component
**File:** `client/src/components/budget/HistoricalBreakdown.tsx` (NEW)
```typescript
interface HistoricalBreakdownProps {
  analysis: BudgetHistoryAnalysis
  onConfirm: () => void
  onCancel: () => void
}

export function HistoricalBreakdown({
  analysis,
  onConfirm,
  onCancel
}: HistoricalBreakdownProps) {
  // Render spreadsheet-like table showing:
  // - Category | Subcategory | Amount | Percentage | Status
  // - All transactions broken down by category
  // - Rollup totals
  // - Color-coded validation (over 100%?, missing categories?)
  
  return (
    <div>
      {/* Header showing analysis period */}
      <p>Analyzing: {analysis.analysis_start} to {analysis.analysis_end}</p>
      
      {/* Main table */}
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Subcategory</th>
            <th>Amount</th>
            <th>Percentage</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {/* Render each category/subcategory */}
        </tbody>
      </table>
      
      {/* Confirmation buttons */}
      <button onClick={onConfirm}>Create Budget</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  )
}
```

#### 1.7 Update Budget Create Page
**File:** `client/app/(dashboard)/budgets/create/page.tsx` (MODIFY)
```typescript
// NEW FLOW:
// 1. User enters: budget name, start month, income (optional)
// 2. User clicks "Analyze"
// 3. System calls: POST /api/budgets with analysis request
// 4. API returns: Budget + HistoryAnalysis
// 5. Show HistoricalBreakdown component for user verification
// 6. User clicks "Confirm" → Budget created
// 7. Redirect to budget detail page

// KEY: Must show spreadsheet view so user can verify analysis is correct
```

#### 1.8 Add Budget Preview/Verification UI
**File:** `client/src/components/budget/BudgetPreview.tsx` (NEW)
```typescript
// Shows before user confirms:
// - Analysis period
// - Categories with breakdown
// - Calculated allocations
// - Recommendations (later)
// - Confirm/Cancel buttons
```

### Testing

#### 1.9 Unit Tests
**File:** `server/tests/test_budget_analysis_service.py` (NEW)
```python
# Critical tests:
# [ ] test_analysis_period_calculation (date boundaries)
# [ ] test_category_grouping (transactions->categories)
# [ ] test_percentage_calculation (precision, totals)
# [ ] test_edge_cases (no transactions, all unmatched, etc.)
# [ ] test_date_inclusion_exclusion (inclusive/exclusive logic)
```

**File:** `client/tests/HistoricalBreakdown.test.tsx` (NEW)
```typescript
// Tests:
// [ ] Renders all categories
// [ ] Shows correct percentages
// [ ] Color coding works
```

#### 1.10 Integration Tests
**Manual/E2E:**
```
1. Create test user with 6 months of transactions
2. Create budget for "May 2026"
3. Verify analysis analyzes Jan-Apr only
4. Verify breakdown matches manual calculation
5. Verify UI displays correctly
```

---

## PHASE 2: Budget Detail & Recommendations (16 hours)

### Goal
User sees created budget with allocations and actionable recommendations.

### Backend Work

#### 2.1 Create Recommendation Engine
**File:** `server/services/recommendation_engine.py` (NEW)
```python
class RecommendationEngine:
    """
    Generates actionable recommendations based on spending analysis.
    
    Rules:
    - If category spending > 150% of target: "Reduce by X%"
    - If category spending < 50% of target: "Increase by X% (if makes sense)"
    - If category is untracked: "Consider tracking X"
    - If variance is large: "Investigate why X changed significantly"
    """
    
    def generate_recommendations(
        self,
        budget_id: UUID
    ) -> List[Recommendation]:
        """
        Generate 3-5 recommendations for the budget.
        """
        pass
```

#### 2.2 Create Recommendation Model
**File:** `server/models/recommendation.py` (NEW)
```python
class Recommendation(Base):
    __tablename__ = "recommendations"
    
    id: UUID
    budget_id: UUID
    
    category: str (e.g., "Eating Out")
    recommendation_type: enum ("reduce", "increase", "investigate")
    
    current_percentage: decimal
    recommended_percentage: decimal
    potential_savings: decimal
    
    rationale: str
    priority: enum ("low", "medium", "high", "critical")
    
    created_at: timestamp
```

#### 2.3 Add Recommendations Endpoint
**File:** `server/routers/budget.py` (NEW ENDPOINT)
```python
@router.get("/{budget_id}/recommendations", response_model=List[RecommendationResponse])
def get_recommendations(
    budget_id: UUID,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get recommendations for a budget."""
    pass
```

### Frontend Work

#### 2.4 Update Budget Detail Page
**File:** `client/app/(dashboard)/budgets/[id]/page.tsx` (MODIFY)
```typescript
// ADD: Fetch/display recommendations
// ADD: Show budget with NEW data (from historical analysis)
// KEEP: Existing allocation cards
// ADD: Recommendations section below allocations
```

#### 2.5 Create Recommendations Component
**File:** `client/src/components/budget/RecommendationsList.tsx` (NEW)
```typescript
interface RecommendationsListProps {
  recommendations: Recommendation[]
  onAccept?: (rec: Recommendation) => void
}

export function RecommendationsList({
  recommendations,
  onAccept
}: RecommendationsListProps) {
  // Display cards for each recommendation:
  // - Category name
  // - Current: X%, Recommended: Y%
  // - Potential savings if implemented
  // - Rationale/explanation
  // - "Learn More" button (maybe links to guide?)
  
  return (
    <div className="recommendations-list">
      {recommendations.map(rec => (
        <RecommendationCard key={rec.id} rec={rec} />
      ))}
    </div>
  )
}
```

#### 2.6 Create Recommendation Card Component
**File:** `client/src/components/budget/RecommendationCard.tsx` (NEW)
```typescript
// Shows:
// - Priority indicator (color coded)
// - Category name
// - Current vs Recommended
// - Savings amount
// - Rationale
// - Action button (e.g., "Explore in Sandbox")
```

### Testing

#### 2.7 Unit Tests
**File:** `server/tests/test_recommendation_engine.py` (NEW)
```python
# Tests:
# [ ] test_reduce_recommendation (when X% > target)
# [ ] test_increase_recommendation (when X% < target)
# [ ] test_multiple_recommendations (returns top 3-5)
# [ ] test_priority_calculation (high vs low priority)
```

---

## PHASE 3: Budget Sandbox Enhancement (14 hours)

### Goal
Real-time what-if exploration with accurate simulations.

### Backend Work

#### 3.1 Create Scenario Simulator Service
**File:** `server/services/scenario_simulator.py` (NEW)
```python
class ScenarioSimulator:
    """
    Simulates budget scenarios based on category adjustments.
    """
    
    def simulate_adjustments(
        self,
        budget_id: UUID,
        adjustments: Dict[str, float]  # { "subcategory_id": percentage_change }
    ) -> ScenarioImpact:
        """
        Simulate impact of category adjustments.
        
        Returns impact metrics:
        - New allocation percentages
        - Potential monthly savings/costs
        - Validation warnings
        """
        pass
```

#### 3.2 Scenario Endpoint
**File:** `server/routers/budget.py` (NEW ENDPOINT)
```python
@router.post("/{budget_id}/scenarios/simulate")
def simulate_scenario(
    budget_id: UUID,
    adjustments: ScenarioSimulateRequest,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Simulate scenario impact without creating it yet.
    
    Returns: Impact metrics for UI display
    """
    pass
```

### Frontend Work

#### 3.3 Update Scenario Simulation Hook
**File:** `client/src/hooks/useScenarioSimulation.ts` (ENHANCE)
```typescript
// CURRENT: Local calculation is rough
// NEEDED: More accurate simulation logic
// - Recalculate all percentages correctly
// - Show impact on total allocation
// - Show monthly savings/costs
```

#### 3.4 Update ImpactPreviewPanel
**File:** `client/src/components/budget/ImpactPreviewPanel.tsx` (ENHANCE)
```typescript
// Already exists, but may need adjustments:
// - Show before/after allocations clearly
// - Show potential monthly savings
// - Add validation warnings (e.g., "Needs > 50%, may be unrealistic")
```

### Testing

#### 3.5 Tests
**File:** `server/tests/test_scenario_simulator.py` (NEW)
```python
# Tests:
# [ ] test_single_adjustment (reduce one category)
# [ ] test_multiple_adjustments (reduce multiple)
# [ ] test_validation_warnings (when allocation invalid)
# [ ] test_monthly_savings_calculation (accuracy)
```

---

## PHASE 4: Reports & Filtering (14 hours)

### Goal
User sees monthly progress vs budget with category filtering.

### Backend Work

#### 4.1 Update Budget Report Model
**File:** `server/models/budget_report.py` (MODIFY)
```python
# ADD:
# - report_type: enum ("full", "needs_only", "wants_only", "investments_only")
# - actual_*_percentage fields (calculated from transactions)
# - variance_* fields (planned vs actual)
```

#### 4.2 Create Report Generator Service
**File:** `server/services/report_generator.py` (NEW/UPDATE)
```python
class ReportGenerator:
    """
    Generates monthly budget reports with filtering.
    """
    
    def generate_report(
        self,
        budget_id: UUID,
        report_month: date,
        report_type: str = "full"
    ) -> BudgetReport:
        """
        Generate report for a month, optionally filtered by type.
        
        Steps:
        1. Get budget allocations (planned)
        2. Query transactions for the month
        3. Calculate actual spending by category
        4. Calculate variances
        5. Generate insights (e.g., "Over budget by 10%")
        """
        pass
```

#### 4.3 Reports Endpoint
**File:** `server/routers/reports.py` (NEW)
```python
@router.get("/budgets/{budget_id}/reports")
def get_budget_reports(
    budget_id: UUID,
    month: date,
    report_type: str = "full",
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get monthly budget report with optional filtering."""
    pass
```

### Frontend Work

#### 4.4 Create Reports Page
**File:** `client/app/(dashboard)/budgets/[id]/reports/page.tsx` (NEW)
```typescript
// Shows:
// - Month/date picker
// - Report type selector (Full, Needs, Wants, Investments)
// - Table: Planned vs Actual for each subcategory
// - Color coding: Green (under), Yellow (warning), Red (over)
// - Insights section with recommendations
```

#### 4.5 Create Report Table Component
**File:** `client/src/components/budget/ReportTable.tsx` (NEW)
```typescript
interface ReportTableProps {
  report: BudgetReport
}

export function ReportTable({ report }: ReportTableProps) {
  // Render table:
  // Subcategory | Planned | Actual | Variance | Status
  // Housing     | ₹35000  | ₹34500 | -₹500    | ✅ OK
  // Food        | ₹5400   | ₹6200  | +₹800    | ⚠️ OVER
  return (
    <table>
      {/* ... */}
    </table>
  )
}
```

#### 4.6 Create Report Filters Component
**File:** `client/src/components/budget/ReportFilters.tsx` (NEW)
```typescript
// Selectors for:
// - Month/date
// - Report type (dropdown)
// - Auto-generate on change
```

### Testing

#### 4.7 Tests
**File:** `server/tests/test_report_generator.py` (NEW)
```python
# Tests:
# [ ] test_full_report (all categories)
# [ ] test_needs_only_filter (only Needs)
# [ ] test_wants_only_filter (only Wants)
# [ ] test_variance_calculation (actual vs planned)
# [ ] test_month_filtering (March vs April transactions)
```

---

## PHASE 5: Analytics & Insights (12 hours, Lower Priority)

### Goal
Help user understand spending trends over time.

### Backend Work

#### 5.1 Create Analytics Service
**File:** `server/services/analytics_service.py` (NEW)
```python
class AnalyticsService:
    """
    Generates analytics and insights for spending patterns.
    """
    
    def get_spending_trends(
        self,
        user_id: UUID,
        months: int = 12
    ) -> SpendingTrends:
        """
        Get spending trends for last N months.
        """
        pass
    
    def get_category_insights(
        self,
        user_id: UUID
    ) -> CategoryInsights:
        """
        Identify overspending/underspending patterns.
        """
        pass
```

#### 5.2 Analytics Endpoints
**File:** `server/routers/analytics.py` (NEW)
```python
@router.get("/users/me/spending-trends")
@router.get("/users/me/category-insights")
```

### Frontend Work

#### 5.3 Create Analytics Page
**File:** `client/app/(dashboard)/analytics/page.tsx` (NEW)
```typescript
// Shows:
// - Spending trends chart (line graph over months)
// - Category breakdown pie chart
// - Insights (e.g., "Dining up 15% this month")
```

#### 5.4 Chart Components
**File:** `client/src/components/chart/SpendingTrendChart.tsx` (NEW)
**File:** `client/src/components/chart/CategoryBreakdownChart.tsx` (NEW)

### Testing

#### 5.5 Tests
Similar to Phase 4

---

## CRITICAL FIXES NEEDED (Before Phase 1 Coding)

These MUST be correct or everything fails:

```
CHECKLIST:
[ ] Date Range Logic
    - Budget "May 2026" analyzes Jan-Apr 2026 (NOT May data)
    - Query: WHERE date >= 2026-01-01 AND date <= 2026-04-30
    - Unit tests for edge cases (month boundaries)

[ ] Transaction Categorization
    - Manual spot-check: Pick 20 random transactions
    - Verify they're in correct category/subcategory
    - Check for unmatched transactions
    
[ ] Decimal Precision
    - All amounts use DECIMAL(15,2) not float
    - Percentages calculated correctly (not 47.9999 vs 48)
    
[ ] Validation
    - Verify totals math out
    - Percentages add to <= 100% (accounting for unmatched)
    - No duplicate transactions
    
[ ] Historical Data
    - Query takes <2 seconds even with 10000 transactions
    - Results are deterministic (same data = same results)
```

---

## DEFINITION OF DONE

Budget system is complete when:

- [x] User can create budget (PHASE 1)
- [x] System analyzes historical spending correctly (PHASE 1)
- [x] User sees breakdown spreadsheet (PHASE 1)
- [x] User sees allocation cards on budget detail (PHASE 2)
- [x] User sees 3-5 recommendations (PHASE 2)
- [x] User can adjust in sandbox and see impact (PHASE 3)
- [x] User can apply scenario to create new budget (PHASE 3)
- [x] User can view monthly progress reports (PHASE 4)
- [x] User can filter reports by category (PHASE 4)
- [x] Reports show accurate variance indicators (PHASE 4)
- [x] User can see spending trends (PHASE 5, optional)

Plus:
- [x] All date calculations verified
- [x] All decimals precise to 2 places
- [x] All API tests pass
- [x] All frontend components render correctly
- [x] E2E test: full user journey works
- [x] No performance issues (<2s per operation)

---