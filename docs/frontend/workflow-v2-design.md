# Workflow V2 - Chart-Centric Trading System

## Overview

Create a **NEW page** (`/workflow-v2`) - a chart-centric, discovery-first trading interface that:
- Keeps the **chart always visible** as the primary focus (60% of screen)
- Shows Fibonacci levels from **ALL timeframes** (1M to 1m) overlaid on one chart
- Provides **fluid trade discovery** → validation → sizing → execution → management
- Includes **educational tooltips** with visual learning aids

**Route**: `/workflow-v2` (Chart Pro and current `/workflow` remain unchanged)

---

## Requirements Summary (from User Discussion)

### Core Philosophy
1. **Top-Down Analysis**: Start from 1M, work down to 1m
2. **Chart is King**: Always visible, shows ALL timeframe Fib levels
3. **Per-Timeframe Pivot Points**: Each TF has own A/B/C points, user can adjust
4. **Multi-Symbol Watchlist**: Scan opportunities across multiple symbols
5. **Educational Focus**: Visual learning aids, not just text tooltips

### Visual Design
- **Level Colors**: Blue = bullish, Red = bearish (NOT by timeframe)
- **Level Labels**: `{TF} {Ratio}` e.g., "1W R61.8%"
- **Confluence Zones**: Cluster nearby levels (toggleable)
- **Signal Indicators**: Visual highlight + alert + panel (all toggleable)

### Data Persistence
- **localStorage** for pivot points and settings
- Auto-restore on page reload
- Option to "lock" user-adjusted pivots from auto-refresh

### Refresh Strategy
| Timeframe | Auto-Refresh Interval |
|-----------|----------------------|
| 1M, 1W | Every 4 hours |
| 1D | Every 5 minutes |
| 4H, 1H | Every 1 minute |
| 15m, 5m, 1m | Every 10 seconds |

Manual refresh always available. Auto-refresh toggleable.

---

## Trading Flow

```
1. SELECT SYMBOL → Chart loads with blank pivots
       │
       ▼
2. ANALYZE TIMEFRAMES (Top-Down: 1M → 1m)
   For each timeframe:
   ├── Detect HH/HL/LH/LL swing points
   ├── Identify A/B/C pivot points
   ├── Determine trend (bullish/bearish/ranging)
   ├── Confirm with RSI/MACD
   ├── Calculate Fib levels based on trend direction
   │   - Bearish trend → Short retracements only
   │   - Bullish trend → Long retracements only
   │   - Past 100% → Extensions instead
   └── Draw levels on chart
       │
       ▼
3. DISCOVER OPPORTUNITIES
   ├── Scan all TFs for signal bars at Fib levels
   ├── Show in Signals Panel (organized by TF, direction, or quality)
   └── User picks opportunity to evaluate
       │
       ▼
4. VALIDATE TRADE
   ├── Check: Trend alignment (HTF vs LTF)
   ├── Check: Entry zone exists (Fib level)
   ├── Check: Targets available (extensions)
   ├── Check: RSI/MACD confirmation
   └── User can override warnings (logged for journal)
       │
       ▼
5. SIZE POSITION
   ├── Entry, Stop Loss, Targets
   ├── Account balance, Risk %
   ├── Calculate: Position size, R:R ratio
   └── Show recommendation (Excellent/Good/Marginal/Poor)
       │
       ▼
6. EXECUTE TRADE
   ├── Paper trading mode (no broker yet)
   ├── Auto-journal the trade
   └── Set price alerts
       │
       ▼
7. MANAGE TRADE
   ├── Track P&L on chart
   ├── Move to breakeven
   ├── Partial profit taking
   ├── Trailing stop option
   ├── Alerts when price hits levels
   └── Close and journal outcome
```

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ [DJI ▼] [+ Add Symbol]    Phase: Discover    🔄 Auto: ON | 2m ago  │
├────────────────────────────────────────────┬────────────────────────┤
│                                            │ SIGNALS PANEL          │
│              CHART (60%)                   │ [By TF ▼] [Filter ▼]  │
│                                            │                        │
│   TF: [1M] [1W] [1D] [4H] [1H] [15m]...   │ ┌────────────────────┐ │
│   [Zoom+] [Zoom-] [Reset] [🔄]            │ │ 1W LONG   85%   ▶ │ │
│                                            │ │ 1D SHORT  72%   ▶ │ │
│   ╔════════════════════════════════╗       │ │ 4H WAIT          │ │
│   ║  All TF Fib levels overlaid    ║       │ └────────────────────┘ │
│   ║  Blue = Long, Red = Short      ║       │                        │
│   ║  Labels: "1W R61.8%" etc.      ║       │ ──────────────────────│
│   ║  Confluence zones highlighted  ║       │ PIVOT SETTINGS         │
│   ╚════════════════════════════════╝       │ [1W ▼] A: ___  B: ___ │
│                                            │ [Lock from refresh ☐] │
│                                            │                        │
│                                            │ ──────────────────────│
│                                            │ LEVEL VISIBILITY       │
│                                            │ ☑ 1M ☑ 1W ☑ 1D       │
│                                            │ ☑ Show Confluence     │
├────────────────────────────────────────────┴────────────────────────┤
│  RSI: 42  │  MACD: ▲ Bullish  │  Trend: 5/7 Bullish  │  [?] Help  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Business Rules

### Base Analysis (Applies to ALL Strategies)
These foundational elements are detected first and used by all trading strategies:

| Element | Description | Persists Across Strategies |
|---------|-------------|---------------------------|
| Swing Points | HH, HL, LH, LL detection | Yes |
| Pivot Points | A, B, C points per timeframe | Yes |
| Trend Direction | Bullish, Bearish, Ranging | Yes |
| RSI/MACD | Indicator confirmation | Yes |
| Price Position | Where price is relative to swing | Yes |

---

### Fibonacci Strategies Overview

| Strategy | Purpose | When to Use | Key Levels | Pivot Points |
|----------|---------|-------------|------------|--------------|
| **Retracement** | Find **ENTRY** zones | Price pulling back within swing (0-100%) | 38.2%, 50%, 61.8%, 78.6% | 2 (A, X) |
| **Extension** | Find **TARGETS** beyond origin | Price past 100%, forecast from origin (A) | 127.2%, 161.8%, 261.8% | 2 (A, X) |
| **Expansion** | Find **TARGETS** from swing end | Price past swing, forecast from B | 38.2%, 50%, 61.8%, 100%, 161.8% | 2 (A, B) |
| **Projection** | Find **TARGETS** from ABC pattern | After ABC confirmed, project from C | 61.8%, 78.6%, 100%, 127.2%, 161.8% | 3 (A, B, C) |

**Key Difference - Extension vs Expansion:**
- **Extension**: Calculates from A and B, but **forecasts from A** (the origin)
- **Expansion**: Calculates from A and B, but **forecasts from B** (the end of swing)

---

### Rule 1: Fibonacci Strategy Selection

```
┌─────────────────────────────────────────────────────────────────┐
│                    STRATEGY DECISION TREE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Has price moved past 100% of swing?                            │
│      │                                                           │
│      ├── NO ──► Use RETRACEMENT                                 │
│      │          (Looking for pullback entry)                     │
│      │                                                           │
│      └── YES ─► Use EXTENSION                                   │
│                 (Price exploring new territory)                  │
│                                                                  │
│  Is A-B-C pattern confirmed?                                    │
│      │                                                           │
│      ├── YES ─► Also calculate PROJECTION                       │
│      │          (Project wave based on A-B leg)                  │
│      │                                                           │
│      └── NO ──► Skip projection for now                         │
│                                                                  │
│  Was there a strong impulse move?                               │
│      │                                                           │
│      ├── YES ─► Also calculate EXPANSION                        │
│      │          (Measure impulse continuation)                   │
│      │                                                           │
│      └── NO ──► Skip expansion                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Rule 2: Direction-Based Level Calculation

| Condition | Direction | Retracement | Extension | Expansion | Projection |
|-----------|-----------|-------------|-----------|-----------|------------|
| Trend = Bullish | LONG only | ✅ Calculate | ✅ Calculate | ✅ Calculate | ✅ Calculate |
| Trend = Bullish | SHORT | ❌ Skip | ❌ Skip | ❌ Skip | ❌ Skip |
| Trend = Bearish | SHORT only | ✅ Calculate | ✅ Calculate | ✅ Calculate | ✅ Calculate |
| Trend = Bearish | LONG | ❌ Skip | ❌ Skip | ❌ Skip | ❌ Skip |
| Trend = Ranging | Both | ⚠️ Warning | ⚠️ Warning | ❌ Skip | ❌ Skip |

---

### Rule 3: Level Calculation Formulas

#### Retracement (Entry Zones)
```
Used when: Price is pulling back in a trend
Direction: Trade WITH the trend

For BULLISH trend (looking for LONG entry):
  Level = Swing_High - (Range × Ratio)
  Where: Range = Swing_High - Swing_Low

For BEARISH trend (looking for SHORT entry):
  Level = Swing_Low + (Range × Ratio)
  Where: Range = Swing_High - Swing_Low

Ratios: 0.382, 0.5, 0.618, 0.786
```

#### Extension (Targets Beyond Swing)
```
Used when: Price has broken past 100% of swing
Direction: Continuation targets

For BULLISH extension:
  Level = Swing_Low + (Range × Ratio)
  Where: Ratio > 1.0 (e.g., 1.272, 1.618, 2.618)

For BEARISH extension:
  Level = Swing_High - (Range × Ratio)
```

#### Expansion (Impulse Wave Targets)
```
Used when: Strong impulse move confirmed
Direction: Measuring the impulse wave

Level = B + (Range × Ratio)  [for SELL]
Level = B - (Range × Ratio)  [for BUY]
Where:
  - B = end of swing (pivot B)
  - Range = |A - B|
  - Ratios: 0.382, 0.5, 0.618, 1.0, 1.618
```

#### Projection (A-B-C Based)
```
Used when: A-B-C pattern is confirmed
Direction: Projects C wave based on A-B

Level = Point_C + (AB_Range × Ratio)  [for SELL]
Level = Point_C - (AB_Range × Ratio)  [for BUY]
Where:
  - AB_Range = |Point_B - Point_A|
  - Ratios: 0.618, 0.786, 1.0, 1.272, 1.618

For BULLISH projection (C below B):
  Level = Point_C + (AB_Range × Ratio)

For BEARISH projection (C above B):
  Level = Point_C - (AB_Range × Ratio)
```

---

### Rule 4: Per-Level Calculation Rules Table

**Retracement Levels** (ENTRY zones - 2 pivots required)

| Level | When to Calculate | BUY Formula | SELL Formula |
|-------|-------------------|-------------|--------------|
| R38.2% | Price within swing | High - (Range × 0.382) | Low + (Range × 0.382) |
| R50.0% | Price within swing | High - (Range × 0.5) | Low + (Range × 0.5) |
| R61.8% | Price within swing | High - (Range × 0.618) | Low + (Range × 0.618) |
| R78.6% | Price within swing | High - (Range × 0.786) | Low + (Range × 0.786) |

**Extension Levels** (TARGETS beyond origin - 2 pivots, forecast from A)

| Level | When to Calculate | BUY Formula | SELL Formula |
|-------|-------------------|-------------|--------------|
| E127.2% | Price past 100% | High - (Range × 1.272) | Low + (Range × 1.272) |
| E161.8% | Price past 100% | High - (Range × 1.618) | Low + (Range × 1.618) |
| E261.8% | Price past 100% | High - (Range × 2.618) | Low + (Range × 2.618) |

**Expansion Levels** (TARGETS from swing end - 2 pivots, forecast from B)

| Level | When to Calculate | BUY Formula | SELL Formula |
|-------|-------------------|-------------|--------------|
| X38.2% | After swing complete | B - (Range × 0.382) | B + (Range × 0.382) |
| X50.0% | After swing complete | B - (Range × 0.5) | B + (Range × 0.5) |
| X61.8% | After swing complete | B - (Range × 0.618) | B + (Range × 0.618) |
| X100% | After swing complete | B - (Range × 1.0) | B + (Range × 1.0) |
| X161.8% | After swing complete | B - (Range × 1.618) | B + (Range × 1.618) |

**Projection Levels** (ABC TARGETS - 3 pivots, project from C)

| Level | When to Calculate | BUY Formula | SELL Formula |
|-------|-------------------|-------------|--------------|
| P61.8% | ABC pattern confirmed | C - (AB × 0.618) | C + (AB × 0.618) |
| P78.6% | ABC pattern confirmed | C - (AB × 0.786) | C + (AB × 0.786) |
| P100% | ABC pattern confirmed | C - (AB × 1.0) | C + (AB × 1.0) |
| P127.2% | ABC pattern confirmed | C - (AB × 1.272) | C + (AB × 1.272) |
| P161.8% | ABC pattern confirmed | C - (AB × 1.618) | C + (AB × 1.618) |

*Where: Range = |High - Low|, AB = |Point B - Point A|*

---

### Rule 4b: Smart Fib Combination Workflows

The power of Fibonacci comes from combining tools strategically:

#### Workflow 1: Retracement Entry → Expansion Targets

**Scenario**: Higher TF bullish, Lower TF pulling back (bearish)

```
1. IDENTIFY OPPORTUNITY
   └─ Monthly: Bullish trend (HH, HL pattern)
   └─ Weekly: Bearish pullback (counter-trend)
   └─ Direction: LONG (buy the dip)

2. FIND ENTRY WITH RETRACEMENT
   └─ Draw from Monthly swing High to Low
   └─ Calculate: R38.2%, R50%, R61.8%, R78.6%
   └─ Wait for price to reach one of these levels
   └─ Confirm with signal bar (close > open, close > Fib level)

3. ENTER TRADE
   └─ Entry: At confirmed retracement level
   └─ Stop Loss: Below swing low (or next Fib level)

4. FIND TARGETS WITH EXPANSION
   └─ From the ENTRY point (new pivot A)
   └─ To the swing low (new pivot B)
   └─ Calculate expansion targets: X100%, X127.2%, X161.8%
   └─ These become your take profit levels

5. MANAGE TRADE
   └─ TP1: X100% (100% of the entry-to-stop range)
   └─ TP2: X127.2% (move stop to breakeven after TP1)
   └─ TP3: X161.8% (trail stop)
```

#### Workflow 2: Projection for ABC Patterns

**Scenario**: Clear ABC pattern forming after trend move

```
1. IDENTIFY ABC PATTERN
   └─ A: Start of impulse wave (swing low in uptrend)
   └─ B: End of impulse wave (swing high)
   └─ C: End of retracement (higher low - pullback)

2. VALIDATE PATTERN
   └─ C should be at a Fib retracement of A-B (38.2%-78.6%)
   └─ C must hold above A (for bullish ABC)

3. PROJECT TARGETS FROM C
   └─ Calculate: P61.8%, P78.6%, P100%, P127.2%, P161.8%
   └─ P100% = "AB equals CD" pattern (classic target)

4. ENTER AT C OR AFTER CONFIRMATION
   └─ Entry: At C with signal bar, or breakout above B
   └─ Stop: Below C

5. TARGETS
   └─ TP1: P61.8% or P78.6%
   └─ TP2: P100% (AB=CD completion)
   └─ TP3: P127.2% or P161.8%
```

#### Workflow 3: Extension for Breakout Continuation

**Scenario**: Price breaks past previous swing high/low

```
1. IDENTIFY BREAKOUT
   └─ Price moves past 100% of previous swing
   └─ Trend continuation confirmed

2. CALCULATE EXTENSION TARGETS
   └─ From original swing origin (A)
   └─ Levels: E127.2%, E161.8%, E261.8%

3. USE AS PROFIT TARGETS OR RE-ENTRY
   └─ TP levels for existing position
   └─ Or wait for pullback to extension level for new entry
```

#### Quick Reference: Which Tool When?

| Situation | Tool to Use | Purpose |
|-----------|-------------|---------|
| Looking for entry in pullback | **Retracement** | Find where to BUY/SELL |
| Have entry, need targets | **Expansion** | Find TP levels from entry |
| Clear ABC pattern | **Projection** | Find TP from point C |
| Price broke past swing | **Extension** | Find continuation targets |
| Multiple Fib levels cluster | **Confluence** | High-probability zone |

---

### Future Strategies (Extensible Design)
The architecture supports adding new strategies beyond Fibonacci:

| Future Strategy | Reuses Base Analysis | New Elements Needed |
|-----------------|---------------------|---------------------|
| Harmonic Patterns | HH/HL/LH/LL, Trend | Pattern recognition (Gartley, Bat, etc.) |
| Elliott Wave | Swing points, Trend | Wave counting, rules |
| Supply/Demand | Pivot points | Zone detection |
| Ichimoku | Trend, Price position | Cloud calculations |

Base analysis (swing detection, trend, indicators) remains the same - only the strategy-specific calculations change.

---

### Rule 5: Trade Direction from Multi-TF
```
IF Higher TF = Bullish AND Lower TF = Bearish:
   → LONG opportunity (buy the pullback)

IF Higher TF = Bearish AND Lower TF = Bullish:
   → SHORT opportunity (sell the rally)

IF Both same direction:
   → WAIT (no counter-trend for entry)
```

### Rule 6: Signal Bar Detection
```
Type 1 Signal: Reversal pattern at Fib level
Type 2 Signal: Continuation pattern after pullback

Alert when:
- Price reaches a Fib level
- AND a signal bar pattern forms
- AND direction matches our trade setup
```

### Rule 7: Validation Checks (User-Configurable)
Each check can be: **Required** | **Warning** | **Ignored**

| Check | Description | Default |
|-------|-------------|---------|
| Trend Alignment | HTF + LTF directions match trade | Required |
| Entry Zone | Fib level exists for entry | Required |
| Target Zone | Extension levels for targets | Warning |
| RSI Confirmation | Not overbought/oversold against trade | Warning |
| MACD Confirmation | Momentum matches direction | Warning |

Overridden checks are logged in journal for learning.

### Rule 8: R:R Recommendations
```
R:R >= 3.0  → EXCELLENT (green)
R:R >= 2.0  → GOOD (blue)
R:R >= 1.5  → MARGINAL (amber)
R:R <  1.5  → POOR (red) - not recommended
```

---

## Data Storage (localStorage)

```typescript
type WorkflowV2Storage = {
  // Per-symbol, per-timeframe pivot points
  pivots: {
    [symbol: string]: {
      [timeframe: string]: {
        points: PivotPoint[];
        lockedFromRefresh: boolean;
        lastModified: string;
      };
    };
  };

  // Visibility settings
  visibility: {
    timeframes: { [tf: string]: boolean };
    showConfluence: boolean;
    showSignalHighlights: boolean;
  };

  // Alert settings
  alerts: {
    enabled: boolean;
    soundEnabled: boolean;
    perLevel: { [levelId: string]: boolean };
  };

  // Validation settings
  validation: {
    [checkName: string]: "required" | "warning" | "ignored";
  };

  // Watchlist
  watchlist: string[];  // Symbol list

  // Theme
  theme: "dark" | "light";
};
```

---

## Educational Content

### Tooltip Structure
```typescript
type EducationalContent = {
  brief: string;           // 1-2 sentences for [?] tooltip
  detailed: string;        // Full explanation
  formula?: string;        // Math formula if applicable
  visual?: string;         // Path to diagram/image
  example?: {
    scenario: string;
    calculation: string;
    result: string;
  };
};
```

### Visual Learning Aids
- Diagrams showing HH/HL/LH/LL patterns
- Animated Fibonacci drawing examples
- Signal bar pattern illustrations
- R:R ratio visual calculator

### Learn More Modal
- Opens from tooltip "Learn more" link
- Includes visual diagrams
- Interactive examples where possible

---

## Implementation Phases

### Phase 1: Foundation (TDD)
**Goal**: Core data structures and storage

1. Create localStorage hook for settings persistence
2. Create pivot point data model with CRUD operations
3. Create visibility config management
4. Tests first, then implementation

**Files**:
```
frontend/src/hooks/use-workflow-v2-storage.ts
frontend/src/types/workflow-v2.ts
tests for each
```

### Phase 2: Chart Integration
**Goal**: Single chart showing all TF levels

1. Extend CandlestickChart to accept multi-TF levels
2. Add level coloring (blue/red by direction)
3. Add level labels with TF + ratio
4. Add confluence zone detection and highlighting
5. Add timeframe switcher

**Files**:
```
frontend/src/components/workflow-v2/WorkflowV2Chart.tsx
frontend/src/hooks/use-multi-tf-levels.ts (enhance existing)
```

### Phase 3: Pivot Management Panel
**Goal**: Per-TF pivot point editing

1. Create pivot settings panel
2. Click-drag on chart to adjust pivots
3. Form input for exact values
4. Lock/unlock from auto-refresh
5. Auto-save to localStorage

**Files**:
```
frontend/src/components/workflow-v2/PivotSettingsPanel.tsx
frontend/src/hooks/use-editable-pivots.ts (enhance existing)
```

### Phase 4: Signals Panel
**Goal**: Show opportunities across all TFs

1. Aggregate signals from all timeframes
2. Sortable by TF, direction, or quality
3. Filter controls
4. Click to enter validation mode

**Files**:
```
frontend/src/components/workflow-v2/SignalsPanel.tsx
frontend/src/hooks/use-signal-aggregation.ts
```

### Phase 5: Validation Flow
**Goal**: Check trade criteria with educational content

1. Validation checklist UI
2. Per-check tooltips with [?] icon
3. Override capability with logging
4. Proceed button to sizing

**Files**:
```
frontend/src/components/workflow-v2/ValidationPanel.tsx
frontend/src/hooks/use-trade-validation.ts
frontend/src/lib/educational/validation-explanations.ts
```

### Phase 6: Sizing & Execution
**Goal**: Position sizing with auto-journal

1. Position sizing form
2. R:R calculation and recommendation badge
3. Paper trading mode
4. Auto-journal on execute

**Files**:
```
frontend/src/components/workflow-v2/SizingPanel.tsx
frontend/src/components/workflow-v2/ExecutionPanel.tsx
frontend/src/hooks/use-trade-execution.ts
```

### Phase 7: Trade Management
**Goal**: Full trade tracking

1. P&L display on chart
2. Breakeven, trailing stop, partial exit controls
3. Alerts when price hits levels
4. Close trade and journal outcome

**Files**:
```
frontend/src/components/workflow-v2/ManagePanel.tsx
frontend/src/hooks/use-trade-management.ts
```

### Phase 8: Watchlist & Multi-Symbol
**Goal**: Scan across multiple symbols

1. Watchlist management UI
2. Background scanning of all watchlist symbols
3. Cross-symbol opportunity summary
4. Quick switch between symbols

**Files**:
```
frontend/src/components/workflow-v2/WatchlistPanel.tsx
frontend/src/hooks/use-watchlist.ts
```

### Phase 9: Educational Content
**Goal**: Visual learning aids

1. Create diagram assets
2. Implement "Learn More" modal
3. Add visual calculators
4. Populate all educational content

**Files**:
```
frontend/src/components/workflow-v2/LearnMoreModal.tsx
frontend/src/lib/educational/*.ts
public/images/education/...
```

### Phase 10: Theme & Polish
**Goal**: Light/dark mode and UX refinements

1. Add light mode theme
2. Theme toggle
3. Responsive adjustments
4. Performance optimization

---

## File Structure

```
frontend/src/
├── app/workflow-v2/
│   └── page.tsx                    # <100 lines, orchestrates layout
├── components/workflow-v2/
│   ├── WorkflowV2Layout.tsx        # Main layout (chart + sidebar)
│   ├── WorkflowV2Chart.tsx         # Chart with multi-TF levels
│   ├── SignalsPanel.tsx            # Opportunity list
│   ├── PivotSettingsPanel.tsx      # Per-TF pivot editing
│   ├── LevelVisibilityPanel.tsx    # Show/hide TF levels
│   ├── ValidationPanel.tsx         # Trade validation checklist
│   ├── SizingPanel.tsx             # Position sizing
│   ├── ExecutionPanel.tsx          # Trade execution
│   ├── ManagePanel.tsx             # Trade management
│   ├── WatchlistPanel.tsx          # Multi-symbol watchlist
│   └── LearnMoreModal.tsx          # Educational detail modal
├── hooks/
│   ├── use-workflow-v2-storage.ts  # localStorage persistence
│   ├── use-signal-aggregation.ts   # Cross-TF signal detection
│   ├── use-trade-validation.ts     # Validation logic
│   ├── use-trade-execution.ts      # Sizing + execute
│   ├── use-trade-management.ts     # Active trade tracking
│   └── use-watchlist.ts            # Multi-symbol scanning
├── lib/educational/
│   ├── index.ts
│   ├── trend-explanations.ts
│   ├── fibonacci-explanations.ts
│   ├── indicator-explanations.ts
│   ├── validation-explanations.ts
│   └── risk-explanations.ts
└── types/
    └── workflow-v2.ts              # Type definitions
```

---

## Backend Requirements

### Existing Endpoints (Reuse)
- `GET /workflow/assess` - Trend assessment
- `GET /workflow/align` - Multi-TF alignment
- `GET /workflow/levels` - Fibonacci levels
- `GET /workflow/confirm` - Indicator confirmation
- `POST /position/size` - Position sizing
- `POST /position/risk-reward` - R:R calculation
- `POST /journal/entries` - Create journal entry

### New Endpoint Needed
```
GET /workflow/opportunities?symbols=DJI,SPX&timeframes=1M,1W,1D...

Returns aggregated opportunities across symbols and timeframes.
```

---

## Development Standards

### TDD Workflow (Mandatory)
```
1. RED:    Write failing test first
2. GREEN:  Write minimal code to pass
3. REFACTOR: Apply quality checks (see below)
4. COMMIT: Push deployable checkpoint
```

### Code Quality Checks (Every Refactor Step)
| Check | Action |
|-------|--------|
| **Code Smells** | Long functions? Split. Long classes? Extract. Duplicate code? DRY it. |
| **Function Size** | Max 20 lines per function |
| **Component Size** | Max 100 lines per component |
| **SOLID Principles** | Single responsibility, Open/closed, Liskov, Interface segregation, Dependency inversion |
| **Cyclomatic Complexity** | Keep branches low, extract complex conditions |
| **Cognitive Complexity** | If hard to understand, simplify |
| **Big O Analysis** | Consider time/space complexity for loops and data structures |

### Clean Code Standards
- **Naming**: Full descriptive names, NO abbreviations
  - Good: `calculatePositionSize`, `validationCheckResult`
  - Bad: `calcPosSize`, `valChkRes`
- **Self-Documenting**: Code explains itself
- **Comments**: Only where logic isn't self-evident
- **Tidy First**: Before working on code, fix any smells found

### Checkpoint Discipline
```
After EACH phase or significant feature:
1. Run linter (ruff for Python, eslint for TypeScript)
2. Run type checker (mypy for Python, tsc for TypeScript)
3. Run tests (pytest, jest)
4. Verify 100% test coverage for new code
5. Update documentation
6. Commit with conventional commit message
7. Push to remote
```

### File Size Limits
| Type | Max Lines | Action if Exceeded |
|------|-----------|-------------------|
| Page (page.tsx) | 100 | Extract to components |
| Component | 100 | Split into smaller components |
| Hook | 150 | Extract helper hooks |
| Utility | 100 | Split into focused modules |
| Backend function | 20 | Extract helper functions |

### Development Approach

1. **TDD Skill**: Use TDD agent for all new features
2. **Incremental**: One phase at a time, always deployable
3. **Small Components**: Max 100 lines each
4. **Hooks for Logic**: Components are display-only
5. **Backend Calculations**: Frontend just displays results
6. **Documentation**: Update as we go, not after

---

## Future Enhancements (Not in V2)

- Broker integration (Trade Nation, Capital Index)
- Cross-device sync via backend database
- Price alert notifications (push/email)
- Strategy backtesting
- AI-assisted pattern recognition

---

*Document Version: 2.0*
*Last Updated: January 2025*
*Based on: Sandy Jadeja Fibonacci Trading Workshop*
