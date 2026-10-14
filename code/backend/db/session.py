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
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from db.models import Base


BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_SQLITE_PATH = BACKEND_DIR / "skinsense.db"

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    f"sqlite:///{DEFAULT_SQLITE_PATH}",
)

# check_same_thread=False is only needed for SQLite.
# PostgreSQL does not need it.
connect_args = (
    {"check_same_thread": False}
    if DATABASE_URL.startswith("sqlite")
    else {}
)

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    future=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    future=True,
)


def init_db() -> None:
    """
    Create all tables if they don't already exist.
    Idempotent — safe to call on every app startup.
    """
    Base.metadata.create_all(bind=engine)


def get_session() -> Generator[Session, None, None]:
    """
    FastAPI dependency: yields a database session and always closes it.
    """
    session = SessionLocal()

    try:
        yield session
    finally:
        session.close()


@contextmanager
def session_scope() -> Generator[Session, None, None]:
    """
    Same as get_session, but as a plain context manager for scripts
    (seed.py, tests) that aren't running inside a FastAPI request.
    """
    session = SessionLocal()

    try:
        yield session
        session.commit()

    except Exception:
        session.rollback()
        raise

    finally:
        session.close()