# Fintra - Financial Planning App

A production-grade financial planning web application with frontend and backend.

## Project Structure

```
Fintra/
├── client/           # Frontend (Next.js 16)
│   ├── src/          # Source code (app, components, lib, data)
│   ├── public/       # Static assets
│   └── node_modules/ # Dependencies
│
├── server/           # Backend (Python/CLI)
│   ├── finpilot/     # Main package
│   │   ├── cli.py           # CLI entry point
│   │   ├── engines/         # Business logic
│   │   │   ├── budget_engine.py
│   │   │   ├── categorizer.py
│   │   │   ├── goal_engine.py
│   │   │   ├── metrics.py
│   │   │   ├── parser.py
│   │   │   └── recommendation_engine.py
│   │   └── models/   # Data models
│   ├── samples/      # Sample data files
│   ├── tests/        # Backend tests
│   ├── requirements.txt
│   └── pyproject.toml
│
├── dev/              # Development utilities
└── README.md
```

## Tech Stack

- **Frontend**: Next.js 16 (App Router), Tailwind CSS, shadcn/ui, Recharts
- **Backend**: Python with CLI interface, financial engines
- **Font**: IBM Plex Sans

## Getting Started

### Frontend
```bash
cd client
npm install
npm run dev -- --webpack
```

### Backend
```bash
cd server
pip install -r requirements.txt
python -m finpilot --help
```

Open http://localhost:3000

## Features

### Frontend
- Dashboard with net worth, cash flow, savings rate
- Transaction management with filters
- Financial goals tracking
- AI-powered insights
- Settings & preferences

### Backend (CLI)
- Budget engine for financial calculations
- Transaction categorizer
- Goal tracking engine
- Financial metrics calculator
- Recommendation engine
- Document parser (CSV, XLS, XLSX, PDF)# Fintra
