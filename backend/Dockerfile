FROM python:3.13-slim

WORKDIR /app

# Install system dependencies for asyncpg
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy application code
COPY pyproject.toml README.md ./
COPY src/ ./src/
COPY alembic.ini ./

# Install Python dependencies
RUN pip install --no-cache-dir .

# Expose port
EXPOSE 8000

# Run migrations then start server
CMD ["sh", "-c", "alembic upgrade head && uvicorn trader.main:app --host 0.0.0.0 --port 8000"]
