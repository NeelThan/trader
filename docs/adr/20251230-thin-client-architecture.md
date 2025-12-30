# Thin Client Architecture: Backend as Source of Truth

- Status: accepted
- Deciders: Development team
- Date: 2025-12-30
- Tags: architecture, frontend, backend, separation-of-concerns

Technical Story: Establish a clear boundary between frontend and backend responsibilities

## Context and Problem Statement

As the trading platform grows, we need a clear architecture that defines where business logic should reside. Currently, some calculations (like Fibonacci levels and pivot point detection) are implemented in the frontend. This creates duplication risk and makes it harder to ensure consistency across different clients.

How should we distribute logic between the frontend and backend to maximize maintainability, testability, and consistency?

## Decision Drivers

- **Single source of truth**: Business logic should be centralized to avoid inconsistencies
- **Testability**: Backend logic can be unit tested more easily than frontend logic
- **Reusability**: Backend APIs can serve multiple clients (web, mobile, CLI)
- **Performance**: Some real-time interactions require immediate client-side response
- **Offline capability**: Consider graceful degradation when backend is unavailable
- **User experience**: UI responsiveness should not be compromised

## Considered Options

1. **Thick client**: All logic in frontend, backend only for data storage
2. **Thin client**: All business logic in backend, frontend only for presentation
3. **Hybrid**: Business logic in backend, UI logic and fallbacks in frontend

## Decision Outcome

Chosen option: **Hybrid with backend as primary**, because it provides the best balance of consistency, testability, and user experience.

### Architecture Principles

1. **Backend is the source of truth** for all business logic:
   - Fibonacci level calculations
   - Signal detection
   - Harmonic pattern validation
   - Pivot point detection (future)
   - Trade validation and sizing

2. **Frontend responsibilities** (acceptable client-side logic):
   - UI state management (theme, panel visibility, selected items)
   - Form validation (immediate feedback before API call)
   - Data caching and optimistic updates
   - Fallback calculations when backend is unavailable
   - Chart interactions (zoom, pan, crosshair)
   - Real-time display updates

3. **Graceful degradation**:
   - When backend is unavailable, frontend may use client-side fallbacks
   - Fallbacks should be clearly indicated to the user
   - Fallback calculations should match backend logic exactly

### Positive Consequences

- Consistent calculations across all clients
- Easier to maintain and test business logic
- Single place to fix bugs in calculations
- Backend can be extended for broker integration
- Clear separation of concerns

### Negative Consequences

- Network latency for calculations
- Requires backend to be running for full functionality
- Need to maintain fallback code in frontend
- More complex error handling

## Implementation Guidelines

### What belongs in the Backend

| Category | Examples |
|----------|----------|
| **Fibonacci Calculations** | Retracement, extension, projection, expansion levels |
| **Signal Detection** | Type 1/2/3 signals, signal strength scoring |
| **Pattern Recognition** | Harmonic patterns (Gartley, Butterfly, Bat, Crab) |
| **Market Analysis** | Trend detection, support/resistance levels |
| **Trade Logic** | Position sizing, risk calculation, entry/exit rules |
| **Data Transformation** | OHLC aggregation, indicator calculations |

### What is acceptable in the Frontend

| Category | Examples |
|----------|----------|
| **UI State** | Theme, visibility toggles, selected items |
| **Form Handling** | Input validation, formatting |
| **Display Logic** | Number formatting, color coding |
| **Chart Interactions** | Zoom, pan, crosshair position |
| **Caching** | Local storage, session state |
| **Fallbacks** | Offline calculation fallbacks (clearly marked) |

### API Design

- Frontend calls backend API for all business calculations
- Backend returns computed values, frontend displays them
- Use the `/api/trader/*` proxy route to avoid CORS issues
- Include loading states and error handling

### Example Flow

```
User changes pivot points
    → Frontend validates input format
    → Frontend calls POST /api/trader/fibonacci/retracement
    → Backend calculates levels
    → Backend returns { levels: {...} }
    → Frontend displays levels on chart

If backend unavailable:
    → Frontend shows "Backend unavailable" indicator
    → Frontend uses client-side fallback calculation
    → Frontend shows warning that fallback is in use
```

## Migration Plan

The following frontend logic should be migrated to use backend APIs:

1. **Fibonacci calculations** (use-pivot-analysis.ts)
   - Currently uses RETRACEMENT_RATIOS, EXTENSION_RATIOS, etc.
   - Should call /fibonacci/retracement, /fibonacci/extension

2. **Pivot point detection** (market-utils.ts → detectPivotPoints)
   - Currently client-side swing high/low detection
   - Should add backend endpoint for pivot detection

3. **Signal detection** (not yet implemented)
   - Use existing /signal/detect endpoint

4. **Harmonic patterns** (not yet implemented)
   - Use existing /harmonic/validate endpoint

## Links

- [ADR: Use Python/FastAPI and Next.js](20251229-use-python-fastapi-nextjs-tradingview.md)
- [Backend API Documentation](/docs/backend/README.md)
