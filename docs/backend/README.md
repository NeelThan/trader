# Backend Documentation

Technical documentation for the Python/FastAPI backend.

## Modules

### analysis.py

Unified analysis orchestration combining all analysis operations.

| Component | Description |
|-----------|-------------|
| `AnalysisOrchestrator` | Coordinates market data, pivots, Fibonacci, and signals |
| `FullAnalysisRequest` | Request with symbol, timeframe, periods, and config |
| `FullAnalysisResponse` | Complete response with all analysis sections |
| `AnalysisConfig` | Configuration for pivot lookback, Fibonacci direction, signals |

**Single endpoint** reduces frontend complexity and network round-trips.

### fibonacci.py

Four Fibonacci calculation tools for trading analysis.

| Function | Description | Parameters |
|----------|-------------|------------|
| `calculate_retracement_levels()` | Pullback levels (38.2%, 50%, 61.8%, 78.6%) | high, low, direction |
| `calculate_extension_levels()` | Extension levels (127.2%, 161.8%, 261.8%) | high, low, direction |
| `calculate_projection_levels()` | Three-point AB=CD projection | point_a, point_b, point_c, direction |
| `calculate_expansion_levels()` | Expansion from point B | point_a, point_b, direction |

### signals.py

Signal bar detection at Fibonacci levels.

| Component | Description |
|-----------|-------------|
| `Bar` | OHLC price bar dataclass with `is_bullish`/`is_bearish` properties |
| `Signal` | Detected signal with direction, type, strength, level |
| `SignalType` | TYPE_1 (level tested) or TYPE_2 (no deep test) |
| `detect_signal()` | Main detection function |

**Signal Rules:**
- **BUY**: Close > Open AND Close > Fibonacci Level
- **SELL**: Close < Open AND Close < Fibonacci Level

**Signal Strength:** 0.0-1.0 based on signal type and price distance from level.

### harmonics.py

Harmonic pattern detection using XABCD points.

| Pattern | AB Ratio | D Level |
|---------|----------|---------|
| Gartley | 61.8% | 78.6% retracement |
| Butterfly | 78.6% | 127.2-161.8% extension |
| Bat | 38.2-50% | 88.6% retracement |
| Crab | 38.2-61.8% | 161.8% extension |

| Function | Description |
|----------|-------------|
| `validate_pattern()` | Check if XABCD points form valid harmonic pattern |
| `calculate_reversal_zone()` | Calculate potential reversal zone (D point) for pattern completion |

### pivots.py

Swing high/low detection for chart analysis.

| Component | Description |
|-----------|-------------|
| `OHLCBar` | OHLC bar with time field |
| `PivotPoint` | Detected pivot with index, price, type, time |
| `PivotResult` | All pivots, recent pivots, swing high/low |
| `detect_pivots()` | Detect swing points with configurable lookback |

### position_sizing.py

Risk management and position sizing calculations.

| Function | Description |
|----------|-------------|
| `calculate_position_size()` | Position size from entry, stop, and risk capital |
| `calculate_risk_reward()` | Risk/reward ratio with target analysis |

### market_data/

Multi-provider market data with caching and fallback.

| Component | Description |
|-----------|-------------|
| `MarketDataService` | Orchestrates providers, caching, rate limiting |
| `YahooProvider` | Yahoo Finance data provider (priority 1) |
| `SimulatedProvider` | Fallback with generated data (priority 999) |
| `MarketDataCache` | TTL-based caching for OHLC data |
| `RateLimiter` | Per-provider rate limiting |

**Features:** Provider fallback, caching, rate limiting, market status.

### main.py

FastAPI application with REST endpoints.

See [API Endpoints](../../README.md#api-endpoints) in main README.

## Architecture

```
backend/
├── src/trader/
│   ├── __init__.py
│   ├── analysis.py         # Unified analysis orchestration
│   ├── fibonacci.py        # Fibonacci calculations
│   ├── signals.py          # Signal bar detection
│   ├── harmonics.py        # Harmonic pattern detection
│   ├── pivots.py           # Swing high/low detection
│   ├── position_sizing.py  # Risk management
│   ├── market_data/        # Market data providers
│   │   ├── __init__.py
│   │   ├── cache.py        # TTL caching
│   │   ├── models.py       # Data models
│   │   ├── rate_limiter.py # Rate limiting
│   │   ├── service.py      # Service orchestration
│   │   └── providers/      # Data providers
│   │       ├── base.py     # Provider interface
│   │       ├── yahoo.py    # Yahoo Finance
│   │       └── simulated.py # Fallback provider
│   └── main.py             # FastAPI application
├── tests/
│   ├── unit/               # Unit tests for each module
│   │   └── market_data/    # Market data tests
│   └── integration/        # API endpoint tests
├── pyproject.toml          # Project configuration
└── README.md               # Backend quick start
```

## Related Documentation

- [Strategy Knowledge](../references/fibonacci_strategy_knowledge.md) - Trading strategy theory
- [App Specification](../references/fibonacci_trading_app_specification.md) - Feature requirements
- [ADRs](../adr/) - Architecture decisions
