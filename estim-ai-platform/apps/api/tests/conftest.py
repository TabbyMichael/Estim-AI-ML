"""Pytest configuration and fixtures."""

from unittest.mock import patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Use SQLite for tests
TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture
def test_engine():
    """Create a test database engine."""
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    yield engine


@pytest.fixture
def test_db(test_engine):
    """Create a test database session."""
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def mock_settings():
    """Mock settings to use SQLite for tests."""
    with patch("app.core.database.settings") as mock:
        mock.database_url = TEST_DATABASE_URL
        mock.database_pool_size = 5
        mock.database_max_overflow = 2
        mock.debug = False
        yield mock
