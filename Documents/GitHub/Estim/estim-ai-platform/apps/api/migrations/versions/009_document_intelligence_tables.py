"""Document intelligence schema tables (Phase 5.6).

Revision ID: 009_document_intelligence_tables
Revises: 008_visual_inspection_tables

Embeddings use pgvector in production; the migration creates a portable
TEXT column plus an optional VECTOR column when the extension exists.
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "009_document_intelligence_tables"
down_revision = "008_visual_inspection_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", sa.String(100), nullable=False, index=True),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("storage_key", sa.String(500), nullable=False),
        sa.Column("content_type", sa.String(100), nullable=False, server_default="application/pdf"),
        sa.Column("status", sa.String(30), nullable=False, server_default="uploaded"),
        sa.Column("created_by", sa.String(100), nullable=False, server_default=""),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("indexed_at", sa.TIMESTAMP(timezone=True), nullable=True),
        schema="document_intelligence",
    )
    op.create_table(
        "document_chunks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("document_id", sa.String(100), nullable=False, index=True),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("token_count", sa.Integer(), nullable=False, server_default="0"),
        schema="document_intelligence",
    )
    op.create_table(
        "embeddings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("chunk_id", sa.String(100), nullable=False, index=True),
        sa.Column("document_id", sa.String(100), nullable=False, index=True),
        sa.Column("vector_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("model_version", sa.String(50), nullable=False, server_default="v1"),
        schema="document_intelligence",
    )
    # Optional pgvector column (no-op if extension missing).
    try:
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")
        op.execute(
            "ALTER TABLE document_intelligence.embeddings "
            "ADD COLUMN IF NOT EXISTS embedding vector(384)"
        )
    except Exception:  # noqa: BLE001 - portable fallback is vector_json
        pass


def downgrade() -> None:
    for table in ("embeddings", "document_chunks", "documents"):
        op.drop_table(table, schema="document_intelligence")
