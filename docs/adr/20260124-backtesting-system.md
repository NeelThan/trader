# ADR: Backtesting System Architecture

**Date:** 2026-01-24
**Status:** Accepted

## Context

The trader application implements a workflow-v2 trading strategy that uses multi-timeframe analysis, Fibonacci levels, and signal confirmation. To validate and optimize this strategy, we need a comprehensive backtesting system that can:

1. Replay historical data bar-by-bar
2. Apply the same logic used in live trading
3. Calculate performance metrics
4. Optimize parameters with walk-forward testing

## Decision

We will implement a modular backtesting system with the following components:

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     BacktestEngine                               │
│  - Bar-by-bar replay loop                                       │
│  - Coordinates signals, trades, and metrics                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼──────┐  ┌───────▼───────┐  ┌───────▼──────┐
│ SignalsProc  │  │ TradeSim      │  │ MetricsCalc  │
│ - Trend      │  │ - Open/close  │  │ - Win rate   │
│ - Fib levels │  │ - Stops/tgts  │  │ - Sharpe     │
│ - Validation │  │ - Trailing    │  │ - Drawdown   │
└──────────────┘  └───────────────┘  └──────────────┘
```

### Key Design Decisions

1. **Reuse Existing Logic**: The backtester uses the same functions from `workflow.py`, `signals.py`, and `position_sizing.py` that the live system uses, ensuring consistency.

2. **No Lookahead Bias**: Each bar is processed sequentially; the engine only sees data up to the current bar index.

3. **Category-Based Risk Management**: Trade categories (with_trend, counter_trend, reversal_attempt) determine position sizing, exactly as in live trading.

4. **Comprehensive Exit Management**:
   - Stop loss detection (initial and trailing)
   - Target hit detection (multiple targets)
   - Breakeven management (move stop at +1R)
   - End-of-data forced closure

### Walk-Forward Optimization

To avoid overfitting, we implement rolling window optimization:

```
|<---- In-Sample (6 months) ---->|<- OOS (1 month) ->|
|           Window 1              |     Validate 1    |
          |<---- In-Sample ---->|<- OOS ->|
          |        Window 2      | Validate 2 |
```

**Parameters Optimized:**
- `lookback_periods`: 30-100
- `confluence_threshold`: 2-6
- `validation_pass_threshold`: 50-80%
- `atr_stop_multiplier`: 1.0-3.0
- `breakeven_at_r`: 0.5-2.0

**Robustness Score**: Calculated from coefficient of variation of best parameters across windows. High robustness = stable parameters.

### Data Flow

```
1. DataLoader loads historical bars
   ↓
2. For each bar in lower_tf_bars:
   ↓
   a. Update open trades (check stops/targets)
   b. If no open trades:
      - Detect entry signal (trend + fib + confirmation)
      - Calculate position size by category
      - Open trade if valid signal
   c. Record equity point
   ↓
3. Close remaining trades at end
   ↓
4. Calculate performance metrics
```

## Consequences

### Positive

1. **Validated Strategy**: Historical replay verifies the strategy works before risking capital
2. **Robust Parameters**: Walk-forward optimization finds parameters that generalize
3. **Category Analysis**: Metrics by trade category show which setups perform best
4. **Reusable Logic**: Same functions for backtest and live trading

### Negative

1. **Execution Differences**: Backtesting uses close prices; live trading may have slippage
2. **Data Limitations**: Yahoo intraday data has limited history
3. **Computation Time**: Full optimization can take significant time

### Mitigations

1. Use limit orders in live trading to match backtest assumptions
2. Store historical data in PostgreSQL to preserve intraday history
3. Cache optimization results; run optimization off-hours

## API Endpoints

```python
POST /backtest/run          # Run single backtest
POST /backtest/optimize     # Run walk-forward optimization
```

## Performance Metrics

The system calculates:
- **Basic**: Win rate, profit factor, total PnL
- **Risk-Adjusted**: Sharpe ratio, Sortino ratio, Calmar ratio
- **Drawdown**: Max drawdown, max drawdown duration
- **Per-Trade**: Average R-multiple, largest winner/loser
- **By Category**: Separate metrics for with_trend, counter_trend, reversal

## Module Structure

```
backend/src/trader/backtesting/
    __init__.py          # Public API exports
    models.py            # BacktestConfig, SimulatedTrade, etc.
    engine.py            # BacktestEngine (main loop)
    signals_processor.py # Adapts workflow.py for backtesting
    trade_simulator.py   # Trade open/update/close logic
    metrics.py           # MetricsCalculator
    data_loader.py       # Load from DB or providers
    optimizer.py         # WalkForwardOptimizer
```

## References

- Workflow-v2 Strategy Spec
- Position Sizing Module Documentation
- PostgreSQL Persistence Layer ADR
