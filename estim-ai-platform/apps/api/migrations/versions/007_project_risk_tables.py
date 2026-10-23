"""Project risk schema tables (Phase 5.4).

Revision ID: 007_project_risk_tables
Revises: 006_maintenance_tables
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "007_project_risk_tables"
down_revision = "006_maintenance_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "milestones",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", sa.String(100), nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("planned_start", sa.TIMESTAMP(timezone=True)),
        sa.Column("planned_end", sa.TIMESTAMP(timezone=True)),
        sa.Column("status", sa.String(30), nullable=False, server_default="not_started"),
        sa.Column("actual_start", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("actual_end", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("progress_pct", sa.Float(), nullable=False, server_default="0"),
        schema="project_risk",
    )
    op.create_table(
        "risk_predictions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", sa.String(100), nullable=False, index=True),
        sa.Column("milestone_id", sa.String(100), nullable=False, index=True),
        sa.Column("delay_probability", sa.Float(), nullable=False),
        sa.Column("predicted_delay_days", sa.Float(), nullable=False),
        sa.Column("risk_level", sa.String(20), nullable=False),
        sa.Column("model_version", sa.String(50), nullable=False, server_default="v1"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("notes", sa.Text(), nullable=True),
        schema="project_risk",
    )


def downgrade() -> None:
    for table in ("risk_predictions", "milestones"):
        op.drop_table(table, schema="project_risk")
