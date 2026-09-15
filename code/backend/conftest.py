"""Sets up the database explicitly before any tests run, rather than relying
on FastAPI's lifespan firing under TestClient (unreliable under pytest)."""
import pytest

from db.session import init_db
from db.seed import run_seed


@pytest.fixture(scope="session", autouse=True)
def _setup_database():
    init_db()
    run_seed()