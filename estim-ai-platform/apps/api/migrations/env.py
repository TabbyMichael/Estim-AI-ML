"""Alembic environment configuration.

Loads the database URL from the application settings (which reads .env),
imports Base metadata so autogenerate can detect models, and creates
all module schemas before running migrations.
"""

import os
import sys
from logging.config import fileConfig

import sqlalchemy as sa
from alembic import context
from sqlalchemy import engine_from_config, pool

# Ensure app/ is importable (alembic.ini sets prepend_sys_path, belt + suspenders)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + "/..")

from app.core.config import settings  # noqa: E402
from app.core.database import Base  # noqa: E402

# Import all module models here so autogenerate sees them.
# (Empty for now - Phase 3+ adds identity/procurement models.)
# from app.modules.identity.infrastructure.models import *  # noqa

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Override URL from settings (.env > alembic.ini default); use psycopg2 driver
config.set_main_option(
    "sqlalchemy.url",
    settings.database_url.replace("postgresql://", "postgresql+psycopg2://"),
)

target_metadata = Base.metadata

MODULE_SCHEMAS = [
    "identity",
    "procurement",
    "cost_forecasting",
    "inventory",
    "maintenance",
    "project_risk",
    "visual_inspection",
    "document_intelligence",
    "platform",
    "integrations",
]


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_schemas=True,
    )

    with context.begin_transaction():
        context.execute("CREATE EXTENSION IF NOT EXISTS vector")
        for schema in MODULE_SCHEMAS:
            context.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema}"')
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_schemas=True,
            compare_type=True,
        )

        with context.begin_transaction():
            connection.execute(sa.text("CREATE EXTENSION IF NOT EXISTS vector"))
            for schema in MODULE_SCHEMAS:
                connection.execute(sa.text(f'CREATE SCHEMA IF NOT EXISTS "{schema}"'))
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
