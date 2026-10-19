"""Maintenance schema tables (Phase 5.3).

Revision ID: 006_maintenance_tables
Revises: 005_inventory_tables
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "006_maintenance_tables"
down_revision = "005_inventory_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "equipment",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("equipment_type", sa.String(100), nullable=False),
        sa.Column("site_id", sa.String(100), nullable=False, server_default=""),
        sa.Column("status", sa.String(30), nullable=False,
                  server_default="operational"),
        sa.Column("operating_hours", sa.Float(), nullable=False,
                  server_default="0"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True)),
        schema="maintenance",
    )
    op.create_table(
        "maintenance_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("equipment_id", sa.String(100), nullable=False, index=True),
        sa.Column("maintenance_type", sa.String(30), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("performed_by", sa.String(100), nullable=False,
                  server_default=""),
        sa.Column("performed_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("downtime_hours", sa.Float(), nullable=False,
                  server_default="0"),
        sa.Column("cost", sa.Float(), nullable=False, server_default="0"),
        schema="maintenance",
    )
    op.create_table(
        "failure_predictions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("equipment_id", sa.String(100), nullable=False, index=True),
        sa.Column("failure_probability", sa.Float(), nullable=False),
        sa.Column("risk_level", sa.String(20), nullable=False),
        sa.Column("horizon_days", sa.Integer(), nullable=False,
                  server_default="30"),
        sa.Column("model_version", sa.String(50), nullable=False,
                  server_default="v1"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("notes", sa.Text(), nullable=True),
        schema="maintenance",
    )


def downgrade() -> None:
    for table in ("failure_predictions", "maintenance_records", "equipment"):
        op.drop_table(table, schema="maintenance")
