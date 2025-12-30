# Documentation

Project documentation organized by component.

## Structure

```
docs/
├── backend/        # Backend-specific technical docs
├── frontend/       # Frontend-specific technical docs
├── adr/            # Architecture Decision Records
└── references/     # Domain knowledge and specifications
```

## Quick Links

### Technical Documentation

| Component | Description | Link |
|-----------|-------------|------|
| Backend | Python/FastAPI modules and API | [docs/backend/](backend/README.md) |
| Frontend | Next.js components and architecture | [docs/frontend/](frontend/README.md) |

### Architecture Decisions

| ADR | Decision |
|-----|----------|
| [20251229-use-log4brains](adr/20251229-use-log4brains-to-manage-adrs.md) | Use log4brains for ADR management |
| [20251229-use-python-fastapi](adr/20251229-use-python-fastapi-nextjs-tradingview.md) | Python/FastAPI backend, Next.js frontend |
| [20251229-use-tdd](adr/20251229-use-tdd-and-conventional-commits.md) | TDD workflow with conventional commits |

### Domain Knowledge

| Document | Description |
|----------|-------------|
| [Strategy Knowledge](references/fibonacci_strategy_knowledge.md) | Fibonacci trading theory from SignalPro |
| [App Specification](references/fibonacci_trading_app_specification.md) | Complete feature specification |

## Creating New ADRs

```bash
npm run adr:new -- "Title of Decision"
```

See [ADR README](adr/README.md) for template and guidelines.
