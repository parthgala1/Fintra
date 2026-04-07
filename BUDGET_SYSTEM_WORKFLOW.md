# How Our Budget System Works (Plain English Guide)

**For:** Non-technical stakeholders, product managers, business analysts  
**Purpose:** Understand what Fintra does today, what's missing, and why it matters  
**Last Updated:** April 1, 2026

---

## 📊 What We Have Today

### The Big Picture

Think of Fintra as a **financial assistant** that helps people understand their money. Right now, it's like having a smart calculator that can:

1. **Read bank statements** (like scanning a receipt)
2. **Organize spending** (like sorting receipts into folders)
3. **Track budgets** (like a spending limit alert)
4. **Show reports** (like a monthly summary)

But according to our vision document (Project.md), Fintra should be more than a calculator—it should be a **decision engine** that tells people: **"What should I do next?"**

---

## 🏗️ Current System: What Works

### 1. Upload Bank Statements ✅
**What happens:**
- User uploads a CSV file from their bank
- System reads the file and extracts transactions (date, amount, description)
- Each transaction gets stored in the database

**Real-world analogy:** Like taking a photo of your credit card bill, and the app automatically types out every line item.

**Status:** ✅ **Working perfectly**

---

### 2. Automatic Categorization ✅
**What happens:**
- System looks at each transaction description ("Starbucks", "Uber", "Rent")
- Matches it against rules (e.g., "If description contains 'Starbucks' → Category: Food & Dining")
- Assigns a category (Needs, Wants, or Savings/Investment)

**Real-world analogy:** Like having an assistant who reads your receipts and puts sticky notes on them: "This is food", "This is entertainment", "This is rent".

**Status:** ✅ **Working** (rule-based matching exists, but AI fallback is not implemented yet)

---

### 3. Budget Creation (50/30/20 Rule) ✅
**What happens:**
- User says: "My monthly income is ₹80,000"
- System calculates:
  - **Needs** (essentials): ₹40,000 (50%)
  - **Wants** (lifestyle): ₹24,000 (30%)
  - **Savings/Investment**: ₹16,000 (20%)
- User can adjust these percentages if needed

**Real-world analogy:** Like a financial advisor saying: "Based on your income, here's how you should split your money across rent, fun, and savings."

**Status:** ✅ **Working perfectly**

---

### 4. Budget Reports (Planned vs Actual) ✅
**What happens:**
- System compares:
  - What you **planned** to spend (budget)
  - What you **actually** spent (transactions)
- Shows deviations: "You spent ₹5,000 more than planned on Wants"

**Real-world analogy:** Like comparing your shopping list (what you planned to buy) with your receipt (what you actually bought).

**Status:** ✅ **Working perfectly**

---

### 5. Budget Sandbox (What-If Scenarios) ✅
**What happens:**
- User can create "scenarios": "What if I increase savings to 25%?"
- System recalculates the budget without changing the real budget
- User can compare multiple scenarios side-by-side

**Real-world analogy:** Like playing with a spreadsheet: "If I save more, where does that money come from?" You can experiment without committing.

**Status:** ✅ **Working** (API and backend exist, need to verify frontend UX)

---

### 6. Budget Alerts ⚠️
**What happens:**
- When spending reaches 80% of budget → Warning alert
- When spending reaches 90% → Critical alert
- When spending exceeds 100% → Overspend alert
- Alerts show in the app (and could be sent via email/push notifications)

**Real-world analogy:** Like a gas gauge in your car: "You're at 80% capacity", "You're almost out!", "You've overspent!"

**Status:** ⚠️ **Partially working** (alerts generate correctly, but proactive dashboard display and email/push notifications need verification)

---

## 🚨 What's Missing (CRITICAL GAPS)

### The Core Problem

Right now, Fintra answers: **"What did I spend?"**  
But it should answer: **"What should I do next?"**

This is the difference between a **budgeting app** and a **financial decision engine**.

---

## 🎯 Missing Feature #1: Goal Engine (HIGHEST PRIORITY)

### What It Should Do

Allow users to set financial goals and get a clear plan to achieve them.

**Example:**
- User says: "I want to save ₹150,000 for an emergency fund by December 2026."
- System calculates:
  - **Months remaining:** 8 months
  - **Required monthly saving:** ₹18,750/month
  - **Current savings rate:** ₹12,000/month
  - **Gap:** ₹6,750/month short
  - **Feasibility:** 64% (not on track)

**What the user sees:**
- A dashboard showing progress: "57% complete, ₹85,000 saved so far"
- A clear message: "You need to save ₹6,750 more per month to reach your goal on time."
- Action buttons: "Adjust goal", "See recommendations"

### Why It's Missing

**Backend:** The database tables exist (Goal, GoalReport), but there's no code to:
- Calculate required monthly contributions
- Analyze feasibility
- Detect if user is on/off track
- Provide recommendations

**API:** No endpoints exist (`/api/goals` doesn't exist yet)

**Frontend:** No pages to:
- Create a goal
- View goal progress
- Track contributions

**Impact:** This is the **PRIMARY DIFFERENTIATOR** in our vision document. Without it, we're just another budget tracker.

### Real-World Analogy

Imagine a fitness app that tracks your weight but doesn't let you set a weight loss goal or tell you if your diet/exercise plan will work. That's where we are now.

---

## 💡 Missing Feature #2: Recommendation Engine (HIGH PRIORITY)

### What It Should Do

Give users **actionable advice** based on their financial data.

**Example Scenarios:**

**Scenario A: Budget Overspending**
- **Observation:** User spent ₹29,000 on Wants (budgeted: ₹24,000)
- **Recommendation:**
  - Title: "Reduce Wants spending by ₹5,000"
  - Actions:
    1. Review recent entertainment expenses
    2. Cancel unused subscriptions (Netflix, Spotify)
    3. Set up spending alerts for dining out

**Scenario B: Goal Not Achievable**
- **Observation:** User wants ₹150,000 in 6 months but only saving ₹10,000/month
- **Recommendation:**
  - Title: "Increase savings by ₹15,000/month or extend deadline"
  - Actions:
    1. Option A: Reduce Wants by ₹15,000 (cut subscriptions, dining, shopping)
    2. Option B: Extend goal deadline to 15 months (achievable with current savings)
    3. Option C: Find additional income source (freelance, side hustle)

**Scenario C: Savings Opportunity**
- **Observation:** User has ₹20,000 sitting unused in checking account
- **Recommendation:**
  - Title: "Move ₹15,000 to emergency fund goal"
  - Actions:
    1. Transfer ₹15,000 to savings account
    2. Update emergency fund progress
    3. Keep only ₹5,000 as buffer

### Why It's Missing

**Backend:** The database table exists (Recommendation), but there's no code to:
- Analyze budget deviations and generate recommendations
- Analyze goal feasibility and suggest adjustments
- Prioritize recommendations by impact

**API:** No endpoints exist (`/api/recommendations` doesn't exist yet)

**Frontend:** No page to view and interact with recommendations

**Current Workaround:** Dashboard shows a hardcoded "Quick Insight" that says: "Your savings rate is 34.5% — above the recommended 20%! You could reach your emergency fund goal 2 months earlier..."

**The problem:** This is fake/static text. It doesn't change based on the user's real data.

### Real-World Analogy

Imagine Google Maps showing you your location but not giving you turn-by-turn directions. That's where we are—we show the problem but don't suggest solutions.

---

## ⏱️ Missing Feature #3: Time-to-Earn (HIGH PRIORITY)

### What It Should Do

Show users how many **hours of work** each purchase costs.

**Example:**
- User's monthly income: ₹80,000
- Working hours per month: 160 hours (8 hours/day × 20 days)
- Hourly rate: ₹500/hour

**Transaction Display:**
- Starbucks coffee (₹350) → **"0.7 hours of work"**
- Movie ticket (₹500) → **"1 hour of work"**
- New shoes (₹4,000) → **"8 hours of work"** (1 full workday!)

### Why It Matters

This is a **behavioral psychology** feature. Research shows that when people see the "time cost" of purchases, they spend less on impulse items.

**Example:**
- Seeing "₹350" for coffee? Feels cheap.
- Seeing "0.7 hours of work" for coffee? Makes you think twice.

### Why It's Missing

**Backend:** The database table exists (TimeToEarn), but there's no code to:
- Calculate hourly rate from user's income
- Calculate time cost for each transaction
- Cache calculations for performance

**API:** No dedicated endpoints (could be added to `/api/transactions/{id}/time-to-earn`)

**Frontend:** No display in:
- Transaction list (should show badge: "2 hours")
- Transaction detail (should show breakdown)
- Settings page (user should be able to set hourly rate or auto-calculate)

### Real-World Analogy

Imagine a calorie counter that shows calories but never tells you "This burger = 1 hour of jogging." The time context changes behavior.

---

## 📊 Missing Feature #4: Burn Rate & Advanced Metrics (MEDIUM PRIORITY)

### What It Should Do

Calculate and display financial health metrics.

**Current Metrics (Working):**
- ✅ Savings rate: (Income - Expenses) / Income
- ✅ Investment rate: Investments / Income
- ✅ Needs ratio: Needs / Income
- ✅ Wants ratio: Wants / Income

**Missing Metric:**
- ❌ **Burn Rate:** How many months until money runs out
  - Formula: Savings / Monthly Expenses
  - Example: ₹50,000 savings ÷ ₹30,000/month expenses = **1.7 months runway**
  - Use case: Emergency fund planning ("You have 2 months of expenses saved")

### Why It Matters

Burn rate is critical for:
- Emergency fund planning (financial advisors recommend 3-6 months)
- Job loss scenarios (how long can you survive without income?)
- Cash flow management

### Real-World Analogy

Like a gas tank: "You have 200km left" vs "You can drive for 2 more hours at this speed."

---

## 🧠 Missing Feature #5: AI Insights (MEDIUM PRIORITY)

### What It Should Do

Generate **natural language insights** from spending patterns (using AI).

**Examples:**

**Pattern Detection:**
- "You spent 40% more on dining out this month compared to last month."
- "Your grocery spending has been decreasing for 3 months straight."
- "You have a recurring ₹999 charge from Netflix every month."

**Anomaly Detection:**
- "Unusual transaction detected: ₹25,000 at 'XYZ Electronics' (5x your average purchase)."
- "Your Wants spending jumped 200% this week—did something happen?"

**Trend Analysis:**
- "Your savings rate has improved from 15% to 25% over the last 6 months. Great job!"
- "If you maintain current spending, you'll exceed your annual budget by ₹50,000."

### Why It's Missing

**Backend:** The database table exists (AIInsight), but there's no code to:
- Analyze spending patterns
- Generate insights (can start with rule-based, add AI later)
- Categorize insights by type (spending, savings, anomaly, trend)

**API:** No endpoints exist (`/api/insights` doesn't exist yet)

**Frontend:** No insights page (currently dashboard shows 1 hardcoded insight)

### Current Workaround

Dashboard shows a fake insight: "Your savings rate is 34.5% — above the recommended 20%..."

### Real-World Analogy

Like a fitness app that tracks your runs but never tells you: "You're running faster than last month!" or "You tend to skip workouts on Mondays."

---

## 🏦 Missing Feature #6: Financial State Engine (MEDIUM PRIORITY)

### What It Should Do

Provide a **single source of truth** for the user's complete financial picture.

**What It Should Show:**
- **Assets:** Total money in all bank accounts
- **Liabilities:** Total debts (credit cards, loans)
- **Net Worth:** Assets - Liabilities
- **Income:** Monthly income (from transactions)
- **Expenses:** Monthly expenses (Needs + Wants)
- **Cash Flow:** Income - Expenses (how much is left each month)
- **Goals:** Number of active goals, total progress
- **Budget:** Current allocations and deviations

**Example Snapshot:**
```
Financial State - March 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Assets:          ₹250,000
Liabilities:     ₹30,000
Net Worth:       ₹220,000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Monthly Income:  ₹80,000
Monthly Expenses:₹52,400
Cash Flow:       ₹27,600 surplus
Savings Rate:    34.5%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Active Goals:    3 (2 on track, 1 at risk)
Budget Status:   On track (95% utilized)
```

### Why It Matters

Right now, the dashboard calculates everything on-the-fly from different sources:
- Budget data from `/api/budgets`
- Transaction data from `/api/transactions`
- Goal data (currently fake/mocked)

This is:
1. **Slow** (multiple API calls)
2. **Inconsistent** (different pages may show different numbers)
3. **Not scalable** (as data grows, calculations take longer)

**Solution:** Pre-calculate and cache the financial state as a daily snapshot.

### Real-World Analogy

Like a car dashboard—instead of calculating speed from wheel rotation every time you look, it caches the value and updates it every second.

---

## 📋 Summary: What's Working vs What's Missing

### ✅ Working Features

| Feature | Status | Impact |
|---------|--------|--------|
| CSV Upload | ✅ Working | ⭐⭐⭐⭐⭐ Essential |
| Transaction Categorization | ✅ Working | ⭐⭐⭐⭐⭐ Essential |
| Budget Creation (50/30/20) | ✅ Working | ⭐⭐⭐⭐⭐ Essential |
| Budget Reports | ✅ Working | ⭐⭐⭐⭐⭐ Essential |
| Budget Sandbox | ✅ Working | ⭐⭐⭐⭐ Important |
| Budget Alerts | ⚠️ Partial | ⭐⭐⭐⭐ Important |

### ❌ Missing Features (PRIORITY ORDER)

| Feature | Priority | Impact | Why It Matters |
|---------|----------|--------|----------------|
| **Goal Engine** | 🔥 HIGHEST | ⭐⭐⭐⭐⭐ Critical | **Core differentiator**—without this, we're just another budget app |
| **Recommendation Engine** | 🔥 HIGH | ⭐⭐⭐⭐⭐ Critical | Answers "What should I do next?"—the core philosophy |
| **Time-to-Earn** | 🔥 HIGH | ⭐⭐⭐⭐ Important | Changes spending behavior (psychology-backed) |
| **Burn Rate** | 🟡 MEDIUM | ⭐⭐⭐ Useful | Important for emergency fund planning |
| **Financial State** | 🟡 MEDIUM | ⭐⭐⭐ Useful | Performance and consistency (technical improvement) |
| **AI Insights** | 🟡 MEDIUM | ⭐⭐ Nice-to-have | Enhances understanding (can start with rules, add AI later) |

---

## 🚀 What We'll Build Next (Roadmap)

### Phase 1: Goal Engine (4-6 weeks)
**What users will get:**
- Create financial goals (emergency fund, trip, purchase)
- See if they're on track or falling behind
- Get required monthly contribution calculations
- View progress with visual indicators
- Receive alerts when falling behind

**Example User Journey:**
1. User clicks "Create Goal"
2. Enters: "Emergency Fund, ₹150,000, December 2026"
3. System shows: "You need to save ₹18,750/month. You're currently saving ₹12,000/month. Gap: ₹6,750/month."
4. User sees recommendations: "Reduce Wants by ₹6,750" or "Extend deadline to March 2027"
5. User tracks progress monthly

**Success Metric:** Users create at least 1 goal within first week of using the app.

---

### Phase 2: Recommendation Engine (3-4 weeks)
**What users will get:**
- Actionable recommendations (not just observations)
- Specific amounts and steps
- Prioritized by impact (highest impact first)
- Actions: Dismiss, Implement, or Snooze

**Example User Journey:**
1. User overspends on Wants by ₹5,000
2. System generates recommendation: "Reduce Wants by ₹5,000"
3. User clicks to see details: "Cancel ₹999 Netflix subscription, reduce dining out by ₹4,000"
4. User clicks "Implement" → System adjusts future budget
5. User tracks progress next month

**Success Metric:** Users implement at least 1 recommendation per month.

---

### Phase 3: Time-to-Earn (2-3 weeks)
**What users will get:**
- See "hours of work" for each transaction
- Configure hourly rate (or auto-calculate from income)
- Toggle display on/off
- Tooltip explanations

**Example User Journey:**
1. User goes to Settings → Time-to-Earn
2. Enters monthly income: ₹80,000
3. System calculates: ₹500/hour
4. User views transactions:
   - Coffee: ₹350 → "0.7 hours"
   - Shoes: ₹4,000 → "8 hours (1 workday)"
5. User thinks twice before impulse purchases

**Success Metric:** Users with time-to-earn enabled spend 10-15% less on Wants category.

---

### Phase 4: Burn Rate & Metrics (1-2 weeks)
**What users will get:**
- Runway calculation (months until broke)
- Emergency fund adequacy check
- Display in dashboard and reports

---

### Phase 5: Financial State Engine (2-3 weeks)
**What users will get:**
- Faster dashboard loading
- Consistent data across all pages
- Historical snapshots (month-over-month comparison)

---

### Phase 6: AI Insights (3-4 weeks)
**What users will get:**
- Pattern detection ("You spend more on weekends")
- Anomaly detection ("Unusual large purchase")
- Trend analysis ("Savings improving over time")
- Natural language explanations

---

## 🎯 The Ultimate Vision

When all features are complete, here's what a user's journey looks like:

### Morning (Check Dashboard)
- **Financial State:** "Net worth: ₹220,000 (+₹5,000 from last month)"
- **Budget Status:** "On track—used 85% of budget with 5 days left"
- **Goals:** "Emergency fund: 67% complete, MacBook: 30% complete"
- **Recommendation:** "Top priority: Increase emergency fund contribution by ₹3,000/month"

### Afternoon (Make a Purchase)
- **Transaction:** New headphones for ₹8,000
- **Time-to-Earn:** "This costs 16 hours of work (2 workdays)"
- **Budget Impact:** "This will use 33% of your Wants budget"
- **User decides:** "That's too expensive, I'll wait for a sale."

### Evening (Review Goals)
- **Goal Detail:** "Emergency fund: ₹100,000 / ₹150,000"
- **Analysis:** "You're ₹2,000/month short. Not on track."
- **Recommendations:**
  1. Reduce Wants by ₹2,000 (cancel gym membership)
  2. Extend deadline by 2 months
  3. Find side income of ₹2,000/month
- **User decides:** "I'll cancel my gym membership and work out at home."

### End of Month (Review Report)
- **Budget Report:** "Spent ₹52,400 / ₹64,000 budgeted. Under budget by ₹11,600!"
- **Insight:** "Your Wants spending decreased by 20% this month. Great job!"
- **Goal Update:** "Emergency fund grew by ₹14,000 this month. On track to complete by November 2026!"

---

## 🔑 Key Takeaways

### 1. Current State
Fintra works well as a **budgeting tool**:
- Tracks spending ✅
- Categorizes transactions ✅
- Shows budget reports ✅
- Alerts overspending ✅

### 2. The Gap
Fintra is **NOT yet** a **decision engine**:
- Doesn't help set and track financial goals ❌
- Doesn't give actionable recommendations ❌
- Doesn't change spending behavior ❌
- Doesn't provide a complete financial picture ❌

### 3. Why It Matters
Without these features, Fintra is **just another budget tracker**. There are dozens of those.

**Our differentiator** (per Project.md vision):
> "What should I do next?"

This requires:
- Goals (to know what you're working toward)
- Recommendations (to tell you how to get there)
- Behavioral features (to change habits)

### 4. Next Steps
Implement in priority order:
1. 🔥 **Goal Engine** (8 weeks) — CORE DIFFERENTIATOR
2. 🔥 **Recommendation Engine** (4 weeks) — CORE PHILOSOPHY
3. 🔥 **Time-to-Earn** (3 weeks) — BEHAVIORAL CHANGE
4. 🟡 **Burn Rate** (2 weeks) — IMPORTANT METRIC
5. 🟡 **Financial State** (3 weeks) — PERFORMANCE & CONSISTENCY
6. 🟡 **AI Insights** (4 weeks) — ENHANCEMENT

**Total estimated time:** 24 weeks (~6 months) for complete transformation from budget app to decision engine.

---

## ❓ Questions?

**Q: Why can't we use AI for everything?**  
A: Our vision document (Project.md Section 7) says: "AI should NOT be used for financial calculations, budget math, or goal math. These must remain deterministic." AI is only for natural language insights.

**Q: Why is Goal Engine so important?**  
A: Project.md Section 3.5 marks it as "CORE DIFFERENTIATOR." Without it, we're just tracking the past, not planning the future.

**Q: Can't users just use Excel for goals?**  
A: Yes, but:
- Excel requires manual entry
- Excel doesn't auto-update from transactions
- Excel doesn't generate recommendations
- Excel doesn't show real-time progress

Our system is **automated and intelligent**.

**Q: How do recommendations differ from insights?**  
A: **Insights** = observations ("You spent a lot on dining out")  
**Recommendations** = actions ("Reduce dining out by ₹5,000 by cooking 10 meals at home")

Our vision says: "Must output ACTIONS, not insights" (Section 6.5).

**Q: When will this be ready?**  
A: Depends on team capacity and priority. Recommended timeline: 6 months for full feature set.

---

## 📚 Appendix: Technical Terms Explained

**API (Application Programming Interface):**  
The "language" the frontend (website) uses to talk to the backend (database/logic). Like a waiter taking your order to the kitchen.

**Backend:**  
The server/database where all calculations and data storage happens. Like the kitchen in a restaurant.

**Frontend:**  
The user interface (what users see and click). Like the menu and dining area in a restaurant.

**Database Model:**  
The structure for storing data. Like filing cabinet drawers labeled "Transactions", "Budgets", "Goals".

**Service/Engine:**  
The code that performs calculations. Like a chef following recipes.

**Router/Endpoint:**  
The specific URL path for an API request. Like different phone extensions in a company (Ext. 100 for Sales, Ext. 200 for Support).

**Schema:**  
The format for sending/receiving data via API. Like a form with specific fields to fill out.

---

**Document Version:** 1.0  
**Created:** April 1, 2026  
**For questions, contact:** Product/Engineering Team
