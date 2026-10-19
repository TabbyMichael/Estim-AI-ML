"""Initial schema: pgvector extension + module-owned schemas.

Revision ID: 001_initial_schemas
Revises:
Create Date: 2026-10-15

Creates the pgvector extension and all module schemas per ADR-002.
Tables are added by later Phase 3+ migrations.
"""

from alembic import op

revision = "001_initial_schemas"
down_revision = None
branch_labels = None
depends_on = None

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


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    for schema in MODULE_SCHEMAS:
        op.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema}"')


def downgrade() -> None:
    for schema in reversed(MODULE_SCHEMAS):
        op.execute(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE')
