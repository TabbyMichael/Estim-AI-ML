"""Database session management and base model."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from app.core.config import settings

# Create database engine
# Use psycopg2 (psycopg2-binary) which is compatible with SQLAlchemy 2.x
database_url = settings.database_url.replace("postgresql://", "postgresql+psycopg2://")
engine = create_engine(
    database_url,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    echo=settings.debug
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base declarative class for all models
Base = declarative_base()


def get_db() -> Session:
    """
    FastAPI dependency for database session.

    Yields a database session and ensures it's closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database tables.

    This creates all tables defined in the Base metadata.
    In production, use Alembic migrations instead.
    """
    Base.metadata.create_all(bind=engine)
