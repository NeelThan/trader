# Trader Backend

Fibonacci Trading Analysis API built with FastAPI.

See [Backend Documentation](../docs/backend/README.md) for detailed technical docs.

## Quick Start

```bash
# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Activate (Unix)
source .venv/bin/activate

# Install dependencies
pip install -e ".[dev]"
```

## Development

```bash
# Run tests
pytest

# Run with coverage
pytest --cov

# Run linter
ruff check src tests

# Run type checker
mypy src
```

## Run Server

```bash
uvicorn trader.main:app --reload
```

## Documentation

| Document | Description |
|----------|-------------|
| [Technical Docs](../docs/backend/README.md) | Module documentation, API details |
| [Strategy Knowledge](../docs/references/fibonacci_strategy_knowledge.md) | Trading theory |
| [App Spec](../docs/references/fibonacci_trading_app_specification.md) | Feature requirements |
| [ADRs](../docs/adr/README.md) | Architecture decisions |

## Architecture

```
backend/
├── src/trader/
│   ├── fibonacci.py    # Fibonacci level calculations
│   ├── signals.py      # Signal bar detection
│   ├── harmonics.py    # Harmonic pattern detection
│   └── main.py         # FastAPI application
└── tests/
    ├── unit/           # Unit tests
    └── integration/    # API integration tests
```
