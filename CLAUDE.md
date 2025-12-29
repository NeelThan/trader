# CLAUDE.md - Project Guide for AI Assistants

## Project Overview

**Trader** - A Fibonacci Trading Application implementing the SignalPro strategy for algorithmic trading analysis. Enables traders to identify high-probability setups using Fibonacci price tools and harmonic patterns (Gartley 222, Butterfly).

**Status:** Planning phase - specifications complete, implementation not started.

## Directory Structure

```
trader/
├── src/                    # Source code (empty - to be implemented)
├── tests/                  # Test directory (empty - to be implemented)
├── docs/
│   └── references/
│       ├── fibonacci_trading_app_specification.md  # Feature specification
│       └── fibonacci_strategy_knowledge.md         # Strategy knowledge base
└── README.md
```

## Key Documentation

- `docs/references/fibonacci_trading_app_specification.md` - Complete feature specification with 16 categories and release roadmap
- `docs/references/fibonacci_strategy_knowledge.md` - Trading strategy knowledge base from SignalPro methodology

## Core Domain Concepts

### Multi-Timeframe Trend Alignment
| Higher TF | Lower TF | Action |
|-----------|----------|--------|
| UP | DOWN | GO LONG (buy the dip) |
| DOWN | UP | GO SHORT (sell the rally) |
| Same direction | Same direction | STAND ASIDE |

### Four Fibonacci Tools
1. **Retracement** - Pullback levels (38%, 50%, 62%, 79%)
2. **Extension** - Targets beyond origin (127%, 162%, 262%)
3. **Projection** - 3-point forecasts
4. **Expansion** - Range expansion levels

### Signal Bar Rules
- **BUY:** Close > Open AND Close > Fibonacci Level
- **SELL:** Close < Open AND Close < Fibonacci Level

### Position Sizing
```
Position Size = Risk Capital / (Entry Price - Stop Loss Price)
```

## Planned Architecture

```
Frontend (React)
├── Chart Component
├── Dashboard
└── Trade Management UI

Backend
├── Fibonacci Calculation Engine
├── Pattern Recognition (Gartley 222, Butterfly)
├── Signal Detection
├── Risk Management
└── Data Store

External Integrations
├── Price Data API
└── Broker API (R3)
```

## Development Roadmap

1. **Walking Skeleton** - Basic instrument entry, pivot marking, retracement calculator
2. **MVP** - Auto pivot detection, all 4 Fibonacci tools, real-time signals
3. **R1** - Pattern recognition, Gartley scanner, analytics
4. **R2** - Butterfly patterns, equity tracking
5. **R3** - Automated trading, broker integration
6. **R4** - Mobile app, public API

## Build & Test Commands

*To be configured - project in planning phase*

## Development Guidelines

- Reference the specification document for feature requirements
- Fibonacci calculations must be precise - verify against known values
- Pattern recognition requires proper pivot point detection first
- Always validate signal bars before trade entry logic
- Position sizing is critical for risk management - test thoroughly
