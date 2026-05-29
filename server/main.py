import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from auth.router import router as auth_router
from routers import transaction, category, category_mapping, bank_account, upload
from routers.budget import router as budget_router
from routers.budget_category import router as budget_category_router
from routers.budget_report import router as budget_report_router
from routers.budget_scenario import router as budget_scenario_router
from routers.scenario_event import router as scenario_event_router
from routers.budget_alert import router as budget_alert_router
from routers.goal import router as goal_router
from routers.recommendation import router as recommendation_router
from routers.user_preferences import router as user_preferences_router
from config import settings
from db_init import run_startup_database_initialization, DatabaseInitializationError
from database import engine
from sqlalchemy import text
from fastapi import HTTPException

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown."""
    # Startup
    logger.info("Starting up Fintra API...")
    app.state.db_initialized = False

    try:
        db_status = run_startup_database_initialization()
        app.state.db_initialized = True
        logger.info(
            "Startup database initialization complete",
            extra={
                "current_revision": db_status["current_revision"],
                "head_revisions": db_status["head_revisions"],
            },
        )
    except DatabaseInitializationError:
        logger.exception("Application startup failed during DB initialization")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down Fintra API...")


# Create FastAPI application
app = FastAPI(
    title="Fintra API",
    description="Financial Planning App API",
    version="1.0.0",
    lifespan=lifespan,
)
app.state.db_initialized = False

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://13.202.28.196:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include authentication router
app.include_router(auth_router, prefix="/api")

# Include transaction routers
app.include_router(transaction.router, prefix="/api")
app.include_router(category.router, prefix="/api")
app.include_router(category_mapping.router, prefix="/api")
app.include_router(bank_account.router, prefix="/api")
app.include_router(upload.router, prefix="/api")

# Include budget routers (alert router must be before budget router to match /budgets/alerts first)
app.include_router(budget_alert_router, prefix="/api")
app.include_router(budget_router, prefix="/api")
app.include_router(budget_category_router, prefix="/api")
app.include_router(budget_report_router, prefix="/api")
app.include_router(budget_scenario_router, prefix="/api")
app.include_router(scenario_event_router)

# Include goal router
app.include_router(goal_router, prefix="/api")

# Include recommendation router
app.include_router(recommendation_router, prefix="/api")

# Include user preferences router
app.include_router(user_preferences_router, prefix="/api")


@app.get("/health")
def health_check():
    """Health check endpoint."""
    if not getattr(app.state, "db_initialized", False):
        raise HTTPException(status_code=503, detail="Database is not initialized")

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"Database health check failed: {exc}") from exc

    return {"status": "ok", "service": "fintra-api", "database_initialized": True}


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "message": "Fintra API",
        "version": "1.0.0",
        "docs": "/docs"
    }
