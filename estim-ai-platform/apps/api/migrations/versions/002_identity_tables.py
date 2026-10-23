"""Identity schema tables (Phase 3.2).

Revision ID: 002_identity_tables
Revises: 001_initial_schemas
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "002_identity_tables"
down_revision = "001_initial_schemas"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False, server_default=""),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("last_login_at", sa.TIMESTAMP(timezone=True), nullable=True),
        schema="identity",
    )
    op.create_table(
        "roles",
        sa.Column("name", sa.String(100), primary_key=True),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        schema="identity",
    )
    op.create_table(
        "permissions",
        sa.Column("code", sa.String(150), primary_key=True),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        schema="identity",
    )
    op.create_table(
        "role_permissions",
        sa.Column(
            "role_name",
            sa.String(100),
            sa.ForeignKey("identity.roles.name", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "permission_code",
            sa.String(150),
            sa.ForeignKey("identity.permissions.code", ondelete="CASCADE"),
            primary_key=True,
        ),
        schema="identity",
    )
    op.create_table(
        "user_roles",
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("identity.users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "role_name",
            sa.String(100),
            sa.ForeignKey("identity.roles.name", ondelete="CASCADE"),
            primary_key=True,
        ),
        schema="identity",
    )


def downgrade() -> None:
    for table in ("user_roles", "role_permissions", "permissions", "roles", "users"):
        op.drop_table(table, schema="identity")
