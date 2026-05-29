"""Pytest configuration and fixtures for server tests."""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from database import Base
import os

# Use test database
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "sqlite:///./test.db")
IS_POSTGRES = "postgresql" in TEST_DATABASE_URL


@pytest.fixture(scope="session")
def engine():
    """Create test database engine."""
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False} if "sqlite" in TEST_DATABASE_URL else {},
    )
    if IS_POSTGRES:
        Base.metadata.create_all(bind=engine)
    else:
        # Only create tables that are SQLite-compatible
        from models import User
        try:
            Base.metadata.create_all(bind=engine)
        except Exception:
            pass
    yield engine
    try:
        Base.metadata.drop_all(bind=engine)
    except Exception:
        pass


@pytest.fixture
def db(engine) -> Session:
    """Provide a database session for tests."""
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    yield session
    session.rollback()
    session.close()
