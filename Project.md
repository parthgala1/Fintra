# 🧠 PROJECT CONTEXT — Fintra (Financial Decision Engine)

## 0. PURPOSE OF THIS FILE

This document provides full context for the AI coding assistant.

The assistant must:

- behave like a senior engineer + product thinker
- understand system-level design decisions
- maintain consistency across all generated code/docs
- prioritize correctness, simplicity, and scalability

---

# 1. PRODUCT OVERVIEW

## Product Name

Fintra (working name)

## What We Are Building

A **Personal Financial Decision Engine**, NOT just a budgeting app.

Core idea:

Input (bank statements)
→ Process (categorization + financial modeling)
→ Output (insights + decisions + planning)

---

## Core Philosophy

Most apps answer:
"What did I spend?"

This product answers:
"What should I do next?"

---

# 2. TARGET USERS

- Students / early professionals (18–30)
- Developers (important niche)
- People with low financial clarity but high intent

---

# 3. CORE FEATURES

## 3.1 Data Layer

- CSV/Excel bank statement upload
- Transaction parsing
- Data normalization
- Reconciliation with bank statements

## 3.2 Categorization System

- Rule-based categorization (deterministic)
- Keyword-based category mapping
- User correction learning
- AI fallback for ambiguous cases (enhancement only)

## 3.3 Budget Management System (CORE LOOP)

**This is NOT a feature — it is a closed-loop system.**

### System Components:

1. **Plan** → User defines allocation across categories
2. **Track** → Actual spending auto-categorized from transactions
3. **Compare** → Deviation detection + ratio analysis
4. **Simulate** → Budget sandbox for what-if scenarios
5. **Act** → Recommendations for course correction

### Full Lifecycle:

```
User Creates Budget
    ↓
Transactions Auto-Categorized
    ↓
Actual vs Planned Computed
    ↓
Deviations Detected
    ↓
Metrics Calculated (savings rate, burn rate, etc.)
    ↓
Recommendations Generated
    ↓
User Simulates Changes
    ↓
User Adjusts Budget or Behavior
    ↓
[Loop Continues]
```

This is a **feedback system**, not a static tracker.

---

## 3.4 Simulation Engine (Budget Sandbox)

**NOT just UI — this is a computational engine.**

Capabilities:

- What-if scenario modeling
- Real-time constraint validation
- Automatic recomputation of:
  - savings rate
  - goal impact
  - category ratios
- Multi-scenario comparison
- Rollback/reset functionality

Example Use Cases:

- "What if I reduce dining out by ₹5,000?"
- "Can I afford ₹10,000/month SIP without breaking needs threshold?"
- "What happens if I shift 5% from wants to investments?"

Critical: All simulations must validate against constraint engine.

---

## 3.5 Goal Engine (CORE DIFFERENTIATOR)

- Goal creation (amount + deadline)
- Monthly requirement calculation
- Gap analysis
- Feasibility scoring
- Recommendation generation
- Timeline adjustment suggestions

---

## 3.6 Behavioral Features

- Time-to-earn calculation (expense → hours worked)
- Budget breach alerts
- Spending pattern insights
- Category trend tracking

---

# 4. FINANCIAL MODEL — 50/30/20 RULE

## Base Rule

- Needs: 50%
- Wants: 30%
- Investments: 20%

## Modified Rule (for early professionals)

- Needs: 25–40%
- Wants: 20–30%
- Investments: 30–50%

---

## Category Definitions

### Needs (Priority: CRITICAL)

Essential survival costs:

- food (groceries, not dining out)
- rent / family contribution
- transport (commute)
- utilities (electricity, internet)
- insurance
- minimum healthcare

### Wants (Priority: LOW)

Lifestyle expenses:

- eating out / dining
- subscriptions (Netflix, Spotify, etc.)
- entertainment
- travel funds
- shopping (non-essential)
- hobbies

### Investments (Priority: HIGH)

Future-oriented:

- SIP (index funds)
- emergency fund
- goal savings (house, education, etc.)
- skill investment (important for developers)
- retirement planning

---

# 5. BUDGET MANAGEMENT SYSTEM (DETAILED ARCHITECTURE)

## 5.1 Budget Engine — Core Components

### a. Allocation Model

**Purpose:** Define how income is distributed.

Supports:

- Percentage-based allocation (e.g., Needs = 40%)
- Absolute value allocation (e.g., Rent = ₹15,000)
- Dynamic categories (user can add custom categories)
- Category-to-type mapping (e.g., "Groceries" → Needs)

Rules:

- Total allocation must equal 100% or total income
- Each category gets one allocation method (% OR absolute)
- If absolute values provided, % auto-calculated

Example:

```
Income: ₹100,000
Needs: 40% → ₹40,000
  - Rent: ₹15,000 (absolute)
  - Food: ₹10,000 (absolute)
  - Transport: ₹5,000 (absolute)
  - Utilities: ₹10,000 (absolute)
Wants: 30% → ₹30,000
Investments: 30% → ₹30,000
```

---

### b. Deviation Engine

**Purpose:** Compare planned vs actual spending.

Metrics Computed:

- **Overspending:** actual > planned
- **Underspending:** actual < planned
- **Deviation Amount:** |actual - planned|
- **Deviation %:** (deviation / planned) × 100

Detection Thresholds:

- Minor: 0–10% deviation
- Moderate: 10–25% deviation
- Critical: >25% deviation

Output:

- Category-level deviations
- Type-level deviations (Needs, Wants, Investments)
- Total budget health score

---

### c. Metrics Layer

**Purpose:** Calculate financial health indicators.

Core Metrics:

1. **Savings Rate**
   ```
   savings_rate = (income - expenses) / income × 100
   ```

2. **Investment Rate**
   ```
   investment_rate = investments / income × 100
   ```

3. **Category Ratios**
   ```
   needs_ratio = needs / income
   wants_ratio = wants / income
   investments_ratio = investments / income
   ```

4. **Burn Rate**
   ```
   burn_rate = total_expenses / income × 100
   ```

5. **Discretionary Spending**
   ```
   discretionary = wants + (investments - goal_commitments)
   ```

6. **Goal Commitment Ratio**
   ```
   goal_ratio = goal_allocations / income
   ```

All metrics:
- Must be deterministic
- Must be explainable
- Must update in real-time during simulations

---

### d. Constraint Engine (NEW — CRITICAL)

**Purpose:** Enforce financial rules and prevent invalid budgets.

Hard Constraints:

1. **Total Allocation Rule**
   ```
   needs_% + wants_% + investments_% = 100%
   ```

2. **Minimum Needs Threshold**
   ```
   needs ≥ 25% of income
   ```
   Reasoning: Below 25% is unrealistic for survival costs.

3. **Goal-Linked Investment Constraints**
   ```
   investments ≥ sum(active_goal_monthly_requirements)
   ```
   If user has goals requiring ₹15k/month, investments must be ≥ ₹15k.

4. **Non-Negative Allocations**
   ```
   all category allocations ≥ 0
   ```

Soft Constraints (Warnings):

1. **Needs Ceiling**
   ```
   needs ≤ 50% (warn if exceeded)
   ```

2. **Wants Floor**
   ```
   wants ≥ 10% (warn if too low — quality of life impact)
   ```

3. **Investments Floor**
   ```
   investments ≥ 15% (warn if below — insufficient wealth building)
   ```

Constraint Violations:

- Block budget save if hard constraint violated
- Show warnings for soft constraints
- Provide suggested corrections

Example Violation Message:

```
❌ Cannot save budget
Reason: Total allocation = 95%
Required: 100%
Suggestion: Add 5% to Investments
```

---

## 5.2 Category Priority Model

**Purpose:** Hierarchical decision-making for trade-offs.

Priority Levels:

1. **CRITICAL (Needs)**
   - Cannot be reduced below minimum threshold
   - First priority in allocation
   - Protected during simulations

2. **HIGH (Investments)**
   - Goal-linked allocations are protected
   - Discretionary investments can be adjusted
   - Second priority after needs

3. **LOW (Wants)**
   - Fully flexible
   - First target for reductions
   - Can be reduced to 0% in extreme cases

Priority Application:

- **Recommendation Engine:** Suggests reducing wants before investments
- **Simulation Engine:** Warns when critical categories affected
- **Deviation Alerts:** Higher severity for needs overspending

Example Priority-Based Recommendation:

```
Goal requires additional ₹5,000/month
Recommendation: Reduce wants by ₹5,000 (dining out: ₹3k, shopping: ₹2k)
Alternative: Reduce investments by ₹2k + wants by ₹3k
Avoid: Reducing needs
```

---

## 5.3 Financial Timeline Layer (NEW — CRITICAL)

**Purpose:** Track financial behavior over time, detect trends.

### Monthly Snapshots

Captures each month:

- Income
- Total expenses (by category)
- Savings
- Savings rate
- Deviations from budget
- Goal progress

Stored as immutable records for historical analysis.

---

### Rolling Averages

Computed metrics:

- 3-month rolling average (recent trend)
- 6-month rolling average (medium-term pattern)
- 12-month rolling average (annual baseline)

Used for:

- Smoothing seasonal variations
- Detecting behavioral drift
- Comparing current vs historical performance

---

### Trend Tracking

Detects:

- **Improving Trends**
  - Savings rate increasing over 3 months
  - Wants ratio decreasing over 3 months

- **Degrading Trends**
  - Savings rate declining over 3 months
  - Needs ratio increasing over 3 months

- **Volatile Behavior**
  - High variance in monthly spending
  - Inconsistent savings patterns

---

### Behavioral Drift Detection

**Purpose:** Identify when actual behavior diverges from intended budget.

Metrics:

- **Drift Score:** Average deviation % over 3 months
- **Consistency Score:** Variance in monthly allocations

Thresholds:

- Low drift: <10% average deviation
- Moderate drift: 10–20% average deviation
- High drift: >20% average deviation (budget is not being followed)

Action:

- High drift triggers "Budget Realignment" recommendation
- Suggests updating budget to match actual behavior OR
- Provides behavior change plan to match intended budget

---

### Why Time Dimension is Required

Without time tracking:

- Cannot detect trends (improving or degrading)
- Cannot distinguish one-time events from patterns
- Cannot provide context for current behavior
- Cannot validate if recommendations are working

Example:

```
Current Month: Wants = 40% (over budget)
Without Timeline: "You overspent on wants"
With Timeline: "Wants averaging 38% for 3 months — budget may be unrealistic"
```

Timeline enables **adaptive recommendations** instead of static rules.

---

## 5.4 Cash Flow Engine (NEW — REQUIRED)

**Purpose:** Prevent "healthy budget but broke" scenarios.

### Problem Statement

Monthly metrics can be misleading:

```
Monthly Budget:
Income: ₹100k
Expenses: ₹80k
Savings: ₹20k
✅ Looks healthy

Reality:
Day 1-15: ₹70k expenses (rent, bills)
Day 16-30: ₹10k expenses
Day 25: ₹0 bank balance (ran out of money)
```

Traditional budgeting ignores **timing**.

---

### Cash Flow Tracking

Tracks:

- Transaction dates (not just amounts)
- Running daily balance
- Intra-month liquidity

Metrics:

1. **Mid-Month Balance**
   ```
   balance_day_15 = income - expenses_till_day_15
   ```

2. **Minimum Balance Point**
   ```
   min_balance = lowest daily balance in month
   ```

3. **Days with Negative Balance**
   ```
   liquidity_risk_days = count(days where balance < 0)
   ```

---

### Liquidity Detection

Alerts:

- **Warning:** Balance drops below ₹5,000 mid-month
- **Critical:** Balance goes negative
- **Pattern:** Consistently low balance in days 20–25

Root Causes Identified:

- Front-loaded expenses (rent, EMIs early in month)
- Irregular income (freelancers, variable pay)
- Unplanned large expenses

---

### Cash Flow Recommendations

Examples:

- "Your balance drops to ₹1,200 by Day 18. Consider moving rent payment to Day 5 after salary."
- "Emergency fund of ₹10k recommended to prevent mid-month shortfalls."
- "Split large expenses: ₹15k shopping on Day 3 caused liquidity crunch."

Critical: This is NOT about reducing spending — it's about **timing optimization**.

---

# 6. RECOMMENDATION ENGINE (ENHANCED)

## Purpose

Output **actions**, not insights.

## Design Principles

1. **Deterministic:** Same inputs → same recommendations
2. **Severity-Based:** Prioritize critical issues
3. **Trade-Off Aware:** Explain what user gives up
4. **Actionable:** Every recommendation has clear next step

---

## Recommendation Types

### 1. Budget Adjustment Recommendations

Triggered by:
- Persistent overspending (>3 months)
- Goal infeasibility
- Constraint violations

Examples:

```
✅ "Reduce dining out by ₹3,000 to meet savings goal"
✅ "Reallocate 5% from wants to investments"
❌ "You're spending too much" (not actionable)
```

---

### 2. Behavioral Recommendations

Triggered by:
- High behavioral drift
- Inconsistent savings
- Frequent budget breaches

Examples:

```
✅ "Your wants budget is unrealistic. Increase to 35% OR set up auto-transfer to savings."
✅ "You consistently overspend on weekends. Try cash-only for discretionary items."
❌ "Try to spend less" (vague)
```

---

### 3. Goal-Based Recommendations

Triggered by:
- Goal deadline approaching with insufficient savings
- Conflicting goals competing for funds

Examples:

```
✅ "Extend MacBook goal by 3 months OR reduce wants by ₹7,000/month"
✅ "Pause emergency fund SIP for 2 months to meet vacation goal"
❌ "Save more money" (not specific)
```

---

### 4. Cash Flow Recommendations

Triggered by:
- Mid-month liquidity issues
- Negative balance events

Examples:

```
✅ "Move rent payment from Day 3 to Day 7 to avoid negative balance"
✅ "Create ₹10k buffer in checking account for expense timing mismatches"
```

---

### 5. Constraint-Based Recommendations

Triggered by:
- Constraint violations
- Suboptimal allocations

Examples:

```
✅ "Needs are 60% of income — consider roommate or cheaper housing"
✅ "Investments are 10% — increase to 20% by cutting subscriptions (₹2k) and dining (₹3k)"
```

---

## Recommendation Severity

**CRITICAL:** Immediate action required

- Negative cash flow
- Goal deadline <1 month with <50% saved
- Needs >60% of income

**HIGH:** Action recommended within 7 days

- Consistent overspending (3+ months)
- Savings rate <10%
- Goal at risk

**MEDIUM:** Review and adjust

- One-time budget breach
- Wants >40%
- Minor constraint violations

**LOW:** Optimization suggestions

- Savings rate 15–20% (good, but can improve)
- Balanced budget with room for efficiency

---

## Trade-Off Explanation

Every recommendation explains:

1. What to do
2. Why it matters
3. What user gives up
4. Impact on goals

Example:

```
Recommendation: Reduce dining out from ₹8,000 to ₹5,000

Why: Current wants spending (38%) exceeds budget (30%)

Trade-off: 6 fewer restaurant meals per month

Impact:
  ✅ Savings rate improves from 12% to 18%
  ✅ Emergency fund goal accelerated by 2 months
  ✅ Budget becomes sustainable
```

User sees **full picture**, not just the directive.

---

# 7. CORE SYSTEM ARCHITECTURE (UPDATED)

## High-Level Flow

```
Frontend (Next.js)
    ↓
API Layer (FastAPI)
    ↓
Financial State Engine
    ↓
Transaction Processing
    ↓
Budget Engine
    ├─ Allocation Model
    ├─ Deviation Engine
    ├─ Metrics Layer
    ├─ Constraint Engine
    └─ Cash Flow Engine
    ↓
Goal Engine
    ├─ Goal Tracking
    ├─ Monthly Requirement Calculation
    └─ Feasibility Analysis
    ↓
Timeline Layer
    ├─ Monthly Snapshots
    ├─ Rolling Averages
    └─ Trend Detection
    ↓
Recommendation Engine
    ├─ Rule-Based Recommendations
    ├─ Severity Scoring
    └─ Trade-Off Analysis
    ↓
AI Enhancement Layer
    ├─ Categorization Fallback
    ├─ Natural Language Explanations
    └─ Insight Generation
    ↓
User Output (Dashboard, Recommendations, Simulations)
```

---

## Component Responsibilities

### Financial State Engine

- Single source of truth
- Manages:
  - Income
  - Expenses (categorized)
  - Budgets
  - Goals
  - Account balances
- Publishes state changes to downstream engines

---

### Budget Engine

**NOT just a tracker — this is a computational system.**

Subcomponents:

1. **Allocation Model:** Defines the plan
2. **Deviation Engine:** Compares plan vs reality
3. **Metrics Layer:** Computes financial health indicators
4. **Constraint Engine:** Validates and enforces rules
5. **Cash Flow Engine:** Tracks timing and liquidity

All components must:
- Operate deterministically
- Update in real-time during simulations
- Expose APIs for frontend consumption

---

### Goal Engine

- Goal CRUD
- Monthly requirement calculation
- Gap analysis (required vs actual)
- Feasibility scoring
- Timeline adjustment logic

Formula:

```
required_monthly = (target_amount - current_savings) / months_remaining
gap = required_monthly - allocated_monthly
feasibility_score = allocated_monthly / required_monthly × 100
```

---

### Timeline Layer

- Stores monthly snapshots
- Computes rolling averages
- Detects trends
- Identifies behavioral drift

Enables historical analysis and predictive insights.

---

### Recommendation Engine

- Ingests data from all upstream engines
- Applies rule-based decision trees
- Generates severity-scored recommendations
- Explains trade-offs

Must remain deterministic — NO ML in core logic.

---

### AI Enhancement Layer

**NOT in the critical path.**

Used ONLY for:

- Transaction categorization (ambiguous cases)
- Natural language insight generation
- Recommendation explanations (making them conversational)
- Financial copilot (chat interface)

AI failures must NOT break core functionality.

---

# 8. AI STRATEGY (CRITICAL BOUNDARIES)

## AI SHOULD NOT BE USED FOR:

- Financial calculations (savings rate, etc.)
- Budget math (deviations, allocations)
- Goal math (monthly requirements)
- Constraint validation
- Recommendation logic

These must remain **deterministic and explainable**.

---

## AI SHOULD BE USED FOR:

1. **Transaction Categorization (Fallback Only)**
   - When rule-based categorization fails
   - User can always override

2. **Natural Language Generation**
   - Convert metric → readable insight
   - Example: "18% savings rate" → "You're saving ₹18 out of every ₹100 earned"

3. **Recommendation Explanation**
   - Make deterministic output conversational
   - Example: "Reduce wants by ₹5k" → "Skipping 3-4 restaurant outings would free up ₹5k for your goal"

4. **Financial Copilot**
   - Answer user questions about their finances
   - Examples:
     - "Why is my savings rate low?"
     - "Can I afford a ₹50k vacation in 3 months?"
     - "What happens if I quit my job?"

---

## System Design Pattern

```
Deterministic Engine (calculations)
    ↓
AI Layer (enhancement)
    ↓
User Output (dashboard, chat, insights)
```

AI is **post-processing**, not core logic.

---

# 9. DEVELOPMENT STRATEGY

## DO NOT BUILD EVERYTHING AT ONCE

Use **vertical slices** — end-to-end features, not horizontal layers.

---

## PHASE 1 — CORE ENGINE (CLI/Backend)

- CSV/Excel parser
- Transaction normalization
- Rule-based categorization
- Metrics calculation (savings rate, burn rate)
- Budget allocation model
- Deviation detection

**Output:** Terminal-based validation of all calculations.

---

## PHASE 2 — BUDGET ENGINE (Backend)

- Constraint engine
- Simulation engine (what-if scenarios)
- Priority model
- Recommendation engine (basic)

**Output:** API endpoints for budget CRUD + simulations.

---

## PHASE 3 — GOAL ENGINE (Backend)

- Goal CRUD
- Monthly requirement calculation
- Feasibility analysis
- Goal-based recommendations

**Output:** API endpoints for goal management.

---

## PHASE 4 — TIMELINE & CASH FLOW (Backend)

- Monthly snapshot storage
- Rolling averages
- Trend detection
- Cash flow tracking
- Behavioral drift detection

**Output:** Historical analysis APIs.

---

## PHASE 5 — FRONTEND (Dashboard)

- Transaction list view
- Budget dashboard (planned vs actual)
- Metrics visualization
- Basic recommendations display

**Output:** Working web dashboard.

---

## PHASE 6 — FRONTEND (Planner & Goals)

- Budget sandbox (simulation UI)
- Goal creation/tracking UI
- Recommendation interaction
- Cash flow timeline

**Output:** Full budget planning interface.

---

## PHASE 7 — AI ENHANCEMENT

- AI-powered categorization fallback
- Natural language insights
- Financial copilot (chat interface)

**Output:** Conversational financial assistant.

---

# 10. DATA MODEL PRINCIPLES

- **Normalized Transactions:** One transaction = one row
- **Category → Type Mapping:** Each category maps to Needs/Wants/Investments
- **Scenario-Based Budgeting:** Support multiple budget scenarios (conservative, balanced, aggressive)
- **Goal-Linked Planning:** Budget allocations can be tied to specific goals
- **Immutable History:** Past snapshots never modified (append-only for timeline)
- **Deterministic State:** Same inputs always produce same outputs

---

# 11. DESIGN PRINCIPLES

## 1. Deterministic Core

All financial logic must be predictable and explainable.

If user asks "Why is my savings rate 18%?", system must show exact calculation.

---

## 2. AI as Enhancement

AI improves **understanding**, NOT **correctness**.

Core calculations run without AI.
AI layer adds conversational explanations.

---

## 3. Low Friction

Minimal user input required.

- Auto-categorization (90%+ accuracy goal)
- Smart defaults for budgets
- One-click scenario simulations

---

## 4. Action-Oriented

Every feature must answer:
**"What should the user do next?"**

NOT: "You spent ₹8,000 on dining"
YES: "Reduce dining to ₹5,000 to meet savings goal"

---

## 5. Time-Aware

Financial decisions require context.

- Is this a one-time spike or a trend?
- Is behavior improving or degrading?
- Is the budget realistic based on history?

Timeline layer provides this context.

---

## 6. Constraint-Driven

Budgets must be valid before saving.

- Total = 100%
- Needs ≥ minimum threshold
- Goals are fundable

Invalid budgets are blocked, not silently accepted.

---

# 12. WHAT TO AVOID

- **Overusing AI:** Keep core logic deterministic
- **Overengineering ML Early:** Rule-based systems first
- **Building UI Before Logic:** Backend engines must work independently
- **Making Excel Clone:** This is a structured system with rules, not freeform spreadsheet
- **Ignoring Time:** Static snapshots miss behavioral patterns
- **Ignoring Cash Flow:** Monthly balance doesn't reveal liquidity issues
- **Vague Recommendations:** Every suggestion must be actionable

---

# 13. EXPECTED BEHAVIOR FROM AI ASSISTANT

When asked to generate:

## Code

- Must follow defined models and architecture
- Must be modular and production-ready
- Must maintain deterministic guarantees
- Must validate against constraint engine

## Docs

- Must align with system design
- Must not introduce inconsistencies
- Must explain **why**, not just **what**

## Features

- Must fit into existing phases
- Must not break core philosophy
- Must include constraint validation
- Must provide actionable outputs

---

# 14. FUTURE EXTENSIONS (DO NOT BUILD YET)

- AI categorization models (custom per user)
- Anomaly detection (unusual spending patterns)
- Predictive forecasting (future expense predictions)
- Community benchmarks (compare with similar users)
- Multi-currency support
- Investment portfolio tracking
- Tax optimization recommendations

---

# FINAL DIRECTIVE

This system is:

**NOT** → budgeting app  
**YES** → financial decision engine

All outputs must prioritize:

- **Correctness** (calculations must be accurate)
- **Clarity** (users must understand recommendations)
- **Actionability** (every insight leads to a decision)
- **Determinism** (same inputs → same outputs)

---

## Core Differentiators

1. **Closed-Loop Budget System** (Plan → Track → Compare → Simulate → Act)
2. **Constraint-Driven Planning** (Invalid budgets blocked, not warned)
3. **Time-Aware Recommendations** (Trends matter, not just snapshots)
4. **Cash Flow Reality** (Timing matters, not just totals)
5. **Priority-Based Trade-Offs** (Wants reduced before investments)
6. **Goal-Linked Budgeting** (Every allocation serves a purpose)
7. **Simulation Engine** (What-if scenarios with real-time validation)

This is a **financial operating system**, not a tracking tool.
