# Workflow V2 Status Report (2026-01-19)

## Scope
Review of Workflow V2 vs documentation:
- docs/frontend/workflow-v2-design.md
- docs/frontend/workflow-v2-architecture.md
- docs/signalpro-trading-system.md
- docs/references/*
- ADRs: thin-client + frontend-backend migration

## Implemented Functionality
- Backend APIs for Fibonacci (retracement/extension/projection/expansion), pivots, signals, indicators, workflow analysis: backend/src/trader/*, backend/src/trader/main.py
- Workflow V2 page with chart-centric layout, multi-TF levels, confluence zones, pivot editor, indicators, and phase panels: frontend/src/app/workflow-v2/page.tsx, frontend/src/components/workflow-v2/WorkflowV2Layout.tsx
- Paper trade journaling and trade management scaffolding: frontend/src/hooks/use-trade-execution.ts, frontend/src/hooks/use-trade-management.ts
- Local state persistence for workflow progress and V2 storage: frontend/src/hooks/use-workflow-v2-state.ts, frontend/src/hooks/use-workflow-v2-storage.ts

## Correctness Issues (vs documented behavior)
- Opportunity scanning ignores HTF/LTF alignment rules; direction is based only on higher TF trend (conflicts with SignalPro alignment matrix and Workflow V2 rules).
  - backend/src/trader/workflow.py (scan_opportunities/_analyze_symbol_pair)
- Signal aggregation expects /workflow/assess response fields (direction, swing_high, swing_low) that are not returned by the backend.
  - frontend/src/hooks/use-signal-aggregation.ts vs backend/src/trader/main.py
- Direction-based Fibonacci display is not enforced; both long/short levels are calculated regardless of pivot relationships.
  - frontend/src/hooks/use-multi-tf-levels.ts
- Trade validation logic lives on the frontend and does not call backend validation APIs (thin-client ADR violation).
  - frontend/src/hooks/use-trade-validation.ts
- Position sizing and R:R are computed in the frontend and do not call backend endpoints (thin-client ADR violation).
  - frontend/src/hooks/use-trade-execution.ts
- Signal bar confirmation is not part of the workflow validation flow (required by SignalPro docs).
  - frontend/src/hooks/use-signal-detection.ts is not integrated into validation.

## Gaps vs Spec
- Strategy selection rules (retracement vs extension vs projection vs expansion) are not implemented in the workflow flow; validation mostly uses retracement/extension only.
- ABC/pivot-aware direction logic (docs/references/fibonacci_conditions.md) is not applied to determine buy/sell level sets.
- Watchlist management UI is missing; scan uses a hardcoded watchlist.
  - frontend/src/components/workflow-v2/DiscoveryModePanel.tsx
- Educational tooltips/visual aids are not implemented.
- Auto-refresh intervals by timeframe are not enforced for multi-TF levels (only active chart feed auto-refreshes).

## Thin-Client Architecture Drift
Frontend currently performs business logic that should be backend-owned:
- Trend alignment and fallback trend calculations: frontend/src/hooks/use-trend-alignment.ts
- Signal suggestions and opportunity categorization: frontend/src/hooks/use-signal-suggestions.ts, frontend/src/hooks/use-trade-discovery.ts
- Confluence scoring and validation: frontend/src/hooks/use-trade-validation.ts
- Position sizing/R:R: frontend/src/hooks/use-trade-execution.ts
- Trade management calculations: frontend/src/hooks/use-trade-management.ts

## Testing – Critical Assessment
- Backend tests are mostly model/unit coverage; no integration tests for workflow endpoints or opportunity scanning correctness.
  - backend/tests/unit/test_workflow.py
- Frontend tests cover storage/state hooks but not SignalPro rule enforcement, validation correctness, or sizing accuracy.
  - frontend/src/hooks/use-workflow-v2-*.test.ts
- E2E tests are primarily smoke/fallback checks; no tests validating alignment matrix, fib direction rules, or signal bar gating.
  - frontend/e2e/workflow-v2-fallback.spec.ts
- No tests verify parity between frontend and backend calculations.

## High-Priority Improvements
1) Move trade validation, sizing, and trend classification to backend; expose /workflow/validate, /position/size, /position/risk-reward and update frontend to consume them.
2) Fix /workflow/opportunities to use HTF/LTF alignment logic and include fib-level + signal-bar checks before emitting opportunities.
3) Enforce direction-based Fibonacci selection using pivot relationships (docs/references/fibonacci_conditions.md).
4) Integrate signal-bar detection into validation (gatekeeper rule).
5) Add integration tests that assert SignalPro rules and verify backend/frontend parity.
