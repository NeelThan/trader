# Project Backlog

Last updated: 2026-01-21

## Migration Status: Thin-Client Architecture (ADR 20251230)

### Completed Migrations

| Hook | Status | Changes Made |
|------|--------|--------------|
| `use-trade-validation.ts` | ✅ Complete | Removed local fallback validation; uses `/workflow/validate` only |
| `use-trade-execution.ts` | ✅ Complete | Position sizing via `/position/size`, R:R via `/position/risk-reward` |
| `use-trade-discovery.ts` | ✅ Complete | Trade categorization via `/workflow/categorize` |
| `use-trend-alignment.ts` | ✅ Complete | New `/workflow/trend-alignment` endpoint; removed ~700 lines of local calculations |
| `use-signal-suggestions.ts` | ✅ Complete | New `/workflow/signal-suggestions` endpoint; removed local signal generation |
| `use-signal-aggregation.ts` | ✅ Complete | New `/workflow/signal-aggregation` endpoint; removed Fib rejection/confluence detection |
| `use-multi-tf-levels.ts` | ✅ Compliant | Already calls backend APIs |
| `use-signal-detection.ts` | ✅ Compliant | Already calls backend APIs |
| `use-category-sizing.ts` | ✅ Acceptable | Thin wrapper for risk multiplier lookup |

### Deferred (Low Priority)

| Hook | Status | Notes |
|------|--------|-------|
| `use-trade-management.ts` | ⏸️ Deferred | Real-time P&L/trailing stop calculations acceptable in frontend for UX responsiveness |

## High-Priority Items

### 1. ~~Opportunity Scanning Alignment Rules~~ ✅
**Status:** Complete (2026-01-21)
**Files:** `backend/src/trader/workflow.py` (`scan_opportunities`, `_analyze_symbol_pair`)

**Completed:**
- Enhanced TradeOpportunity model with entry_level, current_price, confluence_score, signal_bar_detected, distance_to_entry_pct
- Updated _analyze_symbol_pair() to check Fib levels and signal bars
- Pullbacks now require signal bar confirmation at entry level

### 2. ~~Direction-Based Fibonacci Display~~ ✅
**Status:** Complete (2026-01-21)
**Files:** `backend/src/trader/main.py`, `frontend/src/hooks/use-multi-tf-levels.ts`, `frontend/src/hooks/use-workflow-v2-levels.ts`

**Completed:**
- Added swing_endpoint to pivot detection response (B<C = high/buy, B>C = low/sell)
- Frontend hooks now filter Fib levels by swing direction
- Only relevant direction levels are fetched/displayed

### 3. ~~Signal Bar Confirmation Integration~~ ✅
**Status:** Complete (2026-01-21)
**Files:** `backend/src/trader/workflow.py`, `backend/src/trader/main.py`, `frontend/src/hooks/use-trade-validation.ts`

**Completed:**
- Added SignalBarData model and _check_signal_bar_confirmation() as 8th validation check
- Updated validate_trade() to accept signal_bar_data and entry_level
- Frontend hook passes signal bar data to backend
- Per SignalPro spec: "No signal bar = No trade"

### 4. Strategy Selection Rules
**Status:** Not Started
**Files:** `backend/src/trader/workflow.py`

**Issue:** Strategy selection (retracement vs extension vs projection vs expansion) is not implemented in workflow flow. Validation mostly uses retracement/extension only.

**Required Changes:**
- Implement strategy selection based on market conditions
- Apply correct Fibonacci strategy per trading scenario
- Document strategy selection criteria

## Medium-Priority Items

### 5. Watchlist Management UI
**Status:** Not Started
**Files:** `frontend/src/components/workflow-v2/DiscoveryModePanel.tsx`

**Issue:** Scan uses a hardcoded watchlist. No UI for managing watchlist.

**Required Changes:**
- Add watchlist management component
- Persist user watchlist preferences
- Allow add/remove/reorder symbols

### 6. Auto-Refresh by Timeframe
**Status:** Partial
**Files:** `frontend/src/hooks/use-multi-tf-levels.ts`

**Issue:** Auto-refresh intervals by timeframe are not enforced for multi-TF levels. Only active chart feed auto-refreshes.

**Required Changes:**
- Implement timeframe-specific refresh intervals
- Apply ADR refresh interval guidelines
- Prevent excessive API calls

### 7. Educational Tooltips
**Status:** Not Started

**Issue:** Educational tooltips and visual aids are not implemented.

**Required Changes:**
- Add tooltips explaining Fibonacci concepts
- Provide visual aids for trend alignment
- Help users understand signal suggestions

## Roadmap Items

### #16 Trade Journaling and Analytics
**Status:** Backend Complete, Frontend In Progress

**Completed:**
- Backend paper trade storage and retrieval APIs
- Trade execution scaffolding in frontend

**Remaining:**
- Trade history display component
- Analytics dashboard (win rate, R-multiple distribution)
- Export functionality

### #17 Broker Integration
**Status:** Not Started

**Scope:**
- Connect to real broker APIs
- Execute actual trades (with confirmation)
- Sync portfolio/positions
- Real-time P&L from broker

## Testing Gaps

### Integration Tests
- [ ] Workflow endpoint integration tests
- [ ] Opportunity scanning correctness tests
- [ ] SignalPro rule enforcement tests

### Parity Tests
- [ ] Frontend/backend calculation parity verification
- [ ] Trend alignment result consistency
- [ ] Position sizing result consistency

### E2E Tests
- [ ] Alignment matrix validation
- [ ] Fib direction rule enforcement
- [ ] Signal bar gating verification
- [ ] Full workflow end-to-end test

## Completed Work Log

### 2026-01-21: Direction-Based Fib, Signal Bar Gating, and Scanning Fixes
- **Direction-Based Fibonacci:** Added swing_endpoint to pivot detection; frontend filters levels by direction
- **Signal Bar Confirmation:** Added as 8th validation check; "No signal bar = No trade" enforced
- **Opportunity Scanning:** Enhanced TradeOpportunity model; pullbacks require signal bar at entry level
- **Result:** 157 workflow tests passing; 1046 lines added across 6 files

### 2026-01-21: Thin-Client Migration Complete
- **Phase 1:** Refactored `use-trade-validation.ts`, `use-trade-execution.ts`, `use-trade-discovery.ts` to use existing backend APIs
- **Phase 2:** Added three new backend endpoints:
  - `/workflow/trend-alignment` - Combined trend analysis across all timeframes
  - `/workflow/signal-suggestions` - Generate trade signal suggestions from trend alignment
  - `/workflow/signal-aggregation` - Aggregate signals with Fib rejection and confluence detection
- **Result:** Frontend hooks reduced by ~1500 lines of business logic; all trading calculations now server-side
