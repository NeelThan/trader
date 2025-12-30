# Trader

A Fibonacci Trading Analysis Platform implementing the SignalPro strategy for algorithmic trading analysis.

## Project Status

**Backend**: Complete - Fibonacci calculators, signal detection, and harmonic patterns.
**Frontend**: Active development - Chart with Yahoo Finance integration, Fibonacci overlays, pivot detection.

## Technology Stack

| Component | Technology | Status |
|-----------|------------|--------|
| Backend | Python 3.13, FastAPI | Complete |
| Testing | pytest, pytest-cov, ruff, mypy | Active |
| Frontend | Next.js 16, TypeScript, Tailwind CSS | Active |
| Charting | TradingView Lightweight Charts | Active |
| UI Components | shadcn/ui | Active |
| Market Data | Yahoo Finance (yahoo-finance2) | Active |
| Database | PostgreSQL + Redis | Planned |

## Features

### Fibonacci Calculators

- **Retracement**: Key pullback levels (38.2%, 50%, 61.8%, 78.6%)
- **Extension**: Levels beyond the range (127.2%, 161.8%, 261.8%)
- **Projection**: Three-point AB=CD pattern projection
- **Expansion**: Range expansion levels from a starting move

### Signal Bar Detection

Detect trading signals at Fibonacci levels:
- **Type 1**: Level tested and rejected (stronger signal)
- **Type 2**: Close beyond level without deep test
- Strength scoring (0.0 - 1.0) based on signal type and price distance

### Harmonic Patterns

Detect classic harmonic patterns using XABCD points:

| Pattern | AB Ratio | D Level |
|---------|----------|---------|
| Gartley | 61.8% | 78.6% retracement |
| Butterfly | 78.6% | 127.2-161.8% extension |
| Bat | 38.2-50% | 88.6% retracement |
| Crab | 38.2-61.8% | 161.8% extension |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/fibonacci/retracement` | Calculate retracement levels |
| POST | `/fibonacci/extension` | Calculate extension levels |
| POST | `/fibonacci/projection` | Calculate projection levels |
| POST | `/fibonacci/expansion` | Calculate expansion levels |
| POST | `/signal/detect` | Detect signal at Fibonacci level |
| POST | `/harmonic/validate` | Validate harmonic pattern from XABCD points |
| POST | `/harmonic/reversal-zone` | Calculate potential D point for pattern |

## Project Structure

```
trader/
├── backend/                # Python/FastAPI backend
│   ├── src/trader/         # Source modules
│   └── tests/              # Unit and integration tests
├── frontend/               # Next.js frontend
│   ├── src/app/            # App router pages and API routes
│   ├── src/components/     # React components (trading, ui)
│   └── src/hooks/          # Custom React hooks
└── docs/                   # All documentation
    ├── backend/            # Backend technical docs
    ├── frontend/           # Frontend technical docs
    ├── adr/                # Architecture Decision Records
    └── references/         # Strategy specifications
```

## Quick Start

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows
source .venv/bin/activate   # Unix
pip install -e ".[dev]"

# Run tests
pytest --cov

# Start server
uvicorn trader.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:3000/chart for the interactive chart.

## Development Workflow

### TDD Process

1. **RED**: Write failing test first
2. **GREEN**: Write minimal code to pass
3. **REFACTOR**: Quality checks (ruff, mypy, 100% coverage)
4. **COMMIT**: Conventional commits format

### Commit Format

```
type(scope): description

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `build`, `chore`

## Core Domain Concepts

### Multi-Timeframe Trend Alignment

| Higher TF | Lower TF | Action |
|-----------|----------|--------|
| UP | DOWN | GO LONG (buy the dip) |
| DOWN | UP | GO SHORT (sell the rally) |
| Same | Same | STAND ASIDE |

### Signal Bar Rules

- **BUY**: Close > Open AND Close > Fibonacci Level
- **SELL**: Close < Open AND Close < Fibonacci Level

### Position Sizing

```
Position Size = Risk Capital / (Entry Price - Stop Loss Price)
```

## Roadmap

1. ✅ Core Fibonacci calculations with API
2. ✅ Signal bar detection with Type 1/2
3. ✅ Harmonic pattern detection (Gartley, Butterfly, Bat, Crab)
4. ✅ Harmonic pattern API endpoints
5. ✅ Frontend with TradingView Lightweight Charts
6. ✅ Yahoo Finance market data integration
7. ✅ Auto-refresh with market status display
8. ⬜ Connect frontend to backend API for Fibonacci/signals
9. ⬜ Real-time pattern scanner
10. ⬜ Broker integration

## Documentation

All documentation is centralized in the `docs/` folder:

| Folder | Description |
|--------|-------------|
| [docs/backend/](docs/backend/README.md) | Backend technical documentation |
| [docs/frontend/](docs/frontend/README.md) | Frontend technical documentation |
| [docs/adr/](docs/adr/README.md) | Architecture Decision Records |
| [docs/references/](docs/references/) | Strategy knowledge and specifications |

**API Docs**: Run server and visit `/docs` for interactive OpenAPI documentation.

## Contributing

See the TDD workflow above. Maintain 100% test coverage and pass all linting checks before committing.
