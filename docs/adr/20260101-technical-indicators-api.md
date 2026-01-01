# Technical Indicators Backend API

- Status: accepted
- Deciders: User, Claude
- Date: 2026-01-01
- Tags: backend, api, indicators, thin-client

Technical Story: Implement technical indicator calculations (MACD, RSI, etc.) in the backend as per thin client architecture, providing a unified API for indicator data.

## Context and Problem Statement

The frontend currently contains technical indicator calculations (SMA, EMA, RSI, ADX) in `frontend/src/lib/technical-indicators.ts`. Per ADR-20251231 (Frontend-Backend Logic Migration), these should be moved to the backend. Additionally, Chart Pro requires MACD indicator support. Where should MACD and other indicators be implemented?

## Decision Drivers

- Thin client architecture requires backend as source of truth
- MACD needed for Chart Pro indicator panes
- Consistency: all indicator calculations should be in same place
- Frontend should only handle display logic
- Performance: batch calculation more efficient server-side
- Testing: business logic easier to test in Python

## Considered Options

1. **Add MACD to frontend** - Keep indicators in `technical-indicators.ts`
2. **New backend indicators module** - Create `/indicators` endpoint
3. **Extend analysis endpoint** - Add indicators to existing `/analyze` response

## Decision Outcome

Chosen option: "New backend indicators module", because it follows the thin client architecture, enables batch calculations, and creates a clean API boundary.

### Positive Consequences

- Consistent with thin client architecture
- Single source of truth for indicator calculations
- Easy to add more indicators in future
- Better testability (Python unit tests)
- Can optimize calculations (e.g., reuse EMA for MACD)
- Frontend becomes simpler (just display)

### Negative Consequences

- Additional network request for indicators
- Must migrate existing frontend indicator code
- Temporary duplication during migration period

## API Design

### Endpoint: `POST /indicators`

Request:
```json
{
  "symbol": "SPX",
  "timeframe": "1D",
  "indicators": [
    {"type": "macd", "params": {"fast": 12, "slow": 26, "signal": 9}},
    {"type": "rsi", "params": {"period": 14}},
    {"type": "sma", "params": {"period": 20}}
  ]
}
```

Response:
```json
{
  "success": true,
  "data": {
    "macd": {
      "macd": [/* array of values */],
      "signal": [/* array of values */],
      "histogram": [/* array of values */]
    },
    "rsi": [/* array of values */],
    "sma": [/* array of values */]
  }
}
```

### Phase 1: MACD Only

For Chart Pro Phase 1, implement only MACD:

**Endpoint: `POST /indicators/macd`**

Request:
```json
{
  "data": [/* OHLC bars */],
  "fast_period": 12,
  "slow_period": 26,
  "signal_period": 9
}
```

Response:
```json
{
  "macd": [/* MACD line values */],
  "signal": [/* Signal line values */],
  "histogram": [/* Histogram values */]
}
```

## Implementation

### Backend Module: `backend/src/trader/indicators.py`

```python
def calculate_ema(prices: list[float], period: int) -> list[float]:
    """Calculate Exponential Moving Average."""
    ...

def calculate_macd(
    prices: list[float],
    fast_period: int = 12,
    slow_period: int = 26,
    signal_period: int = 9,
) -> MACDResult:
    """Calculate MACD indicator."""
    ...
```

### Migration Plan

1. Phase 1: Add MACD to backend (new code)
2. Phase 2: Add RSI, SMA, EMA to backend
3. Phase 3: Update frontend to use API
4. Phase 4: Deprecate/remove frontend calculations

## Pros and Cons of the Options

### Add MACD to frontend

- Good, because no API changes needed
- Good, because faster initial implementation
- Bad, because violates thin client architecture
- Bad, because duplicates business logic location
- Bad, because harder to test

### New backend indicators module

- Good, because follows architecture
- Good, because clean API design
- Good, because extensible for more indicators
- Good, because better testing
- Bad, because additional network latency
- Bad, because more code to write initially

### Extend analysis endpoint

- Good, because fewer endpoints
- Good, because single request gets everything
- Bad, because bloats `/analyze` response
- Bad, because couples unrelated concerns
- Bad, because harder to use indicators independently

## Links

- Implements: [ADR-20251230 Thin Client Architecture](20251230-thin-client-architecture.md)
- Related: [ADR-20251231 Frontend-Backend Logic Migration](20251231-frontend-backend-logic-migration.md)
- Related: [ADR-20260101 Chart Pro Workflow](20260101-chart-pro-workflow.md)
