"""
Database engine and session factory.

SQLite for local dev (default), PostgreSQL for staging — set DATABASE_URL to
switch. Nothing else in the codebase needs to change; every model in
db/models.py uses portable column types for exactly this reason.
"""
from __future__ import annotations

import os
from pathlib import Path
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from db.models import Base

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_SQLITE_PATH = BACKEND_DIR / "skinsense.db"

DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DEFAULT_SQLITE_PATH}")

# check_same_thread=False is only needed for SQLite (single-file, used from
# multiple request-handling threads under Uvicorn). Postgres ignores it if
# accidentally left in a connect_args dict, but we only pass it conditionally.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)


def init_db() -> None:
    """Create all tables if they don't already exist. Idempotent — safe to
    call on every app startup, not just once during seeding."""
    Base.metadata.create_all(bind=engine)


def get_session() -> Session:
    """FastAPI dependency: yields a session, always closes it."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@contextmanager
def session_scope():
    """Same as get_session, but as a plain context manager for scripts
    (seed.py, tests) that aren't running inside a FastAPI request."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
