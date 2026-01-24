# ADR: PostgreSQL Persistence Layer for Historical Data

**Date:** 2026-01-24
**Status:** Accepted

## Context

The trader application needs to store historical OHLC data for backtesting and optimization. Currently, all market data is fetched from Yahoo Finance on demand, which has several limitations:

1. **Rate Limits**: Yahoo Finance limits requests to 360/hour, making bulk historical analysis slow
2. **Data Availability**: Intraday data has limited history (1m: 7 days, 5m/15m: 60 days)
3. **No Persistence**: Data must be re-fetched each session, wasting API calls
4. **Backtesting Speed**: Real-time API calls make backtesting impractically slow

## Decision

We will add PostgreSQL as a persistence layer for historical OHLC data using SQLAlchemy 2.0 with async support.

### Schema Design

```sql
-- Historical OHLC data (indexed for time-series queries)
CREATE TABLE ohlc_data (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    bar_time TIMESTAMPTZ NOT NULL,
    open NUMERIC(15, 4) NOT NULL,
    high NUMERIC(15, 4) NOT NULL,
    low NUMERIC(15, 4) NOT NULL,
    close NUMERIC(15, 4) NOT NULL,
    volume BIGINT,
    provider VARCHAR(50) DEFAULT 'yahoo',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_ohlc UNIQUE (symbol, timeframe, bar_time)
);

CREATE INDEX idx_ohlc_query ON ohlc_data (symbol, timeframe, bar_time DESC);

-- Data ingestion tracking
CREATE TABLE ingestion_metadata (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    last_bar_time TIMESTAMPTZ,
    total_bars BIGINT DEFAULT 0,
    last_sync_at TIMESTAMPTZ,
    last_sync_status VARCHAR(20),
    CONSTRAINT uq_ingestion UNIQUE (symbol, timeframe)
);

-- Backtest results storage
CREATE TABLE backtest_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config JSONB NOT NULL,
    metrics JSONB NOT NULL,
    trades JSONB NOT NULL,
    equity_curve JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Technology Choices

1. **SQLAlchemy 2.0 with asyncpg**: Modern async ORM with excellent PostgreSQL support
2. **Alembic**: Database migration management
3. **testcontainers**: Ephemeral PostgreSQL for integration tests

### Data Flow

```
┌─────────────────────┐
│  MarketDataService  │
└─────────┬───────────┘
          │
    ┌─────▼─────┐
    │  Check DB │
    └─────┬─────┘
          │
    ┌─────▼─────────────────────┐
    │  Data in DB and fresh?    │
    │  (within cache TTL)       │
    └─────┬──────────┬──────────┘
          │ Yes      │ No
    ┌─────▼─────┐  ┌─▼──────────────┐
    │ Return DB │  │ Fetch from API │
    │   Data    │  │ & Store in DB  │
    └───────────┘  └────────────────┘
```

## Consequences

### Positive

1. **Fast Backtesting**: All historical data local, no API delays
2. **Unlimited Replay**: Run thousands of backtests without hitting rate limits
3. **Data Preservation**: Keep intraday data beyond Yahoo's retention limits
4. **Incremental Sync**: Only fetch new bars, not entire history

### Negative

1. **Infrastructure Complexity**: Requires PostgreSQL instance
2. **Storage Requirements**: ~80MB for DJI across all timeframes
3. **Migration Management**: Schema changes require Alembic migrations

### Mitigations

1. Docker Compose for local development with PostgreSQL
2. Environment-based configuration for production databases
3. Testcontainers for isolated integration testing

## Module Structure

```
backend/src/trader/persistence/
    __init__.py
    config.py           # DB connection config from env vars
    connection.py       # AsyncEngine + session factory
    models.py           # SQLAlchemy 2.0 models
    repository/
        __init__.py
        ohlc.py         # OHLC CRUD operations
        metadata.py     # Ingestion metadata
        results.py      # Backtest results storage
    service.py          # High-level orchestration
```

## References

- SQLAlchemy 2.0 Async Documentation
- PostgreSQL Time-Series Best Practices
- Alembic Migration Guide
