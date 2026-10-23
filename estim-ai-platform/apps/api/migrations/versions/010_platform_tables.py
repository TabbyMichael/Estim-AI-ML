"""Platform cross-cutting tables (Phase 6.1-6.3).

Creates, in the ``platform`` schema:
  notifications, notification_preferences   (6.1 Notifications)
  reports, report_schedules                 (6.2 Reporting)
  audit_logs                                (6.3 Audit)
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "010_platform_tables"
down_revision = "009_document_intelligence_tables"
branch_labels = None
depends_on = None

SCHEMA = "platform"


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.String(100), nullable=False, index=True),
        sa.Column("channel", sa.String(20), nullable=False),
        sa.Column("subject", sa.String(255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending", index=True),
        sa.Column("template_key", sa.String(100), nullable=False, server_default=""),
        sa.Column("event_type", sa.String(150), nullable=False, server_default=""),
        sa.Column("event_id", sa.String(100), nullable=False, server_default=""),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("sent_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("read_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        schema=SCHEMA,
    )
    op.create_table(
        "notification_preferences",
        sa.Column("user_id", sa.String(100), primary_key=True),
        sa.Column("channel", sa.String(20), primary_key=True),
        sa.Column("event_type", sa.String(150), primary_key=True, server_default="*"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default="true"),
        schema=SCHEMA,
    )
    op.create_table(
        "reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("report_type", sa.String(100), nullable=False, index=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("format", sa.String(20), nullable=False, server_default="json"),
        sa.Column("payload_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column("generated_by", sa.String(100), nullable=False, server_default="system"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("completed_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        schema=SCHEMA,
    )
    op.create_table(
        "report_schedules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("report_type", sa.String(100), nullable=False),
        sa.Column("interval", sa.String(20), nullable=False, server_default="daily"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_by", sa.String(100), nullable=False, server_default="system"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("last_run_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("next_run_at", sa.TIMESTAMP(timezone=True), nullable=True),
        schema=SCHEMA,
    )
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("actor", sa.String(100), nullable=False, index=True),
        sa.Column("action", sa.String(50), nullable=False, index=True),
        sa.Column("resource_type", sa.String(100), nullable=False, server_default="", index=True),
        sa.Column("resource_id", sa.String(100), nullable=False, server_default=""),
        sa.Column("details", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("ip_address", sa.String(64), nullable=False, server_default=""),
        sa.Column("user_agent", sa.String(500), nullable=False, server_default=""),
        sa.Column("correlation_id", sa.String(100), nullable=False, server_default=""),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, index=True),
        schema=SCHEMA,
    )


def downgrade() -> None:
    for table in (
        "audit_logs",
        "report_schedules",
        "reports",
        "notification_preferences",
        "notifications",
    ):
        op.drop_table(table, schema=SCHEMA)
