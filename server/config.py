from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""

    # Database
    DATABASE_URL: str = "postgresql://parth:pass123@postgres:5432/fintra"

    # JWT
    JWT_SECRET: str = "your-secure-random-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60*24*7  # 7 days

    # Email (development)
    EMAIL_FROM: str = "noreply@fintra.app"
    EMAIL_HOST: str = "console"  # console, smtp

    # Redis (optional)
    REDIS_URL: str = "redis://redis:6379"

    # Server
    PORT: int = 8000

    # OCR Configuration
    OCR_ENABLED: bool = True
    OCR_LANGUAGE: str = "eng"
    TESSERACT_PATH: Optional[str] = None  # Path to tesseract binary

    # AI Classification
    AI_CLASSIFICATION_ENABLED: bool = True
    AI_MODEL_PROVIDER: str = "groq"  # groq, openai, anthropic, local
    AI_MODEL_NAME: str = "llama-3.1-8b-instant"  # Groq model
    AI_API_KEY: Optional[str] = None
    AI_CLASSIFICATION_COST_LIMIT: float = 10.0  # Monthly cost limit in USD
    
    # AI Learning (Phase 1 - Optimization)
    AI_LEARN_PATTERNS: bool = True  # Auto-create rules from successful AI classifications
    AI_BATCH_SIZE: int = 15  # Number of transactions to classify in a single batch
    AI_CONFIDENCE_THRESHOLD: float = 0.80  # Min confidence (0.0-1.0) to create learned rule
    AI_BATCH_ENABLED: bool = True  # Enable batch classification for uploads

    # File Processing
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: list = [".pdf", ".csv", ".xls", ".xlsx"]
    UPLOAD_DIR: str = "uploads"

    # Budget Alert Configuration
    BUDGET_ALERT_THRESHOLD: float = 0.80  # Alert when 80% of budget used
    BUDGET_WARNING_THRESHOLD: float = 0.90  # Warning when 90% used
    BUDGET_OVERSPEND_ALERT: bool = True  # Alert on overspend
    ENABLE_BUDGET_NOTIFICATIONS: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
