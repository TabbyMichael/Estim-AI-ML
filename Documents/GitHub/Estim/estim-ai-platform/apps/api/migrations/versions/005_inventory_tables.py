"""Inventory schema tables (Phase 5.2).

Revision ID: 005_inventory_tables
Revises: 004_cost_forecasting_tables
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "005_inventory_tables"
down_revision = "004_cost_forecasting_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "stock_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("material_id", sa.String(100), nullable=False, index=True),
        sa.Column("site_id", sa.String(100), nullable=False, index=True),
        sa.Column("quantity_on_hand", sa.Numeric(18, 4), nullable=False),
        sa.Column("unit", sa.String(20), nullable=False, server_default="units"),
        sa.Column("recorded_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("reorder_point", sa.Numeric(18, 4), nullable=False,
                  server_default="0"),
        sa.Column("snapshot_metadata", sa.Text(), nullable=False,
                  server_default="{}"),
        schema="inventory",
    )
    op.create_table(
        "demand_forecasts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("material_id", sa.String(100), nullable=False, index=True),
        sa.Column("site_id", sa.String(100), nullable=False, index=True),
        sa.Column("forecast_type", sa.String(50), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("predicted_quantity", sa.Numeric(18, 4), nullable=False),
        sa.Column("confidence_low", sa.Numeric(18, 4), nullable=False),
        sa.Column("confidence_high", sa.Numeric(18, 4), nullable=False),
        sa.Column("horizon_days", sa.Integer(), nullable=False,
                  server_default="30"),
        sa.Column("model_version", sa.String(50), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("created_by", sa.String(100), nullable=False),
        sa.Column("approved_by", sa.String(100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        schema="inventory",
    )


def downgrade() -> None:
    for table in ("demand_forecasts", "stock_snapshots"):
        op.drop_table(table, schema="inventory")
