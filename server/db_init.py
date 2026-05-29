import logging
import time
from pathlib import Path

from alembic import command
from alembic.config import Config as AlembicConfig
from alembic.script import ScriptDirectory
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from alembic.runtime.migration import MigrationContext

from config import settings
from data.seed_categories import create_system_categories
from database import Base, SessionLocal, engine

# Register all model tables on Base.metadata before any create_all/validation logic.
import models  # noqa: F401

logger = logging.getLogger(__name__)

_ALEMBIC_VERSION_TABLE = "alembic_version"


class DatabaseInitializationError(RuntimeError):
    """Raised when DB initialization or migration fails during startup."""


def _build_alembic_config() -> AlembicConfig:
    server_dir = Path(__file__).resolve().parent
    alembic_ini = server_dir / "alembic.ini"
    script_location = server_dir / "alembic"

    cfg = AlembicConfig(str(alembic_ini))
    cfg.set_main_option("script_location", str(script_location))
    cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
    return cfg


def _verify_database_connectivity(max_retries: int = 20, retry_delay_seconds: float = 2.0) -> None:
    """Retry database connectivity so container startup races do not fail boot."""
    last_error: Exception | None = None

    for attempt in range(1, max_retries + 1):
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            logger.info(
                "Database connection check succeeded",
                extra={"attempt": attempt, "max_retries": max_retries},
            )
            return
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            logger.warning(
                "Database connection check failed",
                extra={
                    "attempt": attempt,
                    "max_retries": max_retries,
                    "retry_delay_seconds": retry_delay_seconds,
                    "error": str(exc),
                },
            )
            if attempt < max_retries:
                time.sleep(retry_delay_seconds)

    raise DatabaseInitializationError(
        f"Unable to connect to database after {max_retries} attempts: {last_error}"
    )


def _migration_state(cfg: AlembicConfig) -> dict:
    script = ScriptDirectory.from_config(cfg)

    with engine.connect() as connection:
        context = MigrationContext.configure(connection)
        current_revision = context.get_current_revision()

        inspector = inspect(connection)
        existing_tables = {
            table_name for table_name in inspector.get_table_names() if table_name != _ALEMBIC_VERSION_TABLE
        }

    return {
        "current_revision": current_revision,
        "head_revisions": script.get_heads(),
        "has_existing_schema": bool(existing_tables),
        "existing_table_count": len(existing_tables),
    }


def _bootstrap_empty_database_to_head(cfg: AlembicConfig) -> None:
    """Initialize an empty DB once, then hand ownership to Alembic."""
    logger.warning(
        "Empty unversioned database detected. Bootstrapping schema from SQLAlchemy metadata and stamping Alembic head."
    )
    Base.metadata.create_all(bind=engine)
    command.stamp(cfg, "head")


def _validate_existing_schema_for_stamp() -> None:
    """Ensure unversioned schema has all current tables before stamping head."""
    with engine.connect() as connection:
        inspector = inspect(connection)
        existing_tables = set(inspector.get_table_names())

    expected_tables = set(Base.metadata.tables.keys())
    missing_tables = sorted(expected_tables - existing_tables)
    if missing_tables:
        preview = ", ".join(missing_tables[:8])
        raise DatabaseInitializationError(
            "Detected unversioned database with missing required tables. "
            f"Missing tables (sample): {preview}. "
            "Database appears partially initialized; run against a clean DB volume or migrate manually."
        )


def _missing_required_tables() -> list[str]:
    with engine.connect() as connection:
        inspector = inspect(connection)
        existing_tables = set(inspector.get_table_names())

    expected_tables = set(Base.metadata.tables.keys())
    return sorted(expected_tables - existing_tables)


def run_startup_database_initialization() -> dict:
    """Run connectivity check, migration/bootstrapping, and system seeding."""
    logger.info("Starting database initialization workflow")

    _verify_database_connectivity()

    alembic_cfg = _build_alembic_config()
    state_before = _migration_state(alembic_cfg)
    missing_before = _missing_required_tables()
    has_pending_migrations = state_before["current_revision"] not in set(state_before["head_revisions"])
    logger.info(
        "Migration state before initialization",
        extra={
            "current_revision": state_before["current_revision"],
            "head_revisions": state_before["head_revisions"],
            "pending_migrations": has_pending_migrations,
            "has_existing_schema": state_before["has_existing_schema"],
            "existing_table_count": state_before["existing_table_count"],
            "missing_required_table_count": len(missing_before),
        },
    )

    try:
        if not state_before["current_revision"] and not state_before["has_existing_schema"]:
            _bootstrap_empty_database_to_head(alembic_cfg)
        elif not state_before["current_revision"] and state_before["has_existing_schema"]:
            logger.warning(
                "Unversioned schema detected. Validating current schema and stamping Alembic head to reconcile legacy state."
            )
            _validate_existing_schema_for_stamp()
            command.stamp(alembic_cfg, "head")
            logger.info("Stamped unversioned schema to Alembic head")
        elif state_before["current_revision"] and not state_before["has_existing_schema"]:
            logger.warning(
                "Alembic revision exists but no application tables were found. Rebuilding schema from metadata and stamping head."
            )
            _bootstrap_empty_database_to_head(alembic_cfg)
        else:
            if missing_before:
                preview = ", ".join(missing_before[:8])
                raise DatabaseInitializationError(
                    "Database is versioned but schema is incomplete. "
                    f"Missing tables (sample): {preview}. "
                    "Refusing automatic migration because this indicates a partial/corrupt schema state."
                )
            command.upgrade(alembic_cfg, "head")
            logger.info("Alembic upgrade to head completed")
    except Exception as exc:  # noqa: BLE001
        logger.exception(
            "Database migration failed. Startup aborted.",
            extra={
                "current_revision": state_before["current_revision"],
                "head_revisions": state_before["head_revisions"],
                "has_existing_schema": state_before["has_existing_schema"],
            },
        )
        raise DatabaseInitializationError(
            "Failed to apply database migrations. Check startup logs for Alembic details."
        ) from exc

    state_after = _migration_state(alembic_cfg)
    logger.info(
        "Migration state after initialization",
        extra={
            "current_revision": state_after["current_revision"],
            "head_revisions": state_after["head_revisions"],
        },
    )

    if not state_after["current_revision"]:
        raise DatabaseInitializationError(
            "Database initialization did not produce an Alembic revision. Refusing to continue."
        )

    db: Session = SessionLocal()
    try:
        created_categories = create_system_categories(db)
        logger.info(
            "System seed completed",
            extra={"created_system_categories": len(created_categories)},
        )
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("System seed failed due to database error. Startup aborted.")
        raise DatabaseInitializationError(
            "System seed failed due to database error."
        ) from exc
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        logger.exception("System seed failed unexpectedly. Startup aborted.")
        raise DatabaseInitializationError("System seed failed unexpectedly.") from exc
    finally:
        db.close()

    logger.info(
        "Database initialization workflow completed",
        extra={"current_revision": state_after["current_revision"]},
    )

    return {
        "current_revision": state_after["current_revision"],
        "head_revisions": state_after["head_revisions"],
    }
