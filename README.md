# Fintra — Financial Decision Engine

> **Not a budgeting app. A financial operating system.**

Fintra transforms bank statements into intelligent financial decisions. It's a closed-loop system that helps you **plan**, **track**, **compare**, **simulate**, and **act** on your finances—turning data into actionable insights.

---

## 🎯 What Sets Fintra Apart

| Traditional Budget App | Fintra |
|---|---|
| "You spent ₹8,000 on dining" | "Reduce dining by ₹3,000 to meet your goal" |
| Manual category tagging | Auto-categorization with rule learning |
| Static budget numbers | Real-time simulation engine (what-if scenarios) |
| Tracking only | Closed-loop: Plan → Track → Compare → Simulate → Act |
| Spreadsheet-like | Financial constraint system with hard rules |

Fintra enforces **financial rules** (e.g., "needs must be ≥25% of income") and prevents invalid budgets from being saved.

---

## 🎨 Core Differentiators

### 1. **Closed-Loop Budget System**
- **Plan:** Define allocation across Needs (essentials), Wants (lifestyle), Investments (future)
- **Track:** Auto-categorized transactions from bank uploads
- **Compare:** Real-time actual vs planned with deviation detection
- **Simulate:** What-if scenarios with instant constraint validation
- **Act:** Severity-ranked recommendations with trade-off explanations

### 2. **Constraint-Driven Planning**
Hard constraints that block invalid budgets:
- **Total allocation must = 100%** (or total income)
- **Needs ≥ 25%** of income (minimum survival threshold)
- **Goals ≥ monthly commitment** (if you have goals, you must fund them)

Soft constraints that warn:
- Needs > 50% (housing may be too expensive)
- Wants < 10% (quality of life impact)
- Investments < 15% (insufficient wealth building)

### 3. **Goal-Linked Budgeting**
- Create savings goals (house, education, vacation) with deadlines
- System auto-calculates monthly requirement
- Budget allocations directly linked to goal progress
- Feasibility scoring: Can you afford this goal?
- Recommendation: Adjust timeline or reduce discretionary spending

### 4. **Time-Aware Insights**
- **Monthly snapshots:** Immutable historical records
- **Rolling averages:** 3-month, 6-month, 12-month trends
- **Behavioral drift detection:** Identifies when actual behavior diverges from intended budget
- **Trend analysis:** Is your savings rate improving or degrading?

### 5. **Cash Flow Reality Check**
- Tracks intra-month liquidity (not just monthly totals)
- Alerts if balance drops below minimum mid-month
- Detects front-loaded expenses (rent, EMIs early in month)
- Recommendations: Adjust payment timing, not just amounts

### 6. **AI-Enhanced, Not AI-Driven**
- Deterministic core: All calculations are explainable
- AI only for: Transaction categorization fallback, natural language explanations
- **No ML in core logic** — all financial rules are rule-based and verifiable

---

## 📊 The 50/30/20 Budget Framework

Fintra uses a customizable allocation model (default: 50/30/20):

```
Income: ₹100,000
│
├─ Needs: 50% → ₹50,000 (essentials: rent, food, transport, insurance)
├─ Wants: 30% → ₹30,000 (lifestyle: dining, subscriptions, hobbies)
└─ Investments: 20% → ₹20,000 (wealth-building: SIPs, emergency fund, goals)
```

**Modified for early professionals:**
- Needs: 25–40%
- Wants: 20–30%
- Investments: 30–50%

Users can customize percentages, add custom categories, and tie allocations to specific goals.

---

## ✨ Implemented Features

### ✅ Phase 1-4: Core Engine (Complete)

#### Authentication & User Management
- Email/password registration with strength validation
- JWT-based authentication (configurable expiry: default 7 days)
- Password reset via token
- User preferences & settings

#### Transaction Management
- **Bank statement upload:** CSV, Excel, PDF support
- **Multi-account:** Track spending across multiple bank accounts
- **Smart categorization:** Rule-based + keyword matching + user learning
- **Manual override:** User corrections feed back into rules (learning)
- **Filtering & search:** By date, category, amount, merchant, account
- **Pagination:** Efficient large dataset handling
- **URL state persistence:** Filters survive page navigation

#### Category System
- **System categories:** Pre-built Needs/Wants/Investments framework
- **User categories:** Create custom categories tied to budget types
- **Category mappings:** Rules for automatic merchant → category assignment
- **Learning:** User corrections auto-create mapping rules

#### Budget Management
- **Budget creation:** Percentage or absolute-value allocation
- **Historical analysis:** Analyze past spending to inform budgets
- **Real-time tracking:** Actual vs planned with deviation detection
- **Multiple budgets:** Support different scenarios (conservative, balanced, aggressive)
- **Constraint validation:** Prevents invalid allocations

#### Budget Scenarios (Simulation Engine)
- **What-if modeling:** "What if I reduce dining by ₹5,000?"
- **Real-time recomputation:** All metrics update instantly
- **Constraint validation:** Simulations respect hard/soft rules
- **Multi-scenario comparison:** Compare side-by-side
- **Rollback:** Reset to original budget

#### Goal Management
- **Goal creation:** Define amount + deadline (e.g., "MacBook in 6 months")
- **Monthly requirement:** Auto-calculated based on gap + timeline
- **Feasibility scoring:** How likely is this goal?
- **Milestones:** Track progress with sub-goals
- **Contribution tracking:** Manual contributions or auto-link to budget
- **Timeline adjustment:** System suggests extending deadline if underfunded

#### Recommendations Engine
- **Budget adjustments:** "Reduce wants by ₹5k to meet savings goal"
- **Behavioral insights:** "Your actual spending is 15% above budget for 3 months"
- **Goal-based:** "Pause emergency fund to afford vacation goal" + trade-off analysis
- **Cash flow alerts:** "Your balance drops to ₹1,200 by Day 18"
- **Severity ranking:** Critical, High, Medium, Low with priorities
- **Trade-off explanations:** Shows what user gains and gives up

#### Spending Analytics
- **Savings rate:** (Income - Expenses) / Income
- **Burn rate:** Total expenses / income
- **Category ratios:** Needs/Wants/Investments as % of income
- **Spending trends:** 3-month, 6-month, 12-month rolling averages
- **Category breakdowns:** Detailed spending by category
- **Period comparison:** Current month vs historical baseline

#### AI-Powered Classification
- **Groq LLaMA 3.1:** For ambiguous transaction descriptions
- **Fallback categorization:** When rules don't match
- **User override:** Corrections create new rules (learning system)
- **Optional:** Can be disabled in settings

#### File Processing
- **PDF bank statements:** OCR extraction via Tesseract
- **Excel/CSV:** Pandas-based parsing
- **Deduplication:** Identifies duplicate transactions
- **Data normalization:** Standardizes amounts, dates, descriptions
- **Validation:** Ensures data integrity before DB insert

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│         Frontend (Next.js 15 + React 18)            │
│  ┌────────────────────────────────────────────────┐ │
│  │  Dashboard | Transactions | Goals | Budgets    │ │
│  │  Simulator | Recommendations | Settings        │ │
│  └────────────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────────┘
                     │ REST API
┌────────────────────┴────────────────────────────────┐
│         FastAPI Server (Port 8000)                  │
│  ┌────────────────────────────────────────────────┐ │
│  │  Auth  │ Transactions │ Categories │ Budgets   │ │
│  │  Goals │ Recommendations │ Scenarios           │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │     Financial Engines (Business Logic)         │ │
│  │  ├─ Budget Engine (allocation, deviation)      │ │
│  │  ├─ Goal Engine (tracking, feasibility)        │ │
│  │  ├─ Metrics Engine (calculations)              │ │
│  │  ├─ Timeline Engine (history, trends)          │ │
│  │  ├─ Recommendation Engine                      │ │
│  │  └─ AI Classifier (Groq LLaMA)                 │ │
│  └────────────────────────────────────────────────┘ │
└────────────┬───────────────────────────┬────────────┘
             │                           │
    ┌────────▼────────┐        ┌────────▼────────┐
    │   PostgreSQL    │        │      Redis      │
    │  (data store)   │        │  (cache/queue)  │
    └─────────────────┘        └─────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15, React 18, TypeScript, Tailwind CSS, Lucide Icons |
| **Backend** | FastAPI, Uvicorn, SQLAlchemy ORM, Pydantic v2 |
| **Database** | PostgreSQL 15, Redis (optional caching) |
| **Authentication** | JWT (HS256), bcrypt |
| **File Processing** | pandas, openpyxl, pdfplumber, pytesseract |
| **AI/LLM** | Groq, OpenAI API, Anthropic Claude |
| **Validation** | Pydantic models with custom validators |
| **Logging** | Python logging, structured logs |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.11
- **Docker & Docker Compose** (optional, recommended)
- **PostgreSQL** 15 (or use Docker)
- **Redis** (optional, for caching)

### Local Development (Docker Recommended)

```bash
# Clone the repository
git clone <repo-url>
cd fintra

# Start all services
docker-compose up -d

# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Local Development (Without Docker)

#### Backend Setup

```bash
cd server

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your database and API keys

# Setup database (PostgreSQL required)
# Ensure PostgreSQL is running and accessible

# Run migrations (using Alembic)
alembic upgrade head

# Start backend server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Setup

```bash
cd client

# Install dependencies
npm install

# Create .env.local
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF

# Start dev server
npm run dev

# Open http://localhost:3000
```

### Environment Variables

#### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/fintra

# JWT (token expiry in minutes: 1 day = 1440, 1 week = 10080)
JWT_SECRET=your-secure-random-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080

# Optional: Redis (for caching, session store)
REDIS_URL=redis://localhost:6379

# AI/LLM
AI_MODEL_PROVIDER=groq  # groq, openai, anthropic
AI_API_KEY=your-api-key
AI_MODEL_NAME=llama-3.1-8b-instant

# OCR (optional)
OCR_ENABLED=true
TESSERACT_PATH=/usr/bin/tesseract  # Linux/Mac

# File Upload
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_DIR=uploads
```

#### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 📚 API Documentation

All endpoints require authentication (Bearer token in Authorization header).

### Authentication

```
POST   /api/auth/signup              — Register new user
POST   /api/auth/login               — Get JWT token
POST   /api/auth/logout              — Logout
POST   /api/auth/forgot-password     — Request password reset
POST   /api/auth/reset-password      — Reset password
GET    /api/auth/me                  — Get current user
```

### Transactions

```
GET    /api/transactions              — List all transactions (paginated, filterable)
POST   /api/transactions              — Create transaction manually
GET    /api/transactions/{id}         — Get transaction details
PATCH  /api/transactions/{id}         — Update transaction (category, amount, etc.)
DELETE /api/transactions/{id}         — Delete transaction

POST   /api/upload                    — Upload bank statement (CSV/Excel/PDF)
GET    /api/upload/{id}               — Get upload history
```

### Categories

```
GET    /api/categories                — List user categories
GET    /api/categories/system         — List system categories
POST   /api/categories                — Create custom category
PATCH  /api/categories/{id}           — Update category
DELETE /api/categories/{id}           — Delete category

GET    /api/category-mappings         — List category rules
POST   /api/category-mappings         — Create mapping rule
PATCH  /api/category-mappings/{id}    — Update mapping
DELETE /api/category-mappings/{id}    — Delete mapping
POST   /api/category-mappings/test    — Test rule matching
```

### Budgets

```
POST   /api/budgets                   — Create budget
GET    /api/budgets                   — List user budgets
GET    /api/budgets/{id}              — Get budget + breakdown
PATCH  /api/budgets/{id}              — Update budget allocation

GET    /api/budgets/{id}/history-analysis      — Historical spending analysis
GET    /api/budgets/{id}/recommendations      — Get recommendations
GET    /api/budgets/{id}/reports               — Get budget reports
```

### Budget Scenarios (Simulations)

```
POST   /api/budgets/{id}/scenarios/simulate    — Run what-if simulation
GET    /api/budgets/{id}/scenarios             — List saved scenarios
DELETE /api/budgets/{id}/scenarios/{scenario}  — Delete scenario
```

### Budget Alerts

```
GET    /api/budgets/alerts            — List alerts
POST   /api/budgets/alerts            — Create alert rule
PATCH  /api/budgets/alerts/{id}       — Update alert
DELETE /api/budgets/alerts/{id}       — Delete alert
```

### Goals

```
POST   /api/goals                     — Create goal
GET    /api/goals                     — List goals
GET    /api/goals/{id}                — Get goal + progress
PATCH  /api/goals/{id}                — Update goal
DELETE /api/goals/{id}                — Delete goal

POST   /api/goals/{id}/contribute     — Add contribution to goal
GET    /api/goals/{id}/analysis       — Goal feasibility + gap analysis
GET    /api/goals/{id}/milestones     — Get milestones
POST   /api/goals/{id}/milestones     — Create milestone
```

### Recommendations

```
GET    /api/recommendations           — Get all recommendations
GET    /api/recommendations?category=budget&status=active   — Filter recommendations
```

### Analytics

```
GET    /api/analytics/spending-trends            — Spending over time
GET    /api/analytics/category-insights         — Category breakdown + trends
GET    /api/analytics/budget-comparison/{id}    — Compare budget vs actual
```

### Full API Documentation

Visit **http://localhost:8000/docs** for interactive Swagger UI with request/response examples.

---

## 🧪 Testing

### Backend Tests

```bash
cd server
python -m pytest tests/ -v                    # Run all tests
python -m pytest tests/test_budget_engine.py  # Run specific test file
python -m pytest -k "test_savings_rate"       # Run tests matching pattern
```

### Frontend Tests

```bash
cd client
npm test                  # Run unit tests
npm run test:coverage     # Coverage report
```

---

## 📦 Database Schema

Key models:

- **User:** Authentication + preferences
- **Transaction:** Bank statement entries with category
- **Category:** Needs/Wants/Investments + custom categories
- **CategoryMapping:** Rules for automatic categorization
- **Budget:** Allocation plan + constraints
- **BudgetReport:** Historical spending breakdown
- **BudgetScenario:** Saved what-if simulations
- **Goal:** Savings goals with deadlines
- **GoalMilestone:** Sub-goals + tracking
- **Recommendation:** System-generated actions
- **BankAccount:** Multi-account support
- **RefreshToken:** Session management (if needed)

Run migrations with Alembic:

```bash
cd server
alembic upgrade head        # Apply all migrations
alembic revision --autogenerate -m "Add new table"  # Generate migration
```

---

## 🔒 Security

- **JWT-based auth:** Stateless, expiring tokens (configurable)
- **Password hashing:** bcrypt with salt
- **CORS:** Configured for localhost development
- **Input validation:** Pydantic models with validators
- **SQL injection prevention:** SQLAlchemy parameterized queries
- **Decimal math:** Python `Decimal` for financial calculations (no floating-point errors)

### Production Checklist

- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Set `JWT_EXPIRE_MINUTES` to appropriate duration (1440 = 1 day, 10080 = 1 week)
- [ ] Update `CORS` origins to production domain
- [ ] Use environment secrets manager (AWS Secrets Manager, HashiCorp Vault)
- [ ] Enable HTTPS/TLS
- [ ] Set `DATABASE_URL` to managed PostgreSQL (AWS RDS, Azure Database)
- [ ] Configure backups and disaster recovery
- [ ] Set up monitoring and logging (Sentry, DataDog, etc.)
- [ ] Use managed Redis for sessions/cache (optional)

---

## 🎓 Understanding Fintra's Philosophy

Fintra is built on core principles explained in depth in [Project.md](Project.md):

1. **Deterministic Core:** All financial calculations are rule-based and explainable
2. **AI as Enhancement:** LLMs improve understanding, not core logic
3. **Constraint-Driven:** Invalid budgets are blocked, not warned
4. **Closed-Loop System:** Plan → Track → Compare → Simulate → Act
5. **Time-Aware:** Trends matter more than snapshots
6. **Action-Oriented:** Every recommendation leads to a decision

**Read [Project.md](Project.md) for:**
- Detailed budget architecture
- Constraint engine design
- Timeline layer implementation
- Recommendation engine logic
- Development roadmap (phases 1-7)

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Read [Project.md](Project.md) to understand the philosophy
2. Check existing [tasks](task*.md) for planned work
3. Follow the development phases (don't build everything at once)
4. Write tests for new features
5. Ensure backward compatibility
6. Document changes in commit messages

### Development Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes + test locally
npm run test         # frontend
python -m pytest     # backend

# Commit with clear message
git commit -m "feat: add budget constraint validation"

# Push and open PR
git push origin feature/your-feature
```

---

## 📈 Deployment

### Docker Deployment

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services
docker-compose down
```

### Production Deployment (Example: AWS)

```bash
# Push to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker build -t fintra-backend ./server
docker tag fintra-backend:latest <account>.dkr.ecr.<region>.amazonaws.com/fintra-backend:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/fintra-backend:latest

# Deploy with ECS/EKS
# (Use Terraform or CloudFormation for IaC)
```

See deployment guides in `docs/deployment/` (if available).

---

## 🐛 Troubleshooting

### Backend Won't Start

```bash
# Check PostgreSQL is running
psql -U parth -d fintra -c "SELECT 1"

# Verify .env file
cat server/.env

# Check logs
docker-compose logs backend

# Restart
docker-compose down
docker-compose up -d
```

### Frontend Can't Connect to API

```bash
# Verify API URL in .env.local
cat client/.env.local

# Test API connectivity
curl http://localhost:8000/docs

# Check CORS in network tab (browser dev tools)
```

### Transaction Upload Fails

```bash
# Verify file format (CSV, Excel, PDF)
# Check file size (<10MB)
# Ensure columns match expected format

# View upload logs
docker-compose logs backend | grep upload
```

---

## 📊 Key Metrics

### What Fintra Tracks

- **Savings Rate:** (Income - Expenses) / Income × 100
- **Investment Rate:** Investments / Income × 100
- **Burn Rate:** Total Expenses / Income × 100
- **Category Ratios:** Each category as % of income
- **Goal Progress:** Current saved / Target amount
- **Budget Health:** Variance between planned and actual
- **Behavioral Drift:** How much actual differs from budget over time

All metrics update **in real-time** during simulations.

---

## 🗺️ Roadmap

Current Phase: **4/7** (Timeline & Cash Flow partially complete)

- ✅ Phase 1: Core Engine (Transactions, Categories, Basic Budgets)
- ✅ Phase 2: Budget Engine (Constraints, Simulations, Recommendations)
- ✅ Phase 3: Goal Engine (Goals, Milestones, Feasibility)
- 🔄 Phase 4: Timeline & Cash Flow (Snapshots, Trends, Behavioral Drift)
- ⏳ Phase 5: Frontend Dashboard (Visualization, Charts, Real-time updates)
- ⏳ Phase 6: Frontend Planner (Simulation UI, Goal Tracking, Full UX)
- ⏳ Phase 7: AI Enhancement (Natural language, Financial copilot)

See [Project.md](Project.md) for detailed phase breakdown and current work.

---

## 📖 Documentation

- **[Project.md](Project.md)** — Complete product vision, architecture, design decisions
- **[BUDGET_IMPLEMENTATION_ROADMAP.md](BUDGET_IMPLEMENTATION_ROADMAP.md)** — Budget system technical spec
- **[API Docs](http://localhost:8000/docs)** — Interactive Swagger UI (local only)
- **[Development Logs](task*.md)** — Implementation progress and decisions

---

## 📝 License

Fintra is available for personal and educational use. See LICENSE file for details.

---

## 👤 Author

Built by Parth — A financial decision engine for early professionals and developers.

---

## 💬 Questions?

- **Product Questions:** Read [Project.md](Project.md)
- **Technical Questions:** Check API docs or explore `/server` and `/client` code
- **Setup Issues:** See [Troubleshooting](#-troubleshooting) section
- **Contributing:** See [Contributing](#-contributing) guidelines

---

**Fintra: Where data becomes decisions. 📊✨**
