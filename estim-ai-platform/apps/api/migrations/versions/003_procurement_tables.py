"""Procurement schema tables (Phase 4.2).

Revision ID: 003_procurement_tables
Revises: 002_identity_tables
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "003_procurement_tables"
down_revision = "002_identity_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "purchase_orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("po_number", sa.String(50), nullable=False, index=True),
        sa.Column("supplier_id", sa.String(100), nullable=False),
        sa.Column("project_id", sa.String(100), nullable=False),
        sa.Column("total_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("state", sa.String(20), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("approved_by", sa.String(100), nullable=True),
        sa.Column("approved_at", sa.TIMESTAMP(timezone=True), nullable=True),
        schema="procurement",
    )
    op.create_table(
        "purchase_order_lines",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "order_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("procurement.purchase_orders.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("material_id", sa.String(100), nullable=False),
        sa.Column("material_name", sa.String(255), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(18, 2), nullable=False),
        sa.Column("subtotal", sa.Numeric(18, 2), nullable=False),
        schema="procurement",
    )
    op.create_table(
        "anomalies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("purchase_order_id", sa.String(100), nullable=False),
        sa.Column("po_number", sa.String(50), nullable=False),
        sa.Column("anomaly_type", sa.String(50), nullable=False),
        sa.Column("anomaly_score", sa.Float(), nullable=False),
        sa.Column("risk_level", sa.String(20), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("details", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("reviewed_by", sa.String(100), nullable=True),
        sa.Column("reviewed_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("review_decision", sa.String(20), nullable=True),
        sa.Column("review_notes", sa.Text(), nullable=True),
        schema="procurement",
    )


def downgrade() -> None:
    for table in ("anomalies", "purchase_order_lines", "purchase_orders"):
        op.drop_table(table, schema="procurement")
