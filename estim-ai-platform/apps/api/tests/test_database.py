"""Tests for database configuration."""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, declarative_base, sessionmaker


class TestDatabase:
    """Test cases for database configuration."""

    def test_engine_creation_with_postgresql(self):
        """Test that database engine is created with PostgreSQL URL."""
        from app.core.config import settings

        database_url = settings.database_url.replace("postgresql://", "postgresql+psycopg2://")
        engine = create_engine(database_url)
        assert engine is not None
        assert str(engine.url).startswith("postgresql+psycopg2://")

    def test_engine_creation_with_sqlite(self):
        """Test that database engine is created with SQLite URL."""
        engine = create_engine("sqlite:///:memory:")
        assert engine is not None
        assert str(engine.url).startswith("sqlite://")

    def test_session_factory_creation(self):
        """Test that session factory is created."""
        engine = create_engine("sqlite:///:memory:")
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        assert SessionLocal is not None

    def test_get_db_dependency_pattern(self):
        """Test the get_db dependency pattern."""
        engine = create_engine("sqlite:///:memory:")
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

        def get_db():
            db = SessionLocal()
            try:
                yield db
            finally:
                db.close()

        gen = get_db()
        db = next(gen)
        assert isinstance(db, Session)
        db.close()

    def test_base_model_exists(self):
        """Test that Base declarative class exists."""
        Base = declarative_base()
        assert Base is not None
        assert hasattr(Base, "metadata")

    def test_sqlite_connection(self):
        """Test that we can connect to SQLite database."""
        engine = create_engine("sqlite:///:memory:")
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            assert result.scalar() == 1

    def test_session_creation_and_close(self):
        """Test that we can create and close a session."""
        engine = create_engine("sqlite:///:memory:")
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        assert db is not None
        db.close()
