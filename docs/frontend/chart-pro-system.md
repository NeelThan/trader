# Chart Pro System - Comprehensive Documentation

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Data Flow Diagrams](#3-data-flow-diagrams)
4. [State Management](#4-state-management)
5. [Hook Dependencies](#5-hook-dependencies)
6. [Business Rules & Logic](#6-business-rules--logic)
7. [API Integration](#7-api-integration)
8. [Component Hierarchy](#8-component-hierarchy)
9. [Persistence Layer](#9-persistence-layer)
10. [Known Issues & Edge Cases](#10-known-issues--edge-cases)

---

## 1. System Overview

### Purpose
Chart Pro is a visual-first trading workflow page that provides:
- Multi-timeframe Fibonacci level analysis
- Swing pattern detection (HH/HL/LH/LL)
- Trend alignment across timeframes
- Trade signal generation based on timeframe pair analysis
- Technical indicators (RSI, MACD)
- Hierarchical visibility controls for granular level filtering

### Phase Status
- **Current Phase**: 4.5
- **Status**: Hierarchical visibility controls and levels table complete
- **Pending**: Confluence Heatmap, Monitor Zones

### Key Design Principles
1. **Thin Client Pattern**: Heavy computation (Fibonacci, pivots, indicators) runs on backend
2. **Hierarchical Control**: Timeframe → Strategy → Direction → Ratio visibility
3. **Per-Timeframe Independence**: Each timeframe has independent settings
4. **Automatic Sync**: Can auto-configure based on trend or pivot analysis

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CHART PRO PAGE                                  │
│                          (page.tsx - Orchestrator)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                         USER CONTROLS                               │     │
│  │  Symbol Selector │ Timeframe Selector │ Chart Type │ Data Mode     │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                    │                                         │
│                                    ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                          DATA LAYER (Hooks)                          │   │
│  │                                                                      │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │  │ Market Data     │  │ Swing Detection │  │ Trend Alignment │     │   │
│  │  │ Subscription    │  │                 │  │                 │     │   │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘     │   │
│  │           │                    │                    │              │   │
│  │  ┌────────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐     │   │
│  │  │ Multi-TF Levels │  │ Editable Pivots │  │ Signal Suggest. │     │   │
│  │  │                 │  │                 │  │                 │     │   │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘     │   │
│  │           │                    │                    │              │   │
│  │  ┌────────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐     │   │
│  │  │ RSI Indicator   │  │ MACD Indicator  │  │ Chart Markers   │     │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      PERSISTENCE LAYER                               │   │
│  │                                                                      │   │
│  │  ┌─────────────────────┐  ┌─────────────────────┐                   │   │
│  │  │ Visibility Config   │  │ Swing Settings      │                   │   │
│  │  │ (localStorage v4)   │  │ (localStorage v1)   │                   │   │
│  │  └─────────────────────┘  └─────────────────────┘                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      PRESENTATION LAYER                              │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │ Candlestick  │  │ Strategy     │  │ Swing Pivot  │               │   │
│  │  │ Chart        │  │ Panel        │  │ Panel        │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │ Trend        │  │ Signal       │  │ Indicators   │               │   │
│  │  │ Alignment    │  │ Suggestions  │  │ (RSI/MACD)   │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  │                                                                      │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │                      Levels Table                             │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND API                                        │
│                                                                              │
│  /api/trader/market-data     │ /api/trader/pivot/detect                     │
│  /api/trader/fibonacci/*     │ /api/trader/indicators/*                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Flow Diagrams

### 3.1 Main Data Pipeline

```
User Selects Symbol/Timeframe
            │
            ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    MARKET DATA SUBSCRIPTION                            │
│                                                                        │
│  1. Check market-data-store for existing subscription                 │
│  2. If exists: reuse data, update countdown                           │
│  3. If new: fetch from /api/trader/market-data                        │
│  4. Start auto-refresh timer based on timeframe config                │
│  5. Handle rate limits (429) and backend unavailability               │
│                                                                        │
│  Output: OHLCData[] (open, high, low, close, time)                    │
└───────────────────────────────────────────────────────────────────────┘
            │
            ├──────────────────────────┬──────────────────────────┐
            ▼                          ▼                          ▼
┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│   SWING DETECTION   │   │  TECHNICAL INDICATORS│   │  MULTI-TF LEVELS    │
│                     │   │                      │   │                     │
│ POST /pivot/detect  │   │ POST /indicators/rsi │   │ For each enabled TF:│
│ - lookback param    │   │ POST /indicators/macd│   │  1. Fetch market data│
│ - returns pivots[]  │   │                      │   │  2. Detect pivots   │
│ - returns markers[] │   │                      │   │  3. Calculate Fibs  │
└─────────┬───────────┘   └──────────┬───────────┘   └─────────┬───────────┘
          │                          │                          │
          ▼                          ▼                          ▼
┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│  EDITABLE PIVOTS    │   │    RSI/MACD PANES   │   │  STRATEGY LEVELS    │
│                     │   │                      │   │                     │
│ - Track modifications│  │ - Display indicators │   │ - Apply visibility  │
│ - ABC label assign  │   │ - Signal detection   │   │ - Calculate heat    │
│ - Original price ref│   │   (overbought/sold)  │   │ - Deduplicate       │
└─────────┬───────────┘   └──────────────────────┘   └─────────┬───────────┘
          │                                                     │
          ▼                                                     ▼
┌─────────────────────┐                             ┌─────────────────────┐
│   CHART MARKERS     │                             │    PRICE LINES      │
│                     │                             │                     │
│ - HH/HL/LH/LL labels│                             │ - Visible levels    │
│ - ABC labels        │                             │ - Color by direction│
│ - Color by type     │                             │ - Width by heat     │
└─────────────────────┘                             └─────────────────────┘
          │                                                     │
          └───────────────────────┬─────────────────────────────┘
                                  ▼
                        ┌─────────────────────┐
                        │  CANDLESTICK CHART  │
                        │                     │
                        │ - Price bars        │
                        │ - Markers           │
                        │ - Price lines       │
                        │ - Line overlays     │
                        └─────────────────────┘
```

### 3.2 Trend Alignment Flow

```
useTrendAlignment(symbol, enabled=true)
            │
            ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    FOR EACH TIMEFRAME (1M → 1m)                        │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ 1. FETCH MARKET DATA                                             │  │
│  │    GET /api/trader/market-data?symbol=X&timeframe=TF             │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                              │                                         │
│                              ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ 2. ANALYZE SWING PATTERNS                                        │  │
│  │    POST /api/trader/pivot/detect { data: OHLC[], lookback: 5 }   │  │
│  │    Returns: { pivots: [], markers: [] }                          │  │
│  │                                                                   │  │
│  │    Swing Signal:                                                  │  │
│  │    - Latest HH/HL → bullish                                      │  │
│  │    - Latest LH/LL → bearish                                      │  │
│  │    - No clear pattern → neutral                                  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                              │                                         │
│                              ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ 3. CALCULATE RSI                                                 │  │
│  │    POST /api/trader/indicators/rsi { period: 14, data }          │  │
│  │                                                                   │  │
│  │    RSI Signal:                                                    │  │
│  │    - RSI > 50 → bullish momentum                                 │  │
│  │    - RSI < 50 → bearish momentum                                 │  │
│  │    - RSI ≈ 50 → neutral                                          │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                              │                                         │
│                              ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ 4. CALCULATE MACD                                                │  │
│  │    POST /api/trader/indicators/macd { fast:12, slow:26, sig:9 }  │  │
│  │                                                                   │  │
│  │    MACD Signal:                                                   │  │
│  │    - Histogram > 0 → bullish                                     │  │
│  │    - Histogram < 0 → bearish                                     │  │
│  │    - Histogram ≈ 0 → neutral                                     │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                              │                                         │
│                              ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ 5. COMBINE SIGNALS                                               │  │
│  │                                                                   │  │
│  │    Weights: Swing=40%, RSI=30%, MACD=30%                         │  │
│  │                                                                   │  │
│  │    Confidence = sum of aligned indicator weights                  │  │
│  │                                                                   │  │
│  │    Final Trend:                                                   │  │
│  │    - 2+ bullish indicators → bullish                             │  │
│  │    - 2+ bearish indicators → bearish                             │  │
│  │    - Otherwise → ranging                                         │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    OVERALL ALIGNMENT CALCULATION                       │
│                                                                        │
│  Count bullish/bearish/ranging timeframes                              │
│                                                                        │
│  Strength Assessment:                                                  │
│  - Strong: 5+ timeframes aligned                                       │
│  - Moderate: 3-4 timeframes aligned                                    │
│  - Weak: 1-2 timeframes aligned                                        │
│                                                                        │
│  Output: { direction, strength, bullishCount, bearishCount, desc }     │
└───────────────────────────────────────────────────────────────────────┘
```

### 3.3 Fibonacci Level Calculation Flow

```
useMultiTFLevels({ symbol, visibilityConfig, enabled, dataMode })
            │
            ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    FOR EACH ENABLED TIMEFRAME                          │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ 1. FETCH MARKET DATA (with in-memory cache)                      │  │
│  │    Key: ${symbol}-${timeframe}                                   │  │
│  │    If cached & fresh: use cached                                 │  │
│  │    Else: fetch from API                                          │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                              │                                         │
│                              ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ 2. DETECT PIVOTS                                                 │  │
│  │    POST /api/trader/pivot/detect                                 │  │
│  │    Returns: { pivots: PivotPoint[], markers: SwingMarker[] }     │  │
│  │                                                                   │  │
│  │    Extract:                                                       │  │
│  │    - pivotHigh = highest "high" pivot                            │  │
│  │    - pivotLow = lowest "low" pivot                               │  │
│  │    - Points A, B, C for projections (last 3 alternating)         │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                              │                                         │
│                              ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ 3. CALCULATE FIBONACCI LEVELS (per enabled strategy+direction)   │  │
│  │                                                                   │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │ RETRACEMENT                                                  │ │  │
│  │  │ POST /api/trader/fibonacci/retracement                       │ │  │
│  │  │ { high, low, direction }                                     │ │  │
│  │  │ Ratios: 0.382, 0.5, 0.618, 0.786                            │ │  │
│  │  │                                                               │ │  │
│  │  │ Formula (Long): Level = High - (Range × Ratio)               │ │  │
│  │  │ Formula (Short): Level = Low + (Range × Ratio)               │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  │                                                                   │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │ EXTENSION                                                    │ │  │
│  │  │ POST /api/trader/fibonacci/extension                         │ │  │
│  │  │ { high, low, direction }                                     │ │  │
│  │  │ Ratios: 1.272, 1.618, 2.618                                 │ │  │
│  │  │                                                               │ │  │
│  │  │ Formula (Long): Level = Low - (Range × (Ratio - 1))         │ │  │
│  │  │ Formula (Short): Level = High + (Range × (Ratio - 1))       │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  │                                                                   │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │ PROJECTION (requires ABC points)                             │ │  │
│  │  │ POST /api/trader/fibonacci/projection                        │ │  │
│  │  │ { pointA, pointB, pointC }                                   │ │  │
│  │  │ Ratios: 0.618, 0.786, 1.0, 1.272, 1.618                     │ │  │
│  │  │                                                               │ │  │
│  │  │ Formula: Level = C ± (AB_Swing × Ratio)                      │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  │                                                                   │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │ EXPANSION                                                    │ │  │
│  │  │ POST /api/trader/fibonacci/expansion                         │ │  │
│  │  │ { pointA, pointB }                                           │ │  │
│  │  │ Ratios: 0.382, 0.5, 0.618, 1.0, 1.618                       │ │  │
│  │  │                                                               │ │  │
│  │  │ Formula: Level = B ± (AB_Range × Ratio)                      │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    POST-PROCESSING                                     │
│                                                                        │
│  1. GENERATE LEVEL IDS                                                 │
│     Format: ${timeframe}-${strategy}-${direction}-${ratio}-${price}   │
│                                                                        │
│  2. CALCULATE HEAT SCORES (confluence)                                 │
│     For each level:                                                    │
│     - Count nearby levels within tolerance (0.5%)                      │
│     - Base heat: min(nearbyCount × 20, 100)                           │
│     - Bonus: +10 per unique timeframe (max 30)                        │
│     - Bonus: +10 per unique strategy (max 30)                         │
│     - Final: min(base + bonuses, 100)                                 │
│                                                                        │
│  3. FILTER BY VISIBILITY CONFIG                                        │
│     Check: timeframe enabled? strategy enabled? direction enabled?     │
│            ratio visible?                                              │
│                                                                        │
│  4. DEDUPLICATE                                                        │
│     Remove levels within tolerance that share same attributes          │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

### 3.4 Signal Generation Flow

```
useSignalSuggestions({ trends, overall, filters })
            │
            ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    TIMEFRAME PAIR ANALYSIS                             │
│                                                                        │
│  Pairs analyzed (higher TF → lower TF):                                │
│  - 1M → 1W (Position)                                                  │
│  - 1W → 1D (Swing)                                                     │
│  - 1D → 4H (Swing)                                                     │
│  - 4H → 1H (Intraday)                                                  │
│  - 1H → 15m (Intraday)                                                 │
│  - 15m → 1m (Scalp)                                                    │
│                                                                        │
│  For each pair:                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ Get higherTF trend and lowerTF trend                             │  │
│  │                                                                   │  │
│  │ Signal Logic:                                                     │  │
│  │                                                                   │  │
│  │ ┌─────────────┬──────────────┬────────────┬───────────────────┐ │  │
│  │ │ Higher TF   │ Lower TF     │ Signal     │ Reasoning         │ │  │
│  │ ├─────────────┼──────────────┼────────────┼───────────────────┤ │  │
│  │ │ Bullish     │ Bearish      │ LONG       │ Buy the dip       │ │  │
│  │ │ Bearish     │ Bullish      │ SHORT      │ Sell the rally    │ │  │
│  │ │ Bullish     │ Bullish      │ WAIT       │ Wait for pullback │ │  │
│  │ │ Bearish     │ Bearish      │ WAIT       │ Wait for rally    │ │  │
│  │ │ Any         │ Ranging      │ WAIT       │ No clear setup    │ │  │
│  │ │ Ranging     │ Any          │ WAIT       │ No clear trend    │ │  │
│  │ └─────────────┴──────────────┴────────────┴───────────────────┘ │  │
│  │                                                                   │  │
│  │ Confidence = average(higherTF.confidence, lowerTF.confidence)    │  │
│  │ isActive = higher TF not ranging AND lower TF not ranging        │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    SIGNAL FILTERING                                    │
│                                                                        │
│  Apply user filters:                                                   │
│  - showLong: include/exclude LONG signals                              │
│  - showShort: include/exclude SHORT signals                            │
│  - showWait: include/exclude WAIT signals                              │
│                                                                        │
│  Return: { signals, activeSignals, longCount, shortCount, waitCount } │
└───────────────────────────────────────────────────────────────────────┘
```

### 3.5 Sync Visibility Flow

```
                    User clicks "Sync" button
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│    TREND-BASED SYNC      │   │    PIVOT-BASED SYNC      │
│    (handleSyncWithTrend) │   │    (handlePivotSync)     │
└────────────┬─────────────┘   └────────────┬─────────────┘
             │                              │
             ▼                              ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│ For each timeframe:      │   │ For each timeframe:      │
│                          │   │                          │
│ If trend = bullish:      │   │ Analyze pivot structure: │
│   Enable TF              │   │                          │
│   Enable LONG direction  │   │ If latest swing = HL/LL: │
│   Disable SHORT          │   │   Swing ended LOW        │
│                          │   │   RETRACEMENT → LONG     │
│ If trend = bearish:      │   │   EXTENSION → LONG       │
│   Enable TF              │   │                          │
│   Enable SHORT direction │   │ If latest swing = HH/LH: │
│   Disable LONG           │   │   Swing ended HIGH       │
│                          │   │   RETRACEMENT → SHORT    │
│ If trend = ranging:      │   │   EXTENSION → SHORT      │
│   Disable TF entirely    │   │                          │
│                          │   │ Price position filter:   │
│ Min confidence: 50%      │   │   < 100% → RETRACEMENT   │
│                          │   │   > 100% → EXTENSION     │
└────────────┬─────────────┘   └────────────┬─────────────┘
             │                              │
             └───────────────┬──────────────┘
                             ▼
                ┌──────────────────────────┐
                │  Update visibilityConfig │
                │  Persist to localStorage │
                │  Trigger level re-filter │
                └──────────────────────────┘
```

---

## 4. State Management

### 4.1 Local Component State (useState)

| State | Type | Default | Purpose |
|-------|------|---------|---------|
| `symbol` | MarketSymbol | "DJI" | Selected market instrument |
| `timeframe` | Timeframe | "1D" | Current chart timeframe |
| `chartType` | ChartType | "bar" | Chart visualization style |
| `hasMounted` | boolean | false | Hydration guard for SSR |
| `showStrategyPanel` | boolean | true | Sidebar visibility |
| `showTrendAlignment` | boolean | true | Panel collapse state |
| `showSignalSuggestions` | boolean | true | Panel collapse state |
| `showIndicatorsPanel` | boolean | true | Panel collapse state |
| `showLevelsTable` | boolean | true | Panel collapse state |
| `signalFilters` | SignalFilters | {showLong:true...} | Signal type filtering |

### 4.2 Derived State (useMemo)

| Derived State | Dependencies | Purpose |
|---------------|--------------|---------|
| `currentSwingSettings` | `getTimeframeSettings, timeframe` | Per-TF swing config |
| `trendDataForSync` | `trendData` | Formatted trend data |
| `syncSummary` | `trendDataForSync` | Sync button label |
| `pivotAnalysis` | `trendData` | Per-TF pivot analysis |
| `pivotSyncSummary` | `pivotAnalysis` | Smart sync button label |
| `apiPivots` | `swingResult?.pivots` | Stable pivot reference |
| `swingLineOverlays` | `editablePivots, swingEnabled...` | Chart line data |
| `visibleLevels` | `allLevels, visibilityConfig` | Filtered display levels |
| `strategyPriceLines` | `visibleLevels` | Chart price line data |
| `currentOHLC` | `marketData` | Latest bar values |
| `currentMACD` | `macdData` | Latest MACD values |
| `macdSignal` | `currentMACD, chartColors` | MACD direction signal |

### 4.3 Persisted State (localStorage)

| Key | Version | Hook | Content |
|-----|---------|------|---------|
| `chart-pro-visibility-config-v4` | 4 | usePersistedVisibilityConfig | Timeframe/strategy/direction/ratio visibility |
| `chart-pro-swing-settings-v1` | 1 | usePersistedSwingSettings | Per-TF lookback, enabled, showLines |
| `chart-data-mode` | - | useDataMode | "live" or "cached" |

---

## 5. Hook Dependencies

### 5.1 Dependency Graph

```
                              page.tsx
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ useSettings   │      │ useDataMode      │      │usePersistedVisib.│
│ (standalone)  │      │ (standalone)     │      │Config            │
└───────────────┘      └──────────────────┘      └──────────────────┘
                                                          │
        ┌─────────────────────────┬───────────────────────┤
        │                         │                       │
        ▼                         ▼                       ▼
┌───────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│useMarketDataSubsc.│  │usePersistedSwing │  │useTrendAlignment     │
│                   │  │Settings          │  │  └→ fetchMarketData  │
│ ← symbol          │  │ (standalone)     │  │  └→ detectPivots     │
│ ← timeframe       │  │                  │  │  └→ calculateRSI     │
│                   │  │                  │  │  └→ calculateMACD    │
└─────────┬─────────┘  └────────┬─────────┘  └──────────┬───────────┘
          │                     │                       │
          │                     │                       ▼
          │                     │            ┌──────────────────────┐
          │                     │            │useSignalSuggestions  │
          │                     │            │  ← trends            │
          │                     │            │  ← overall           │
          │                     │            │  ← filters           │
          │                     │            └──────────────────────┘
          │                     │
          ▼                     ▼
┌──────────────────┐  ┌──────────────────┐
│useSwingMarkers   │  │useMultiTFLevels  │
│  ← data          │  │  ← symbol        │
│  ← lookback      │  │  ← visConfig     │
│  ← symbol        │  │  ← dataMode      │
│  ← timeframe     │  │                  │
└────────┬─────────┘  └────────┬─────────┘
         │                     │
         ▼                     │
┌──────────────────┐           │
│useEditablePivots │           │
│  ← apiPivots     │           │
│  ← timeframe     │           │
└────────┬─────────┘           │
         │                     │
         ▼                     │
┌──────────────────┐           │
│useChartMarkers   │           │
│  ← swingEnabled  │           │
│  ← markers       │           │
│  ← marketData    │           │
│  ← editablePivots│           │
└──────────────────┘           │
                               │
┌──────────────────┐           │
│useMACD           │           │
│  ← data          │           │
│  ← enabled       │           │
└──────────────────┘           │
                               │
┌──────────────────┐           │
│useRSI            │           │
│  ← data          │           │
│  ← enabled       │           │
└──────────────────┘           │
```

### 5.2 Hook Initialization Order

```
1. useSettings()                    // Standalone - chart colors
2. useDataMode()                    // Standalone - live vs cached
3. usePersistedVisibilityConfig()   // Standalone - level visibility
4. usePersistedSwingSettings()      // Standalone - swing config
5. useTrendAlignment()              // Needs: symbol
6. useSignalSuggestions()           // Needs: trends, overall
7. useMarketDataSubscription()      // Needs: symbol, timeframe
8. useMACD()                        // Needs: marketData
9. useRSI()                         // Needs: marketData
10. useSwingMarkers()               // Needs: marketData, lookback, symbol, TF
11. useEditablePivots()             // Needs: apiPivots, timeframe
12. useChartMarkers()               // Needs: markers, marketData, editablePivots
13. useMultiTFLevels()              // Needs: symbol, visibilityConfig, dataMode
```

---

## 6. Business Rules & Logic

### 6.1 Fibonacci Level Direction Logic

See: `docs/references/fibonacci_conditions.md`

| Strategy | BUY/Long Condition | SELL/Short Condition |
|----------|-------------------|---------------------|
| Retracement | Swing ended LOW (HL/LL) | Swing ended HIGH (HH/LH) |
| Extension | Swing DOWN (targets below) | Swing UP (targets above) |
| Projection | A=Low, B=High, C=HL | A=High, B=Low, C=LH |
| Expansion | A > B (high to low) | A < B (low to high) |

### 6.2 Trend Determination

```
Indicator Weights:
- Swing Pattern: 40%
- RSI (vs 50): 30%
- MACD Histogram: 30%

Final Trend = majority direction of indicators
Confidence = sum of aligned indicator weights
```

### 6.3 Signal Generation Rules

| Higher TF | Lower TF | Signal | Action |
|-----------|----------|--------|--------|
| Bullish | Bearish | LONG | Buy pullback to retracement |
| Bearish | Bullish | SHORT | Sell rally to retracement |
| Same | Same | WAIT | Wait for counter-trend |
| Any | Ranging | WAIT | No clear setup |

### 6.4 Heat Score Calculation

```javascript
function calculateHeat(level, allLevels, tolerance = 0.5%) {
  nearbyLevels = levels within tolerance of level.price

  baseHeat = min(nearbyLevels.count × 20, 100)
  tfBonus = min(uniqueTimeframes × 10, 30)
  stratBonus = min(uniqueStrategies × 10, 30)

  return min(baseHeat + tfBonus + stratBonus, 100)
}
```

### 6.5 Visibility Filter Chain

```
Level Visibility Check:
1. Is timeframe enabled? → No → Hidden
2. Is strategy enabled for timeframe? → No → Hidden
3. Is direction (long/short) enabled? → No → Hidden
4. Is specific ratio visible? → No → Hidden
5. All checks passed → Visible
```

### 6.6 ABC Label Assignment

```javascript
// Assign labels to most recent 3 alternating pivots
const alternating = pivots.filter(isAlternating).slice(-3)
labels = ["A", "B", "C"]

// Most recent gets C, second gets B, third gets A
alternating.forEach((pivot, i) => {
  pivot.abcLabel = labels[alternating.length - 1 - i]
})
```

### 6.7 Auto-Refresh Intervals

| Timeframe | Refresh Interval |
|-----------|-----------------|
| 1M | 1 day |
| 1W | 4 hours |
| 1D | 1 hour |
| 4H | 15 minutes |
| 1H | 5 minutes |
| 15m | 1 minute |
| 1m | 30 seconds |

---

## 7. API Integration

### 7.1 Endpoint Summary

| Endpoint | Method | Purpose | Request Body |
|----------|--------|---------|--------------|
| `/api/trader/market-data` | GET | Fetch OHLC bars | Query: symbol, timeframe, limit |
| `/api/trader/pivot/detect` | POST | Detect swing pivots | { data: OHLC[], lookback: number } |
| `/api/trader/fibonacci/retracement` | POST | Calculate retracements | { high, low, direction } |
| `/api/trader/fibonacci/extension` | POST | Calculate extensions | { high, low, direction } |
| `/api/trader/fibonacci/projection` | POST | Calculate projections | { pointA, pointB, pointC } |
| `/api/trader/fibonacci/expansion` | POST | Calculate expansions | { pointA, pointB } |
| `/api/trader/indicators/rsi` | POST | Calculate RSI | { data: OHLC[], period } |
| `/api/trader/indicators/macd` | POST | Calculate MACD | { data: OHLC[], fast, slow, signal } |

### 7.2 Error Handling

```
API Error Responses:
- 429: Rate limited → Show warning, use cached data
- 5xx: Backend unavailable → Show offline banner
- 4xx: Invalid request → Log to console, show error state

Hook-level handling:
- Each hook tracks its own isLoading and error state
- Errors displayed in UI via Badge or inline message
- Backend unavailable triggers global warning banner
```

### 7.3 Caching Strategy

```
In-Memory Cache (useMultiTFLevels):
- Key: ${symbol}-${timeframe}
- Cleared on symbol change
- Used to avoid refetching same TF data

Pivot Cache (useSwingMarkers):
- localStorage with 10-minute TTL
- Per symbol+timeframe
- forceRefresh() bypasses cache

Market Data Store (centralized):
- Shared subscription across components
- Countdown timer for next refresh
- Auto-refresh based on timeframe config
```

---

## 8. Component Hierarchy

```
ChartProPage
├── Header
│   ├── Data Mode Toggle
│   ├── Symbol Select
│   ├── Timeframe Select
│   ├── Chart Type Select
│   └── Strategy Panel Toggle
│
├── Backend Status Banner (conditional)
├── Debug Status Banner (conditional)
│
├── OHLC Summary Bar (Card)
│   └── Symbol, Timeframe, OHLC values
│
├── Main Chart (Card)
│   ├── Chart Controls (zoom, reset)
│   └── CandlestickChart
│       ├── Candles/Bars
│       ├── Chart Markers (HH/HL/LH/LL)
│       ├── Price Lines (Fibonacci levels)
│       └── Line Overlays (swing lines)
│
├── Trend Alignment (Card, collapsible)
│   └── TrendAlignmentPanel
│       ├── Sync Buttons (Trend/Pivot)
│       ├── Overall Alignment Badge
│       └── Per-Timeframe Rows
│
├── Signal Suggestions (Card, collapsible)
│   └── SignalSuggestionsPanel
│       ├── Filter Toggles
│       └── Signal Cards
│
├── Indicators (Card, collapsible)
│   ├── RSIPane
│   └── MACDChart
│
├── Strategy Levels (Card, collapsible)
│   └── LevelsTable
│
├── Implementation Status (Card)
│   └── StatusItems
│
└── Sidebar (when visible)
    ├── SwingPivotPanel
    │   ├── Swing Settings Section
    │   └── Pivot Points Section
    │
    └── StrategyPanel
        └── Timeframe Accordion
            └── Strategy Toggles
                └── Direction Toggles
                    └── Ratio Checkboxes
```

---

## 9. Persistence Layer

### 9.1 Visibility Config Storage

```typescript
// Key: chart-pro-visibility-config-v4
// Version history:
// v1: Initial
// v2: Added direction toggles
// v3: Added ratio visibility
// v4: Added PROJECTION, EXPANSION strategies

type PersistedVisibilityConfig = {
  version: 4,
  data: {
    timeframes: Array<{
      timeframe: Timeframe,
      enabled: boolean,
      strategies: Array<{
        strategy: StrategySource,
        long: { enabled: boolean, ratios: RatioVisibility[] },
        short: { enabled: boolean, ratios: RatioVisibility[] }
      }>
    }>
  }
}
```

### 9.2 Swing Settings Storage

```typescript
// Key: chart-pro-swing-settings-v1

type PersistedSwingSettings = {
  version: 1,
  data: {
    timeframes: Array<{
      timeframe: Timeframe,
      enabled: boolean,
      settings: {
        lookback: number,  // 2-20
        showLines: boolean
      }
    }>
  }
}
```

### 9.3 Data Mode Storage

```typescript
// Key: chart-data-mode
// Value: "live" | "cached"
```

---

## 10. Known Issues & Edge Cases

### 10.1 Documented Issues

| Issue | Severity | Description | Mitigation |
|-------|----------|-------------|------------|
| SSR Hydration | Low | useState defaults may differ server/client | `hasMounted` guard |
| Rate Limiting | Medium | Yahoo Finance has rate limits | Detection + cached data fallback |
| Floating Point | Low | Ratio comparisons may fail | EPSILON tolerance (0.0001) |
| Empty Data | Low | Chart crashes with 0 bars | Min bar checks before render |

### 10.2 Edge Cases to Consider

1. **Symbol Change During Load**
   - Market data cache is cleared on symbol change
   - In-flight requests may return stale data
   - Consider request cancellation

2. **Rapid Timeframe Switching**
   - Debounce (300ms) in useMultiTFLevels helps
   - Multiple pending requests may race
   - Consider AbortController

3. **All Timeframes Disabled**
   - No levels fetched
   - Debug banner shows but may confuse user
   - Consider showing "Enable a timeframe" message

4. **No ABC Points Available**
   - Projection calculation skipped
   - No error shown to user
   - Consider showing "Insufficient pivots" message

5. **Backend Offline During Sync**
   - Trend data may be stale
   - Sync buttons still work with cached data
   - Consider disabling sync when backend offline

6. **localStorage Full**
   - Settings fail to persist silently
   - User loses settings on refresh
   - Consider error handling with user notification

7. **Very High Heat Scores**
   - All levels in same price zone
   - May indicate duplicate detection
   - Consider deduplication improvements

8. **Mixed Direction Sync**
   - Some TFs long, some short
   - Currently shows both
   - User may want "follow highest TF" option

### 10.3 Performance Considerations

1. **Multi-TF Fetching**
   - 6 timeframes × (market data + pivots + 4 Fib strategies) = 30+ API calls
   - Consider batching or priority fetching

2. **useMemo Chains**
   - Deep dependency chains can cause cascade re-renders
   - Profile with React DevTools if sluggish

3. **Chart Re-renders**
   - Price lines regenerate on any visible level change
   - Consider memoizing at chart level

4. **Trend Alignment Polling**
   - Currently fetches all 7 TFs on refresh
   - Could implement staggered refresh by TF

---

## Appendix: File Reference

| Category | File | Lines | Purpose |
|----------|------|-------|---------|
| Page | `app/chart-pro/page.tsx` | ~940 | Main orchestrator |
| Types | `lib/chart-pro/strategy-types.ts` | ~1100 | Core types & functions |
| Util | `lib/chart-pro/swing-overlays.ts` | ~150 | Line overlay generation |
| Hook | `hooks/use-market-data-subscription.ts` | ~300 | Market data fetching |
| Hook | `hooks/use-multi-tf-levels.ts` | ~400 | Multi-TF Fib calculation |
| Hook | `hooks/use-swing-markers.ts` | ~200 | Swing detection |
| Hook | `hooks/use-trend-alignment.ts` | ~350 | Trend analysis |
| Hook | `hooks/use-signal-suggestions.ts` | ~200 | Signal generation |
| Hook | `hooks/use-editable-pivots.ts` | ~150 | Pivot editing |
| Hook | `hooks/use-chart-markers.ts` | ~90 | Chart marker generation |
| Hook | `hooks/use-persisted-visibility-config.ts` | ~250 | Visibility persistence |
| Hook | `hooks/use-persisted-swing-settings.ts` | ~200 | Swing settings persistence |
| Hook | `hooks/use-data-mode.ts` | ~100 | Data mode toggle |
| Hook | `hooks/use-macd.ts` | ~80 | MACD calculation |
| Hook | `hooks/use-rsi.ts` | ~80 | RSI calculation |
| Hook | `hooks/use-settings.ts` | ~150 | Global settings |
| Component | `components/chart-pro/StrategyPanel.tsx` | ~300 | Visibility controls |
| Component | `components/chart-pro/LevelsTable.tsx` | ~250 | Levels display |
| Component | `components/chart-pro/SwingPivotPanel.tsx` | ~400 | Swing settings + pivots |
| Component | `components/chart-pro/TrendAlignmentPanel.tsx` | ~450 | Trend display |
| Component | `components/chart-pro/SignalSuggestionsPanel.tsx` | ~430 | Signal display |
| Component | `components/chart-pro/RSIPane.tsx` | ~80 | RSI visualization |
| Component | `components/chart-pro/MACDChart.tsx` | ~80 | MACD visualization |
