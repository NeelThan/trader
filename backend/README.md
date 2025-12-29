# Trader Backend

Fibonacci Trading Analysis API built with FastAPI.

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
