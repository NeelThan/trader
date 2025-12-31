# Frontend to Backend Business Logic Migration Plan

- Status: proposed
- Deciders: Team
- Date: 2025-12-31
- Tags: architecture, refactoring, frontend, backend

## Context and Problem Statement

The frontend codebase contains significant trading-specific business logic that should reside in the Python backend. This violates our architectural principle of "dumb frontend client" and creates issues with:
- Consistency across clients
- Testability of financial calculations
- Auditability for trading operations
- Performance optimization
- Maintenance and updates

## Decision Outcome

Systematically migrate all business logic to the backend using TDD approach.

---

## Identified Business Logic (Priority Order)

### Phase 1: Critical - Financial Calculations (Week 1-2)

| Logic | Current Location | Backend Endpoint | Tests Needed |
|-------|------------------|------------------|--------------|
| Position Sizing | `use-position-sizing.ts:104-173` | `POST /api/position-size` | Unit + Integration |
| Risk/Reward Calc | `PositionSizingTool.tsx:122-176` | `POST /api/risk-reward` | Unit + Integration |
| Fibonacci Levels | `use-fibonacci-api.ts:107-131` | Already exists | Update frontend to always use |

**Deliverables:**
- [ ] Backend: `POST /api/position-size` endpoint
- [ ] Backend: `POST /api/risk-reward` endpoint
- [ ] Backend: Unit tests with 100% coverage
- [ ] Frontend: Remove calculation logic, use API
- [ ] E2E: Verify calculations match expected values

### Phase 2: High Priority - Pattern Detection (Week 3-4)

| Logic | Current Location | Backend Endpoint | Tests Needed |
|-------|------------------|------------------|--------------|
| Pivot Detection | `market-utils.ts:18-85` | `POST /api/pivots/detect` | Unit + Integration |
| Signal Detection | `SignalScanner.tsx:62-118` | `POST /api/signals/detect` | Unit + Integration |
| Technical Indicators | `technical-indicators.ts` | `POST /api/indicators` | Unit + Integration |

**Deliverables:**
- [ ] Backend: `POST /api/pivots/detect` endpoint
- [ ] Backend: `POST /api/signals/detect` endpoint
- [ ] Backend: `POST /api/indicators` endpoint (SMA, EMA, RSI, ADX)
- [ ] Backend: Unit tests with 100% coverage
- [ ] Frontend: Remove algorithms, use API
- [ ] E2E: Verify pattern detection accuracy

### Phase 3: Medium Priority - Trading Strategy (Week 5-6)

| Logic | Current Location | Backend Endpoint | Tests Needed |
|-------|------------------|------------------|--------------|
| Trend Alignment | `use-trend-analysis.ts:70-359` | `POST /api/trend/analyze` | Unit + Integration |
| Trade Validation | `use-workflow-state.ts:377-442` | `POST /api/workflow/validate` | Unit + Integration |
| Harmonic Patterns | Multiple files | Consolidate existing | Performance tests |

**Deliverables:**
- [ ] Backend: `POST /api/trend/analyze` endpoint
- [ ] Backend: `POST /api/workflow/validate` endpoint
- [ ] Backend: Optimize harmonic pattern endpoint for batch processing
- [ ] Frontend: Remove strategy logic, use API
- [ ] E2E: Verify trading decisions match expected

---

## Migration Process (Per Logic Unit)

Following TDD and our ADR standards:

### Step 1: RED - Write Backend Tests First
```python
# tests/unit/test_position_sizing.py
def test_calculate_position_size_returns_correct_value():
    result = calculate_position_size(
        entry_price=100,
        stop_loss=95,
        risk_capital=500
    )
    assert result.position_size == 100  # 500 / 5 = 100
```

### Step 2: GREEN - Implement Backend Logic
```python
# src/trader/position_sizing.py
def calculate_position_size(entry_price: float, stop_loss: float, risk_capital: float) -> PositionSize:
    distance = abs(entry_price - stop_loss)
    return PositionSize(position_size=risk_capital / distance)
```

### Step 3: Create API Endpoint
```python
# src/trader/main.py
@app.post("/api/position-size")
async def position_size(request: PositionSizeRequest) -> PositionSizeResponse:
    result = calculate_position_size(**request.dict())
    return PositionSizeResponse(**result.dict())
```

### Step 4: Integration Test
```python
# tests/integration/test_api.py
def test_position_size_endpoint(client):
    response = client.post("/api/position-size", json={...})
    assert response.status_code == 200
```

### Step 5: Update Frontend
```typescript
// Before (contains logic)
const positionSize = riskCapital / distance;

// After (API call only)
const { positionSize } = await fetch('/api/position-size', {
  method: 'POST',
  body: JSON.stringify({ entryPrice, stopLoss, riskCapital })
}).then(r => r.json());
```

### Step 6: Remove Frontend Logic
Delete calculation code, keep only:
- API call
- Loading states
- Error handling
- Display formatting

### Step 7: E2E Verification
```typescript
// e2e/position-sizing.spec.ts
test('calculates position size correctly', async ({ page }) => {
  await page.fill('[data-testid="entry-price"]', '100');
  await page.fill('[data-testid="stop-loss"]', '95');
  await expect(page.locator('[data-testid="position-size"]')).toHaveText('100');
});
```

---

## Files to Modify/Delete

### Frontend - Remove Business Logic From:
- [ ] `src/hooks/use-position-sizing.ts` - Keep settings, remove calculations
- [ ] `src/hooks/use-fibonacci-api.ts` - Remove fallback calculations
- [ ] `src/hooks/use-trend-analysis.ts` - Replace with API calls
- [ ] `src/hooks/use-workflow-state.ts` - Move validation to API
- [ ] `src/lib/market-utils.ts` - Move pivot detection to API
- [ ] `src/lib/technical-indicators.ts` - Move all indicators to API
- [ ] `src/components/chart/SignalScanner.tsx` - Use API for detection
- [ ] `src/components/trading/tools/PositionSizingTool.tsx` - Use API

### Backend - Create New Endpoints:
- [ ] `POST /api/position-size` - Position sizing calculation
- [ ] `POST /api/risk-reward` - R:R calculation
- [ ] `POST /api/pivots/detect` - Pivot point detection
- [ ] `POST /api/signals/detect` - Signal bar detection
- [ ] `POST /api/indicators` - Technical indicators (batch)
- [ ] `POST /api/trend/analyze` - Multi-timeframe trend analysis
- [ ] `POST /api/workflow/validate` - Workflow step validation

---

## Success Criteria

1. **All tests pass** - Unit, integration, e2e
2. **No business logic in frontend** - Only UI, API calls, formatting
3. **Backend coverage 100%** - For all migrated logic
4. **Performance maintained** - API response times < 200ms
5. **Calculations match** - Frontend results identical to before

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| API latency | Implement caching, batch endpoints |
| Offline support | Store last valid results, show stale indicators |
| Breaking changes | Parallel implementation, feature flags |
| Regression bugs | Comprehensive test coverage, gradual rollout |

---

## Tracking

Track migration progress in GitHub issues with labels:
- `migration:phase-1` - Financial calculations
- `migration:phase-2` - Pattern detection
- `migration:phase-3` - Trading strategy

Each PR should:
1. Include tests (backend unit + integration)
2. Update frontend to use API
3. Delete frontend business logic
4. Pass all existing tests
