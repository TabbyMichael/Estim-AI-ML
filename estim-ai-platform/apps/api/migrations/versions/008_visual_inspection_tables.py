"""Visual inspection schema tables (Phase 5.5).

Revision ID: 008_visual_inspection_tables
Revises: 007_project_risk_tables
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "008_visual_inspection_tables"
down_revision = "007_project_risk_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "inspections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", sa.String(100), nullable=False, index=True),
        sa.Column("site_id", sa.String(100), nullable=False, server_default=""),
        sa.Column("title", sa.String(255), nullable=False, server_default=""),
        sa.Column("status", sa.String(30), nullable=False, server_default="pending"),
        sa.Column("created_by", sa.String(100), nullable=False, server_default=""),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("reviewed_by", sa.String(100), nullable=True),
        sa.Column("reviewed_at", sa.TIMESTAMP(timezone=True), nullable=True),
        schema="visual_inspection",
    )
    op.create_table(
        "image_assets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("inspection_id", sa.String(100), nullable=False, index=True),
        sa.Column("storage_key", sa.String(500), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False, server_default=""),
        sa.Column("content_type", sa.String(100), nullable=False, server_default="image/jpeg"),
        sa.Column("size_bytes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("uploaded_at", sa.TIMESTAMP(timezone=True)),
        schema="visual_inspection",
    )
    op.create_table(
        "defect_detections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("image_id", sa.String(100), nullable=False, index=True),
        sa.Column("inspection_id", sa.String(100), nullable=False, index=True),
        sa.Column("defect_type", sa.String(100), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("severity", sa.String(20), nullable=False),
        sa.Column("bbox", sa.JSON(), nullable=True),
        sa.Column("model_version", sa.String(50), nullable=False, server_default="v1"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("notes", sa.Text(), nullable=True),
        schema="visual_inspection",
    )


def downgrade() -> None:
    for table in ("defect_detections", "image_assets", "inspections"):
        op.drop_table(table, schema="visual_inspection")
