# Workflow V2 - Chart-Centric Trading System Architecture

## Overview

Workflow V2 is a chart-centric, discovery-first trading interface that keeps the chart always visible as the primary focus. It provides fluid trade discovery, validation, sizing, execution, and management across all timeframes.

**Route**: `/workflow-v2`

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Phase Flow](#phase-flow)
3. [Component Hierarchy](#component-hierarchy)
4. [Hook Dependencies](#hook-dependencies)
5. [Data Flow](#data-flow)
6. [Business Logic](#business-logic)
7. [State Management](#state-management)
8. [Type Definitions](#type-definitions)

---

## System Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph Page["page.tsx"]
        WF[WorkflowV2Page]
    end

    subgraph Hooks["Custom Hooks"]
        TD[useTradeDiscovery]
        TV[useTradeValidation]
        TE[useTradeExecution]
        TM[useTradeManagement]
    end

    subgraph Layout["Layout Component"]
        WL[WorkflowV2Layout]
    end

    subgraph Panels["Phase Panels"]
        DP[DiscoveryPanel]
        VP[ValidationPanel]
        SP[SizingPanel]
        EP[ExecutionPanel]
        MP[ManagePanel]
    end

    subgraph ChartComponents["Chart Components"]
        CC[CandlestickChart]
        RSI[RSIPane]
        MACD[MACDChart]
        LT[LevelTooltip]
        CZ[ConfluenceZones]
        LTB[LevelsTable]
        SSP[SwingSettingsPanel]
    end

    subgraph Storage["Persistence"]
        LS[(localStorage)]
        API[(Backend API)]
    end

    WF --> WL
    WF --> TD
    WF --> TV
    WF --> TE

    WL --> CC
    WL --> RSI
    WL --> MACD
    WL --> LT
    WL --> CZ
    WL --> LTB
    WL --> SSP

    WF --> DP
    WF --> VP
    WF --> SP
    WF --> EP
    WF --> MP

    MP --> TM

    TD --> LS
    TV --> LS
    TE --> API
```

### File Structure

```
frontend/src/
├── app/workflow-v2/
│   └── page.tsx                    # Main page orchestrator (<100 lines)
├── components/workflow-v2/
│   ├── WorkflowV2Layout.tsx        # Main layout (chart + sidebar)
│   ├── DiscoveryPanel.tsx          # Trade opportunity list
│   ├── ValidationPanel.tsx         # Trade validation checklist
│   ├── SizingPanel.tsx             # Position sizing form
│   ├── ExecutionPanel.tsx          # Trade execution confirmation
│   ├── ManagePanel.tsx             # Active trade management
│   ├── LevelTooltip.tsx            # Fib level details on hover
│   ├── TrendAlignmentPanel.tsx     # Per-timeframe trend display
│   ├── TimeframeSettingsPopover.tsx # Fib ratio configuration
│   ├── DataSourcePanel.tsx         # Data source controls
│   └── LevelTooltip.test.ts        # Confluence zone tests
├── hooks/
│   ├── use-trade-discovery.ts      # Opportunity discovery
│   ├── use-trade-validation.ts     # Trade validation logic
│   ├── use-trade-execution.ts      # Position sizing + execution
│   └── use-trade-management.ts     # Active trade tracking
└── types/
    └── workflow-v2.ts              # Type definitions
```

---

## Phase Flow

### Workflow State Machine

```mermaid
stateDiagram-v2
    [*] --> DISCOVER
    DISCOVER --> VALIDATE: Select Opportunity
    VALIDATE --> DISCOVER: Back
    VALIDATE --> SIZE: Proceed (60%+ checks pass)
    SIZE --> VALIDATE: Back
    SIZE --> EXECUTE: Proceed (entry + stop set)
    EXECUTE --> SIZE: Back
    EXECUTE --> MANAGE: Execute Trade
    MANAGE --> DISCOVER: Close Trade
```

### Phase Definitions

| Phase | Description | Entry Condition | Exit Condition |
|-------|-------------|-----------------|----------------|
| **DISCOVER** | Scan all timeframes for opportunities | Initial state | User selects opportunity |
| **VALIDATE** | Check trade criteria (7 checks) | Opportunity selected | 60%+ checks pass (5+ of 7) |
| **SIZE** | Calculate position size and R:R | Validation passed | Entry & stop set |
| **EXECUTE** | Confirm and execute trade | Sizing valid | Trade executed |
| **MANAGE** | Track P&L, manage stops/targets | Trade active | Trade closed |

### Phase Transition Flow

```mermaid
sequenceDiagram
    participant User
    participant Page
    participant Discovery
    participant Validation
    participant Sizing
    participant Execution
    participant Management

    User->>Page: Load /workflow-v2
    Page->>Discovery: Show opportunities
    Discovery-->>User: Display trade cards

    User->>Discovery: Click opportunity
    Discovery->>Page: onSelectOpportunity()
    Page->>Validation: setPhase("validate")
    Validation-->>User: Show checklist

    User->>Validation: Click "Proceed"
    Validation->>Page: onProceed()
    Page->>Sizing: setPhase("size")
    Sizing-->>User: Show sizing form

    User->>Sizing: Click "Proceed to Execution"
    Sizing->>Page: onProceed()
    Page->>Execution: setPhase("execute")
    Execution-->>User: Show confirmation

    User->>Execution: Click "Execute Trade"
    Execution->>Page: onExecute() + onComplete()
    Page->>Management: setPhase("manage")
    Management-->>User: Show trade tracking

    User->>Management: Click "Close Trade"
    Management->>Page: onClose()
    Page->>Discovery: setPhase("discover")
```

---

## Component Hierarchy

### Component Tree

```mermaid
graph TD
    subgraph PageLevel["Page Level"]
        WP[WorkflowV2Page]
    end

    subgraph LayoutLevel["Layout Level"]
        WL[WorkflowV2Layout]
    end

    subgraph ChartArea["Chart Area"]
        CS[Chart Container]
        CC[CandlestickChart]
        RSI[RSIPane]
        MACD[MACDChart]
        LT[LevelTooltip]
        PE[PivotPointsEditor]
        LTB[LevelsTable]
        TA[TrendAlignmentPanel]
        SSP[SwingSettingsPanel]
    end

    subgraph SidePanel["Side Panel - Dynamic"]
        DP[DiscoveryPanel]
        VP[ValidationPanel]
        SP[SizingPanel]
        EP[ExecutionPanel]
        MP[ManagePanel]
    end

    subgraph DiscoveryChildren["DiscoveryPanel Children"]
        OC[OpportunityCard]
        TB[Test Buttons]
    end

    subgraph ValidationChildren["ValidationPanel Children"]
        CI[CheckItem]
        SL[SuggestedLevels]
    end

    subgraph SizingChildren["SizingPanel Children"]
        AS[Account Settings]
        TP[Trade Parameters]
        CV[Calculated Values]
    end

    subgraph ManageChildren["ManagePanel Children"]
        PL[P&L Display]
        AB[Action Buttons]
        TL[Trade Log]
    end

    WP --> WL
    WP --> DP
    WP --> VP
    WP --> SP
    WP --> EP
    WP --> MP

    WL --> CS
    CS --> CC
    CS --> RSI
    CS --> MACD
    CS --> LT
    CS --> PE
    CS --> LTB
    CS --> TA
    CS --> SSP

    DP --> OC
    DP --> TB

    VP --> CI
    VP --> SL

    SP --> AS
    SP --> TP
    SP --> CV

    MP --> PL
    MP --> AB
    MP --> TL
```

### Component Responsibilities

| Component | Lines | Responsibility |
|-----------|-------|----------------|
| `page.tsx` | ~150 | Phase state management, hook coordination |
| `WorkflowV2Layout` | ~800 | Chart rendering, toolbar, feature toggles |
| `DiscoveryPanel` | ~290 | Display opportunities, test trade buttons |
| `ValidationPanel` | ~185 | Show 7 validation checks, suggested levels |
| `SizingPanel` | ~400 | Account settings, trade params, calculations |
| `ExecutionPanel` | ~210 | Trade summary, execute button |
| `ManagePanel` | ~330 | P&L tracking, breakeven, trailing stop |
| `LevelTooltip` | ~350 | Fib level hover details, confluence zones |

---

## Hook Dependencies

### Hook Dependency Graph

```mermaid
graph TD
    subgraph Discovery["useTradeDiscovery"]
        TD[useTradeDiscovery]
        TA[useTrendAlignment]
        SS[useSignalSuggestions]
    end

    subgraph Validation["useTradeValidation"]
        TV[useTradeValidation]
        MTF[useMultiTFLevels]
    end

    subgraph Execution["useTradeExecution"]
        TE[useTradeExecution]
    end

    subgraph Management["useTradeManagement"]
        TM[useTradeManagement]
    end

    subgraph External["External Hooks"]
        RSI[useRSI]
        MACD[useMACD]
        SW[useSwingMarkers]
        EP[useEditablePivots]
        PS[usePersistedSwingSettings]
    end

    subgraph API["API Layer"]
        JE[createJournalEntry]
    end

    TD --> TA
    TD --> SS
    TA --> RSI
    TA --> MACD
    TA --> SW

    TV --> MTF
    MTF --> EP
    MTF --> PS

    TE --> API
    TE --> JE

    TM --> TE
```

### Hook Data Flow

```mermaid
flowchart LR
    subgraph Input["User Input"]
        SYM[Symbol]
        OPP[Selected Opportunity]
        PHASE[Phase]
    end

    subgraph Discovery["Discovery Phase"]
        TD[useTradeDiscovery]
        OPPS["opportunities[]"]
    end

    subgraph Validation["Validation Phase"]
        TV[useTradeValidation]
        CHECKS["checks[]"]
        LEVELS["fibLevels[]"]
        SUGG["suggestedEntry/Stop/Targets"]
    end

    subgraph Execution["Sizing/Execute Phase"]
        TE[useTradeExecution]
        SIZING[SizingData]
        CAPTURED[CapturedValidation]
    end

    subgraph Management["Manage Phase"]
        TM[useTradeManagement]
        STATUS[TradeStatus]
        PNL[P&L]
        LOG[TradeLog]
    end

    SYM --> TD
    TD --> OPPS
    OPPS --> OPP

    OPP --> TV
    PHASE --> TV
    TV --> CHECKS
    TV --> LEVELS
    TV --> SUGG

    OPP --> TE
    SUGG --> TE
    SUGG --> CAPTURED
    TE --> SIZING

    OPP --> TM
    SIZING --> TM
    TM --> STATUS
    TM --> PNL
    TM --> LOG
```

---

## Data Flow

### Data Dependencies Between Phases

```mermaid
graph TB
    subgraph DiscoveryData["Discovery Data"]
        trends["TimeframeTrend[]"]
        signals["SignalSuggestion[]"]
        opportunities["TradeOpportunity[]"]
    end

    subgraph ValidationData["Validation Data"]
        checks["ValidationCheck[]"]
        entryLevels["StrategyLevel[]"]
        targetLevels["StrategyLevel[]"]
        suggestedEntry[number]
        suggestedStop[number]
        suggestedTargets["number[]"]
    end

    subgraph ExecutionData["Execution Data"]
        capturedValidation[CapturedValidation]
        sizing[SizingData]
        accountSettings[accountBalance, riskPercentage]
        tradeOverrides[entryPrice?, stopLoss?, targets?]
    end

    subgraph ManagementData["Management Data"]
        status[TradeStatus]
        currentPrice[number]
        currentPnL[number]
        rMultiple[number]
        tradeLog["TradeLogEntry[]"]
    end

    trends --> signals
    signals --> opportunities

    opportunities --> checks
    opportunities --> entryLevels
    opportunities --> targetLevels
    entryLevels --> suggestedEntry
    targetLevels --> suggestedTargets

    suggestedEntry --> capturedValidation
    suggestedStop --> capturedValidation
    suggestedTargets --> capturedValidation

    capturedValidation --> sizing
    accountSettings --> sizing
    tradeOverrides --> sizing

    sizing --> status
    sizing --> currentPnL
    sizing --> rMultiple
    sizing --> tradeLog
```

### State Persistence

```mermaid
flowchart TB
    subgraph LocalStorage["localStorage Keys"]
        WS[workflow-v2-storage]
        PS["workflow-v2-pivots-{symbol}-{timeframe}"]
        SS["swing-settings-{symbol}"]
        VC[fib-visibility-config]
    end

    subgraph PersistentData["Persisted Data"]
        PIVOTS[User-modified pivots]
        SWING[Swing lookback settings]
        VIS[Visibility configuration]
        TFS[Timeframe strategy settings]
    end

    subgraph SessionData["Session-only Data"]
        OPP[Selected opportunity]
        PHASE[Current phase]
        SIZING[Position sizing]
        TRADE[Active trade state]
    end

    WS --> VIS
    WS --> TFS
    PS --> PIVOTS
    SS --> SWING

    PIVOTS -.->|survives refresh| PIVOTS
    SWING -.->|survives refresh| SWING
    VIS -.->|survives refresh| VIS

    OPP -.->|lost on refresh| OPP
    PHASE -.->|lost on refresh| PHASE
```

---

## Business Logic

### Validation Rules

```mermaid
flowchart TD
    START[Opportunity Selected] --> C1

    subgraph Checks["7 Validation Checks"]
        C1{1. Trend Alignment}
        C2{2. Entry Zone}
        C3{3. Target Zones}
        C4{4. RSI Confirmation}
        C5{5. MACD Confirmation}
        C6{6. Volume Confirmation}
        C7{7. Confluence Score}
    end

    C1 -->|should_trade && direction matches && confidence >= 60%| P1[PASS]
    C1 -->|otherwise| F1[FAIL]

    C2 -->|entry_zones.length > 0| P2[PASS]
    C2 -->|no levels| F2[FAIL]

    C3 -->|target_zones.length > 0| P3[PASS]
    C3 -->|no levels| F3[FAIL]

    C4 -->|pullback: counter-trend OK| P4[PASS]
    C4 -->|non-pullback: must align| P4
    C4 -->|conflicts| F4[FAIL]

    C5 -->|higher TF MACD aligns with direction| P5[PASS]
    C5 -->|momentum weak| F5[FAIL]

    C6 -->|RVOL >= 1.0| P6[PASS]
    C6 -->|below average volume| F6[FAIL]

    C7 -->|with-trend: score >= 3| P7[PASS]
    C7 -->|counter-trend: score >= 5| P7
    C7 -->|insufficient confluence| F7[FAIL]

    P1 & P2 & P3 & P4 & P5 & P6 & P7 --> CALC[Calculate Pass %]
    F1 & F2 & F3 & F4 & F5 & F6 & F7 --> CALC

    CALC --> CHECK{passedCount / 7 >= 60%?}
    CHECK -->|Yes: 5+ checks pass| VALID[isValid = true]
    CHECK -->|No: < 5 checks pass| INVALID[isValid = false]
```

### RSI Confirmation Logic (Pullback vs Non-Pullback)

```mermaid
flowchart TD
    START[Check RSI] --> PULLBACK{Is Pullback Setup?}

    PULLBACK -->|Higher TF trending, Lower TF counter-trend| YES
    PULLBACK -->|Both same direction| NO

    subgraph PullbackLogic["Pullback Logic"]
        YES --> DIR{Direction?}
        DIR -->|LONG| LONG_PB[RSI bearish/oversold = GOOD]
        DIR -->|SHORT| SHORT_PB[RSI bullish/overbought = GOOD]
        LONG_PB --> PASS1[PASS - pullback entry]
        SHORT_PB --> PASS2[PASS - rally entry]
    end

    subgraph StandardLogic["Standard Logic"]
        NO --> DIR2{Direction?}
        DIR2 -->|LONG| LONG_STD{RSI bullish or neutral?}
        DIR2 -->|SHORT| SHORT_STD{RSI bearish or neutral?}
        LONG_STD -->|Yes| PASS3[PASS]
        LONG_STD -->|No| FAIL1[FAIL]
        SHORT_STD -->|Yes| PASS4[PASS]
        SHORT_STD -->|No| FAIL2[FAIL]
    end
```

### Position Sizing Calculation

```mermaid
flowchart LR
    subgraph Inputs["Inputs"]
        AB[Account Balance]
        RP[Risk Percentage]
        EP[Entry Price]
        SL[Stop Loss]
        TG[Targets]
    end

    subgraph Calculations["Calculations"]
        RA[Risk Amount = AB * RP/100]
        SD["Stop Distance = |EP - SL|"]
        PS[Position Size = RA / SD]
        RR[R:R Ratio = Target Distance / Stop Distance]
    end

    subgraph Recommendation["Recommendation"]
        RR --> REC{R:R Ratio}
        REC -->|>= 3.0| EX[Excellent]
        REC -->|>= 2.0| GOOD[Good]
        REC -->|>= 1.5| MARG[Marginal]
        REC -->|< 1.5| POOR[Poor]
    end

    AB --> RA
    RP --> RA
    EP --> SD
    SL --> SD
    RA --> PS
    SD --> PS
    SD --> RR
    TG --> RR
```

### Trade Management State Machine

```mermaid
stateDiagram-v2
    [*] --> pending: Trade created

    pending --> active: activateTrade()

    active --> at_breakeven: moveToBreakeven()
    active --> trailing: enableTrailingStop()
    active --> closed: Stop hit / closeTrade()

    at_breakeven --> trailing: enableTrailingStop()
    at_breakeven --> closed: Stop hit / closeTrade()

    trailing --> closed: Trail hit / closeTrade()

    closed --> [*]

    note right of at_breakeven
        Stop moved to entry price
        "FREE TRADE" - risk eliminated
    end note

    note right of trailing
        Stop follows price
        Trail = price - (0.5 * riskPerUnit)
    end note
```

### Fibonacci Strategy Selection

```mermaid
flowchart TD
    START[Analyze Timeframe] --> Q1{Price past 100% of swing?}

    Q1 -->|No| RET[Use RETRACEMENT for entries]
    Q1 -->|Yes| EXT[Use EXTENSION for targets]

    RET --> Q2{ABC pattern confirmed?}
    EXT --> Q2

    Q2 -->|Yes| PROJ[Also calculate PROJECTION]
    Q2 -->|No| SKIP1[Skip projection]

    PROJ --> Q3{Strong impulse move?}
    SKIP1 --> Q3

    Q3 -->|Yes| EXP[Also calculate EXPANSION]
    Q3 -->|No| SKIP2[Skip expansion]

    EXP --> OUTPUT[Combined Fib Levels]
    SKIP2 --> OUTPUT
```

### Direction-Based Level Calculation

| Trend | Direction | Retracement | Extension | Expansion | Projection |
|-------|-----------|-------------|-----------|-----------|------------|
| Bullish | LONG | Calculate | Calculate | Calculate | Calculate |
| Bullish | SHORT | Skip | Skip | Skip | Skip |
| Bearish | SHORT | Calculate | Calculate | Calculate | Calculate |
| Bearish | LONG | Skip | Skip | Skip | Skip |
| Ranging | Both | Warning | Warning | Skip | Skip |

---

## State Management

### Component State Overview

```mermaid
graph TD
    subgraph PageState["page.tsx State"]
        symbol[symbol: MarketSymbol]
        timeframe[timeframe: Timeframe]
        phase[phase: WorkflowPhase]
        selectedOpp["selectedOpportunity: TradeOpportunity | null"]
    end

    subgraph LayoutState["WorkflowV2Layout State"]
        showFib[showFib: boolean]
        showHHLL[showHHLL: boolean]
        showIndicators[showIndicators: boolean]
        showPivots[showPivots: boolean]
        showLevelsTable[showLevelsTable: boolean]
        showSwingSettings[showSwingSettings: boolean]
        showZones[showZones: boolean]
        showLabels[showLabels: boolean]
        tradeViewEnabled[tradeViewEnabled: boolean]
        chartType["chartType: 'candle' | 'bar' | 'heikinashi'"]
        hiddenZones[hiddenZones: Set<string>]
    end

    subgraph HookState["Hook State"]
        discovery["discovery: opportunities[], trends[]"]
        validation["validation: checks[], levels[]"]
        execution[execution: sizing, capturedValidation]
        management[management: status, pnl, log]
    end

    PageState --> HookState
    PageState --> LayoutState
```

### State Update Flow

```mermaid
sequenceDiagram
    participant User
    participant Component
    participant Hook
    participant State
    participant Effect
    participant API

    User->>Component: Interaction (e.g., change entry)
    Component->>Hook: updateSizing({ entryPrice: X })
    Hook->>State: setTradeOverrides({ entryPrice: X })
    State->>Effect: Trigger useMemo recalculation
    Effect->>Hook: Recalculate sizing
    Hook->>Component: Return new sizing
    Component->>User: Re-render with new values
```

---

## Type Definitions

### Core Types

```typescript
// Workflow Phase
type WorkflowPhase = "discover" | "validate" | "size" | "execute" | "manage";

// Trade Opportunity (from discovery)
type TradeOpportunity = {
  id: string;
  symbol: MarketSymbol;
  higherTimeframe: Timeframe;
  lowerTimeframe: Timeframe;
  direction: "long" | "short";
  confidence: number;           // 0-100
  tradingStyle: "position" | "swing" | "intraday";
  description: string;
  reasoning: string;
  isActive: boolean;
  entryZone: "support" | "resistance" | "range";
  signal: SignalSuggestion;
  higherTrend?: TimeframeTrend;
  lowerTrend?: TimeframeTrend;
};

// Validation Result
type ValidationResult = {
  checks: ValidationCheck[];     // 7 checks: Trend, Entry, Target, RSI, MACD, Volume, Confluence
  passedCount: number;
  totalCount: number;            // Always 7 in current implementation
  isValid: boolean;              // passedCount/totalCount >= 60% (5+ of 7 must pass)
  passPercentage: number;
  entryLevels: StrategyLevel[];  // Lower TF retracement
  targetLevels: StrategyLevel[]; // Higher TF extension
  suggestedEntry: number | null;
  suggestedStop: number | null;
  suggestedTargets: number[];
};

// Sizing Data
type SizingData = {
  accountBalance: number;
  riskPercentage: number;        // 1-5% typically
  entryPrice: number;
  stopLoss: number;
  targets: number[];
  positionSize: number;          // Calculated
  riskAmount: number;            // Calculated
  riskRewardRatio: number;       // Calculated
  stopDistance: number;          // Calculated
  recommendation: "excellent" | "good" | "marginal" | "poor";
  isValid: boolean;
};

// Trade Status (management phase)
type TradeStatus = "pending" | "active" | "at_breakeven" | "trailing" | "closed";

// Trade Log Entry
type TradeLogEntry = {
  action: "entry" | "exit" | "stop_moved" | "target_hit" | "note";
  price: number;
  note: string;
  timestamp: string;
};
```

### Storage Types

```typescript
// Complete localStorage schema
type WorkflowV2Storage = {
  version: number;
  pivots: PivotStorage;
  visibility: VisibilitySettings;
  alerts: AlertSettings;
  validation: ValidationSettings;
  watchlist: MarketSymbol[];
  autoRefresh: AutoRefreshSettings;
  theme: "dark" | "light";
};

// Auto-refresh intervals (seconds)
const AUTO_REFRESH_INTERVALS: Record<Timeframe, number> = {
  "1M": 14400,  // 4 hours
  "1W": 14400,  // 4 hours
  "1D": 300,    // 5 minutes
  "4H": 60,     // 1 minute
  "1H": 60,     // 1 minute
  "15m": 10,    // 10 seconds
  "1m": 10,     // 10 seconds
};
```

---

## API Integration

### Endpoints Used

| Endpoint | Method | Purpose | Phase |
|----------|--------|---------|-------|
| `/workflow/assess` | GET | Trend assessment | Discovery |
| `/workflow/align` | GET | Multi-TF alignment | Discovery |
| `/workflow/levels` | GET | Fibonacci levels | Validation |
| `/workflow/confirm` | GET | Indicator confirmation | Validation |
| `/workflow/validate` | GET | 7-check validation (Trend, Entry, Target, RSI, MACD, Volume, Confluence) | Validation |
| `/position/size` | POST | Position sizing | Sizing |
| `/position/risk-reward` | POST | R:R calculation | Sizing |
| `/journal/entries` | POST | Create journal entry | Execution |

### Journal Auto-Logging

When a trade is executed, the system automatically creates a journal entry:

```typescript
const entry: JournalEntryRequest = {
  symbol: opportunity.symbol,
  direction: opportunity.direction,
  entry_price: sizing.entryPrice,
  exit_price: 0,                    // Set when closed
  stop_loss: sizing.stopLoss,
  targets: sizing.targets,
  position_size: sizing.positionSize,
  entry_time: new Date().toISOString(),
  exit_time: "",                    // Set when closed
  timeframe: opportunity.lowerTimeframe,
  notes: `${opportunity.description}\n\nReasoning: ${opportunity.reasoning}`,
};
```

---

## Feature Toggles

### Chart Control Buttons

| Button | State | Description |
|--------|-------|-------------|
| **HH/LL** | `showHHLL` | Show swing markers (HH, HL, LH, LL) |
| **Fib** | `showFib` | Show Fibonacci levels on chart |
| **Ind** | `showIndicators` | Show RSI and MACD panels |
| **Pivot** | `showPivots` | Show editable pivot points editor |
| **Trade** | `tradeViewEnabled` | Filter to trade-relevant levels only |
| **Zones** | `showZones` | Show confluence zone indicators |
| **Lbl** | `showLabels` | Show Fib level labels on chart |
| **Lvl** | `showLevelsTable` | Show Fib levels table with calculations |
| **Swing** | `showSwingSettings` | Show per-TF swing lookback settings |
| **Trend** | `showTrendPanel` | Show trend alignment panel |

### Timeframe Visibility Toggles

Each timeframe (1M, 1W, 1D, 4H, 1H, 15m, 1m) can be individually toggled to show/hide its Fibonacci levels on the chart.

---

## Confluence Zone Algorithm

```typescript
function calculateConfluenceZones(
  levels: StrategyLevel[],
  tolerancePercent: number = 0.5  // 0.02% to 0.5%
): ConfluenceZone[] {
  // 1. Sort levels by price
  const sorted = [...levels].sort((a, b) => a.price - b.price);

  // 2. Group adjacent levels within tolerance
  // tolerance = price * (tolerancePercent / 100)

  // 3. Create zone for groups with 2+ levels
  // - lowPrice: min price in group
  // - highPrice: max price in group
  // - centerPrice: average
  // - direction: majority vote (long/short/neutral)
  // - strength: levelCount * 20 (capped at 100)

  return zones;
}
```

---

## Testing Coverage

### Unit Tests

| File | Tests | Coverage |
|------|-------|----------|
| `LevelTooltip.test.ts` | 17 | Confluence zones |
| `SizingPanel.test.tsx` | 28 | Position sizing UI |

### Test Categories

1. **Confluence Zone Tests**
   - Basic functionality (empty, single, cluster)
   - Tight tolerance (0.02%)
   - Medium tolerance (0.2%)
   - Maximum tolerance (0.5%)
   - Zone properties (bounds, direction, strength)
   - Real-world scenarios (DJI, crypto)

2. **Sizing Panel Tests**
   - Header/navigation
   - Opportunity summary display
   - Account settings inputs
   - Trade parameter inputs
   - Calculated values display
   - Recommendation badges
   - Proceed button states
   - Input validation
   - Accessibility

---

## Development Guidelines

1. **File Size Limits**
   - Page: <100 lines
   - Component: <100 lines (extract to smaller components)
   - Hook: <150 lines (extract helper hooks)

2. **State Management**
   - Use hooks for business logic
   - Components are display-only
   - localStorage for persistence
   - Session state for workflow progress

3. **TDD Workflow**
   - Write failing test first
   - Implement minimal code to pass
   - Refactor with quality checks
   - Commit deployable checkpoint
