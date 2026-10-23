"""Cost forecasting schema tables (Phase 5.2).

Revision ID: 004_cost_forecasting_tables
Revises: 003_procurement_tables
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "004_cost_forecasting_tables"
down_revision = "003_procurement_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "cost_forecasts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", sa.String(100), nullable=False, index=True),
        sa.Column("forecast_type", sa.String(50), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("predicted_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("confidence_interval_low", sa.Numeric(18, 2), nullable=False),
        sa.Column("confidence_interval_high", sa.Numeric(18, 2), nullable=False),
        sa.Column("model_version", sa.String(50), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("created_by", sa.String(100), nullable=False),
        sa.Column("actual_amount", sa.Numeric(18, 2), nullable=True),
        sa.Column("variance", sa.Numeric(18, 2), nullable=True),
        sa.Column("accuracy_score", sa.Float(), nullable=True),
        sa.Column("approved_by", sa.String(100), nullable=True),
        sa.Column("approved_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        schema="cost_forecasting",
    )
    op.create_table(
        "cost_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", sa.String(100), nullable=False, index=True),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("recorded_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("currency", sa.String(10), nullable=False, server_default="USD"),
        sa.Column("snapshot_metadata", sa.Text(), nullable=False),
        schema="cost_forecasting",
    )
    op.create_table(
        "forecast_models",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("version", sa.String(50), nullable=False),
        sa.Column("model_type", sa.String(50), nullable=False),
        sa.Column("training_period_start", sa.TIMESTAMP(timezone=True)),
        sa.Column("training_period_end", sa.TIMESTAMP(timezone=True)),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("metrics", sa.Text(), nullable=False),
        schema="cost_forecasting",
    )


def downgrade() -> None:
    for table in (
        "forecast_models",
        "cost_snapshots",
        "cost_forecasts",
    ):
        op.drop_table(table, schema="cost_forecasting")
