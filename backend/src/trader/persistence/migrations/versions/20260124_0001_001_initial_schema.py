"""Initial database schema for historical data and backtesting.

Revision ID: 001
Revises: None
Create Date: 2026-01-24

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Create ohlc_data table for historical price data
    op.create_table(
        "ohlc_data",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("symbol", sa.String(length=20), nullable=False),
        sa.Column("timeframe", sa.String(length=10), nullable=False),
        sa.Column("bar_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("open", sa.Numeric(precision=15, scale=4), nullable=False),
        sa.Column("high", sa.Numeric(precision=15, scale=4), nullable=False),
        sa.Column("low", sa.Numeric(precision=15, scale=4), nullable=False),
        sa.Column("close", sa.Numeric(precision=15, scale=4), nullable=False),
        sa.Column("volume", sa.BigInteger(), nullable=True),
        sa.Column("provider", sa.String(length=50), server_default="yahoo"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("symbol", "timeframe", "bar_time", name="uq_ohlc"),
    )

    # Create index for efficient time-series queries
    op.create_index(
        "idx_ohlc_query",
        "ohlc_data",
        ["symbol", "timeframe", sa.text("bar_time DESC")],
    )

    # Create ingestion_metadata table for tracking sync state
    op.create_table(
        "ingestion_metadata",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("symbol", sa.String(length=20), nullable=False),
        sa.Column("timeframe", sa.String(length=10), nullable=False),
        sa.Column("last_bar_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("total_bars", sa.BigInteger(), server_default="0"),
        sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_sync_status", sa.String(length=20), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("symbol", "timeframe", name="uq_ingestion"),
    )

    # Create backtest_results table for storing backtest runs
    op.create_table(
        "backtest_results",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("config", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("metrics", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("trades", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "equity_curve", postgresql.JSONB(astext_type=sa.Text()), nullable=False
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("backtest_results")
    op.drop_table("ingestion_metadata")
    op.drop_index("idx_ohlc_query", table_name="ohlc_data")
    op.drop_table("ohlc_data")
