# Use Python/FastAPI, Next.js, and TradingView Lightweight Charts for technology stack

- Status: accepted
- Deciders: Team
- Date: 2025-12-29
- Tags: architecture, backend, frontend, charting, technology-stack

Technical Story: Select the technology stack for the Fibonacci Trading Application

## Context and Problem Statement

We need to choose a technology stack for building a Fibonacci trading analysis application. The application requires real-time price feeds, complex mathematical calculations (Fibonacci tools, harmonic patterns), multi-timeframe trend analysis, signal detection, and eventually broker API integration. What technologies should we use for the backend, frontend, and charting?

## Decision Drivers

- Performance requirements: Dashboard should load in <3 seconds, real-time data processing
- Long-term maintainability: Code should be easy to understand and extend
- Developer experience: Team is new to all languages, learning curve matters
- Rich ecosystem: Need libraries for financial calculations, charting, WebSockets
- TradingView integration: User uses TradingView and wants integration
- Rapid MVP development: Need to validate ideas quickly

## Considered Options

### Backend
- Go (Golang) with Gin/Fiber
- Python with FastAPI
- TypeScript with Node.js/NestJS
- Rust
- Java with Spring Boot

### Frontend
- Next.js (React)
- Vite + React
- Vue.js with Nuxt
- Angular

### Charting
- TradingView Lightweight Charts
- TradingView Advanced Charts
- React-financial-charts
- ApexCharts

## Decision Outcome

Chosen stack:
- **Backend:** Python with FastAPI
- **Frontend:** Next.js with TypeScript
- **Charting:** TradingView Lightweight Charts
- **Database:** PostgreSQL with Redis for caching

### Architecture

```
Frontend (Next.js + TypeScript)
  - TradingView Lightweight Charts
  - Fibonacci overlays
  - Pattern visualization
           |
           v
Backend (Python + FastAPI)
  - REST API + WebSocket
  - Fibonacci calculations (NumPy)
  - Pattern detection
  - Real-time price processing
           |
           v
Data Layer
  - PostgreSQL (persistence)
  - Redis (caching)
  - Market Data Provider API
```

### Positive Consequences

- Rich financial libraries available (NumPy, pandas, TA-Lib) for Fibonacci calculations
- Rapid development velocity for MVP
- Excellent async support in FastAPI for real-time WebSocket handling
- Easy to learn Python syntax for team new to backend development
- Next.js provides excellent developer experience with TypeScript
- TradingView Lightweight Charts is open source (MIT), TypeScript-native, and purpose-built for financial data
- Can optimize performance-critical parts later if needed (Cython, or rewrite in Go/Rust)

### Negative Consequences

- Python is slower than compiled languages like Go or Rust
- GIL (Global Interpreter Lock) can limit CPU-bound parallelism
- May need to optimize or migrate hot paths if performance becomes an issue
- Two different languages (Python backend, TypeScript frontend) requires context switching

## Pros and Cons of the Options

### Backend: Go (Golang)

- Good, because excellent performance (compiled, concurrent)
- Good, because simple deployment (single binary)
- Good, because strong typing and maintainability
- Bad, because smaller financial library ecosystem than Python
- Bad, because steeper learning curve than Python

### Backend: Python (FastAPI) - CHOSEN

- Good, because rich financial libraries (NumPy, pandas, TA-Lib)
- Good, because rapid prototyping and development
- Good, because excellent async support for WebSockets
- Good, because easiest learning curve
- Good, because largest trading/finance community
- Bad, because slower execution than compiled languages
- Bad, because GIL limitations for CPU-bound tasks

### Backend: TypeScript (Node.js)

- Good, because same language as frontend (full-stack)
- Good, because excellent for real-time WebSocket apps
- Good, because type safety with TypeScript
- Bad, because single-threaded (worker threads available)
- Bad, because less common in serious trading backends

### Frontend: Next.js - CHOSEN

- Good, because React-based with excellent developer experience
- Good, because built-in routing, SSR, API routes
- Good, because great TypeScript support
- Good, because large ecosystem and community
- Good, because official TradingView integration examples available

### Charting: TradingView Lightweight Charts - CHOSEN

- Good, because open source (MIT license)
- Good, because TypeScript native
- Good, because purpose-built for financial data
- Good, because easy to customize for Fibonacci overlays
- Good, because actively maintained (~11K GitHub stars)
- Bad, because fewer features than Advanced Charts

### Charting: TradingView Advanced Charts

- Good, because full-featured professional charting
- Good, because includes broker integration module
- Bad, because requires access request (not open source)
- Bad, because more complex integration

## Links

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [TradingView Lightweight Charts](https://github.com/tradingview/lightweight-charts)
- [TradingView Charting Library Docs](https://www.tradingview.com/charting-library-docs/)
- [Best Programming Languages for Finance 2024](https://www.dotsquares.com/press-and-events/top-fintech-technologies-2024)
- [React Chart Libraries 2025](https://blog.logrocket.com/best-react-chart-libraries-2025/)
