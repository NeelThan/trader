# AI Assistant Guide

This file provides context for AI assistants (Claude, GPT, Gemini, etc.) working on this project.

## Quick Reference

**See [README.md](README.md) for:**
- Project overview and status
- Technology stack
- Features and API endpoints
- Project structure
- Quick start and development commands
- Domain concepts (Fibonacci, signals, patterns)
- Roadmap

## AI-Specific Guidelines

### Before Writing Code

1. **Read first**: Always read existing files before modifying
2. **Document first**: If documentation is missing, add it before implementing
3. **Ask questions**: Clarify requirements if unclear
4. **Check ADRs**: Review `docs/adr/` for architectural decisions

### TDD Workflow (Mandatory)

1. **RED**: Write failing test first
2. **GREEN**: Write minimal code to pass
3. **REFACTOR**: Apply quality checks:
   - `ruff check src tests` - linting
   - `mypy src` - type checking
   - `pytest --cov` - 100% coverage required
4. **COMMIT**: Use conventional commits

### When Adding Features

1. Update `README.md` with new functionality
2. Update `backend/README.md` if backend-specific
3. Create ADR for significant architectural decisions
4. Maintain 100% test coverage

### Commit Format

```
type(scope): description

Body explaining what and why

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `build`, `chore`

### Key Commands

```bash
cd backend
.venv/Scripts/pytest --cov=trader --cov-report=term-missing  # Tests
.venv/Scripts/ruff check src tests                            # Lint
.venv/Scripts/mypy src                                         # Types
.venv/Scripts/uvicorn trader.main:app --reload                # Server
```

### Module Documentation

Each module in `backend/src/trader/` has docstrings explaining:
- Purpose and responsibility
- Key functions and their parameters
- Return types and error cases

Read the module docstrings before modifying.

## Key References

| Document | Location | Purpose |
|----------|----------|---------|
| Main README | `README.md` | Project overview, features, concepts |
| Backend README | `backend/README.md` | Backend setup, architecture |
| ADRs | `docs/adr/` | Architectural decisions |
| Strategy Spec | `docs/references/` | Trading strategy knowledge |
