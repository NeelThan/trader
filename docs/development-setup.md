# Development Setup

This guide covers how to set up the development environment for the Trader application.

## Quick Start (Docker)

The fastest way to run the complete stack:

```bash
docker compose up --build
```

This starts:
- **PostgreSQL** database on port 5432
- **FastAPI** backend on port 8000 (runs migrations automatically)
- **Next.js** frontend on port 3000

Access the app at **http://localhost:3000**

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose Network                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   frontend   │───▶│   backend    │───▶│   postgres   │  │
│  │  (Next.js)   │    │  (FastAPI)   │    │ (PostgreSQL) │  │
│  │  Port: 3000  │    │  Port: 8000  │    │  Port: 5432  │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Option 1: Full Docker Stack

Best for: Testing the complete application, demos, or when you don't need hot reload.

### Start Everything

```bash
docker compose up --build
```

### Start in Background

```bash
docker compose up -d --build
```

### View Logs

```bash
docker compose logs -f           # All services
docker compose logs -f backend   # Just backend
docker compose logs -f frontend  # Just frontend
```

### Stop Everything

```bash
docker compose down
```

### Reset Database

```bash
docker compose down -v  # Removes volumes (deletes all data)
docker compose up --build
```

## Option 2: Local Development with Hot Reload

Best for: Active development with instant feedback on code changes.

### Step 1: Start Database Only

```bash
docker compose -f docker-compose.dev.yml up
```

### Step 2: Start Backend (new terminal)

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate        # Windows
# source .venv/bin/activate   # Linux/Mac

pip install -e ".[dev]"
alembic upgrade head
uvicorn trader.main:app --reload
```

### Step 3: Start Frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
```

## Access Points

| Service | URL | Notes |
|---------|-----|-------|
| Frontend | http://localhost:3000 | Main application UI |
| Backend API | http://localhost:8000 | REST API |
| API Docs | http://localhost:8000/docs | Swagger/OpenAPI |
| Database | localhost:5432 | PostgreSQL |

### Database Credentials (Development)

```
Host: localhost
Port: 5432
Database: trader
User: trader
Password: trader_dev
```

## Environment Variables

Copy `.env.example` to `.env` for local development:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | localhost | Database host |
| `DB_PORT` | 5432 | Database port |
| `DB_NAME` | trader | Database name |
| `DB_USER` | trader | Database user |
| `DB_PASSWORD` | trader_dev | Database password |
| `TRADER_BACKEND_HOST` | localhost | Backend host (for frontend) |
| `TRADER_BACKEND_PORT` | 8000 | Backend port (for frontend) |

## Troubleshooting

### Port Already in Use

```bash
# Stop any existing containers
docker compose down

# Or change ports in docker-compose.yml
```

### Database Connection Failed

```bash
# Check if postgres is healthy
docker compose ps

# View postgres logs
docker compose logs postgres
```

### Frontend Can't Reach Backend

In Docker, the frontend connects to `backend:8000` (container name).
Locally, it connects to `localhost:8000`.

Check `TRADER_BACKEND_HOST` is set correctly.

### Migrations Fail

```bash
# Check alembic can connect to the database
cd backend
alembic current

# Re-run migrations
alembic upgrade head
```

### Rebuild from Scratch

```bash
docker compose down -v          # Remove containers and volumes
docker system prune -f          # Clean up unused images
docker compose up --build       # Fresh build
```

## Common Tasks

### Run Backend Tests

```bash
cd backend
.venv/Scripts/pytest --cov=trader --cov-report=term-missing
```

### Run Linting

```bash
cd backend
.venv/Scripts/ruff check src tests
.venv/Scripts/mypy src
```

### Connect to Database

```bash
# Via Docker
docker compose exec postgres psql -U trader -d trader

# Or use any PostgreSQL client with the credentials above
```

### View Database Tables

```bash
docker compose exec postgres psql -U trader -d trader -c '\dt'
```
