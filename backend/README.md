# Trader Backend

Fibonacci Trading Analysis API built with FastAPI.

## Features

### Fibonacci Calculators

- **Retracement**: Calculate key retracement levels (38.2%, 50%, 61.8%, 78.6%)
- **Extension**: Calculate extension levels beyond the range (127.2%, 161.8%, 261.8%)
- **Projection**: Three-point projection using AB=CD pattern
- **Expansion**: Calculate expansion levels from a starting move

### Signal Bar Detection

Detect trading signals at Fibonacci levels:
- **Type 1**: Level tested and rejected (stronger signal)
- **Type 2**: Close beyond level without deep test

Signal strength scoring (0.0 - 1.0) based on type and price distance.

### Harmonic Patterns

Detect classic harmonic patterns:
- **Gartley**: AB=61.8%, D=78.6% retracement
- **Butterfly**: AB=78.6%, D=127.2-161.8% extension
- **Bat**: AB=38.2-50%, D=88.6% retracement
- **Crab**: AB=38.2-61.8%, D=161.8% extension

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/fibonacci/retracement` | Calculate retracement levels |
| POST | `/fibonacci/extension` | Calculate extension levels |
| POST | `/fibonacci/projection` | Calculate projection levels |
| POST | `/fibonacci/expansion` | Calculate expansion levels |
| POST | `/signal/detect` | Detect signal at Fibonacci level |

## Setup

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
