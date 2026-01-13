# Fibonacci Trading Framework: Extended Methodology

**Document Type:** Supporting Framework Documentation  
**Companion To:** Professional Fibonacci Workshop (Sandy Jadeja, SignalPro 2017)  
**Purpose:** Extends the core Fibonacci methodology with bi-directional trading, multi-timeframe analysis, and trend intelligence  
**Version:** 1.0  
**Created:** January 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Core Philosophy: Bi-Directional Trading](#2-core-philosophy-bi-directional-trading)
3. [Trend Structure Intelligence](#3-trend-structure-intelligence)
4. [Multi-Timeframe Analysis Framework](#4-multi-timeframe-analysis-framework)
5. [Fibonacci Level Selection by Trend](#5-fibonacci-level-selection-by-trend)
6. [The Cascade Effect: How Trends Reverse](#6-the-cascade-effect-how-trends-reverse)
7. [Confluence Zones and Probability Stacking](#7-confluence-zones-and-probability-stacking)
8. [Risk Reduction Through Timeframe Selection](#8-risk-reduction-through-timeframe-selection)
9. [Signal Bars as the Gatekeeper](#9-signal-bars-as-the-gatekeeper)
10. [Binary Outcomes at Fibonacci Levels](#10-binary-outcomes-at-fibonacci-levels)
11. [Trading Style Spectrum](#11-trading-style-spectrum)
12. [Complete Decision Framework](#12-complete-decision-framework)
13. [Position Sizing by Trade Type](#13-position-sizing-by-trade-type)
14. [Implementation Requirements](#14-implementation-requirements)
15. [Appendix: Quick Reference Tables](#15-appendix-quick-reference-tables)

---

## 1. Executive Summary

### What This Document Adds

The original Fibonacci Strategy Knowledge document provides the mathematical foundation:
- Four Fibonacci tools (Retracements, Extensions, Projections, Expansions)
- Harmonic patterns (Gartley 222, Butterfly)
- Signal bar confirmation
- Position sizing formulas

**This document extends that foundation with:**
- Bi-directional trading philosophy (trade both legs of market swings)
- Trend structure intelligence (which Fibonacci levels to use based on trend direction)
- Multi-timeframe analysis framework (nested trends, confluence zones)
- Risk optimisation through timeframe selection
- Complete decision trees for trade execution
- Trading style adaptability (sniper to position trading)

### Core Principle

> Fibonacci levels are **decision points**, not predictions. At every significant level, price will either **hold** (trade opportunity) or **break** (move to next level). We prepare for both outcomes in both directions.

### The Complete Framework

```
┌─────────────────────────────────────────────────────────────┐
│           COMPLETE FIBONACCI TRADING FRAMEWORK              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. TREND STRUCTURE ANALYSIS                                │
│     └── Identify trend direction (HH/HL or LH/LL)           │
│     └── Determine which Fib levels are relevant             │
│     └── Know what move we're looking for next               │
│                                                             │
│  2. HIGHER TF LEVEL IDENTIFICATION                          │
│     └── Major Fibonacci levels (support & resistance)       │
│     └── Confluence zones (multiple TFs align)               │
│     └── Key pivot points and structure                      │
│                                                             │
│  3. BI-DIRECTIONAL PREPARATION                              │
│     └── LONG setups at support levels                       │
│     └── SHORT setups at resistance levels                   │
│     └── Flag: With-trend vs Counter-trend                   │
│                                                             │
│  4. LOWER TF ENTRY EXECUTION                                │
│     └── Drop down for precision entry                       │
│     └── Wait for signal bar confirmation                    │
│     └── Enter with tight stop (reduced risk)                │
│                                                             │
│  5. BINARY OUTCOME MANAGEMENT                               │
│     └── Level holds → Trade works → Ride to target          │
│     └── Level breaks → Small loss → Next level              │
│                                                             │
│  6. TRADE MANAGEMENT                                        │
│     └── Breakeven at +1R                                    │
│     └── Scale out at Fib targets                            │
│     └── Trail stop for runners                              │
│                                                             │
│  7. CYCLE CONTINUATION                                      │
│     └── Exit current trade                                  │
│     └── Prepare opposite direction setup                    │
│     └── Trade the next swing                                │
│     └── Repeat                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Philosophy: Bi-Directional Trading

### The Fundamental Insight

Markets move in swings: up, down, up, down. A methodology that only trades one direction misses half of all opportunities.

```
Market Movement:  ↗️ ↘️ ↗️ ↘️ ↗️ ↘️ ↗️ ↘️

Trend-Only:       ↗️    ↗️    ↗️    ↗️     (4 trades)
Bi-Directional:   ↗️ ↘️ ↗️ ↘️ ↗️ ↘️ ↗️ ↘️  (8 trades)
```

### Reconciling with Original Methodology

The original SignalPro methodology states:

| Higher TF | Lower TF | Action |
|-----------|----------|--------|
| UP | UP | Stand aside |
| UP | DOWN | Go LONG |
| DOWN | DOWN | Stand aside |
| DOWN | UP | Go SHORT |

**Clarification:** "Stand aside" means no entry signal exists at that moment, NOT that we only trade one direction.

**The Extended Interpretation:**

| Higher TF | Lower TF | With-Trend Action | Counter-Trend Opportunity |
|-----------|----------|-------------------|---------------------------|
| UP | UP | Wait for pullback | SHORT at major resistance (lower probability) |
| UP | DOWN | LONG at Fib support | - |
| DOWN | DOWN | Wait for bounce | LONG at major support (lower probability) |
| DOWN | UP | SHORT at Fib resistance | - |

### Two Categories of Trades

**Category 1: With-Trend Trades (Higher Probability)**
- Trading in the direction of the higher timeframe
- Fibonacci retracements for entries
- Higher win rate
- Standard position sizing

**Category 2: Counter-Trend Trades (Lower Probability, Higher Reward)**
- Trading against the higher timeframe at MAJOR levels
- Fibonacci extensions/confluence zones for entries
- Lower win rate but captures trend reversals
- Reduced position sizing

### Why Both Categories Matter

If we only take with-trend trades:
- ✅ Higher win rate per trade
- ❌ Miss trend reversals completely
- ❌ Always late to new trends
- ❌ Miss significant counter-trend swings

If we include counter-trend trades at major levels:
- ✅ Capture trend reversals early
- ✅ Trade the complete market cycle
- ✅ More opportunities
- ⚠️ Some trades have lower probability (manage with position sizing)

---

## 3. Trend Structure Intelligence

### Identifying Trend Direction

**Uptrend Structure:**
```
        HH₃
       /
      /
    HH₂
   /  \
  /    \
HH₁     HL₂
  \    /
   \  /
    HL₁

Pattern: Higher Highs (HH) + Higher Lows (HL)
Confirmation: Each swing high exceeds previous, each swing low higher than previous
```

**Downtrend Structure:**
```
    LH₁
   /  \
  /    \
LL₁     LH₂
  \    /
   \  /
    LL₂
       \
        \
         LL₃

Pattern: Lower Highs (LH) + Lower Lows (LL)
Confirmation: Each swing high lower than previous, each swing low lower than previous
```

**Ranging/Consolidation:**
```
    ─────────── Resistance
    
    
    ─────────── Support

Pattern: Equal Highs (EH) + Equal Lows (EL)
Note: Fibonacci less reliable in ranging markets - wait for breakout
```

### Trend Direction Decision Tree

```
START: Analyse recent pivot points
         │
         ▼
    Compare last 3+ swing highs
         │
    ┌────┴────┐
    │         │
  Rising    Falling
    │         │
    ▼         ▼
 Compare   Compare
 swing     swing
  lows      lows
    │         │
┌───┴───┐ ┌───┴───┐
│       │ │       │
Rising Flat Fall  Flat
│       │ │       │
▼       ▼ ▼       ▼
UPTREND WEAK DOWN- WEAK
        UP   TREND DOWN
```

### What Move Are We Looking For?

Once trend is identified, we know what Fibonacci move to anticipate:

**In Uptrend (HH + HL):**
```
Current State          │ Next Expected Move      │ Fibonacci Tool
───────────────────────┼─────────────────────────┼────────────────
Just made Higher High  │ Pullback to support     │ RETRACEMENT (BUY levels)
Pulling back           │ Bounce at Fib support   │ RETRACEMENT (BUY levels)
Bounced, trending up   │ New Higher High         │ EXTENSION (SELL targets)
Approaching resistance │ Potential reversal OR   │ EXTENSION (watch for
                       │ breakout to new high    │ signal bar)
```

**In Downtrend (LH + LL):**
```
Current State          │ Next Expected Move      │ Fibonacci Tool
───────────────────────┼─────────────────────────┼────────────────
Just made Lower Low    │ Rally to resistance     │ RETRACEMENT (SELL levels)
Rallying up            │ Rejection at Fib resist │ RETRACEMENT (SELL levels)
Rejected, trending dn  │ New Lower Low           │ EXTENSION (BUY targets)
Approaching support    │ Potential reversal OR   │ EXTENSION (watch for
                       │ breakdown to new low    │ signal bar)
```

### Trend Phase Identification

```
TREND PHASES:

Phase 1: IMPULSE
├── Strong directional move
├── Breaking through levels
├── Fibonacci EXTENSIONS for targets
└── Trade: Continuation

Phase 2: CORRECTION
├── Counter-trend pullback
├── Testing Fibonacci levels
├── Fibonacci RETRACEMENTS for entries
└── Trade: Wait for entry signal

Phase 3: CONTINUATION
├── Trend resumes after correction
├── New impulse wave begins
├── Fibonacci PROJECTIONS for targets
└── Trade: Re-entry with trend

Phase 4: EXHAUSTION
├── Trend losing momentum
├── Multiple timeframe confluence
├── Watch for REVERSAL signals
└── Trade: Prepare counter-trend setup
```

---

## 4. Multi-Timeframe Analysis Framework

### The Timeframe Hierarchy

```
STRATEGIC TIMEFRAMES (Trend Direction)
├── Monthly  → Major trend, macro levels
├── Weekly   → Primary trend, key structure
└── Daily    → Trading trend, entry zones

TACTICAL TIMEFRAMES (Entry Timing)
├── 4-Hour   → Swing entry refinement
├── 1-Hour   → Day trade timing
└── 15-Min   → Precision entry/scalping

EXECUTION TIMEFRAMES (Fine-Tuning)
├── 5-Min    → Exact entry timing
├── 3-Min    → Scalp entries
└── 1-Min    → Micro-management
```

### How Timeframes Interact

Each timeframe contains its own:
- Trend direction
- Pivot points
- Fibonacci levels
- Signal bars

**Lower timeframe trends exist WITHIN higher timeframe trends:**

```
MONTHLY: ════════════════════════════════════════►  UP

WEEKLY:  ════════►  UP  ◄════  DOWN  ════════►  UP

DAILY:   ═►↙═►↙═►   ═►↙═►↙═►↙   ═►↙═►↙═►
         (swings)   (swings)    (swings)

4-HOUR:  Multiple smaller swings within each daily swing
```

### Nested Trends Create Multiple Opportunities

**Example Scenario:**
```
Monthly: UP (Major trend)
Weekly:  UP (Aligned)
Daily:   UP (Aligned) but approaching resistance
──────────────────────────────────────────────
4H:      DOWN (Counter-trend pullback starting)
1H:      DOWN (Within 4H move)
15min:   UP (Micro bounce beginning)
```

**Available Trades:**

| Timeframe | Direction | Type | Duration |
|-----------|-----------|------|----------|
| Daily | LONG | With-trend swing | Days |
| 4H | SHORT | Counter-trend swing | Hours-Day |
| 1H | SHORT | Day trade | Hours |
| 15min | LONG | Scalp | Minutes-Hour |

**Each is valid using the same Fibonacci methodology at different scales.**

### Multi-Timeframe Analysis Process

```
STEP 1: TOP-DOWN ANALYSIS
┌──────────────────────────────────────────────┐
│ MONTHLY                                      │
│ ├── Major trend direction                    │
│ ├── Key support/resistance zones             │
│ └── Long-term Fibonacci levels               │
└──────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────┐
│ WEEKLY                                       │
│ ├── Primary trend direction                  │
│ ├── Current position in trend                │
│ ├── Key Fibonacci levels                     │
│ └── Confluence with Monthly levels?          │
└──────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────┐
│ DAILY                                        │
│ ├── Trading trend direction                  │
│ ├── Recent pivot points                      │
│ ├── Entry-level Fibonacci zones              │
│ └── Confluence with Weekly levels?           │
└──────────────────────────────────────────────┘
                    │
                    ▼
STEP 2: BOTTOM-UP ENTRY
┌──────────────────────────────────────────────┐
│ 4H / 1H / 15MIN                              │
│ ├── Price approaching major level            │
│ ├── Signal bar forming?                      │
│ ├── Entry with tight stop                    │
│ └── Execute trade                            │
└──────────────────────────────────────────────┘
```

---

## 5. Fibonacci Level Selection by Trend

### The Intelligence Layer

**Key Insight:** Not all Fibonacci levels are equally relevant at all times. The trend direction determines which levels we prioritise.

### Uptrend: Which Levels Matter

```
UPTREND (HH + HL)

PRIORITY BUY LEVELS (Retracements from recent high):
├── 38.2% → Shallow pullback (strong trend)
├── 50.0% → Standard pullback
├── 61.8% → Deep pullback (still healthy)
└── 78.6% → Very deep (trend weakening?)

WATCH LEVELS (Potential resistance/targets):
├── Previous swing high → First target
├── 127.2% extension → Standard target
├── 161.8% extension → Extended target
└── 261.8% extension → Maximum extension

REVERSAL WATCH (Counter-trend SHORT opportunity):
├── Major resistance confluence
├── Multiple TF extension levels aligning
├── 161.8% or 261.8% extensions
└── Previous all-time highs
```

**Visual Representation:**
```
                          ┌── 161.8% Ext (SHORT watch)
                          │
                    ┌─────┤  127.2% Ext (Target)
                    │     │
              ATH ──┼─────┤  Previous High (Target 1)
                    │     │
Current Price ──────┼─────┤
                    │     │
                    │     │  38.2% Ret (BUY zone)
                    │     │  50.0% Ret (BUY zone)
                    │     │  61.8% Ret (BUY zone)
                    │     │  78.6% Ret (BUY zone)
                    │     │
              Low ──┴─────┘
```

### Downtrend: Which Levels Matter

```
DOWNTREND (LH + LL)

PRIORITY SELL LEVELS (Retracements from recent low):
├── 38.2% → Shallow rally (strong downtrend)
├── 50.0% → Standard rally
├── 61.8% → Deep rally (still bearish)
└── 78.6% → Very deep (trend weakening?)

WATCH LEVELS (Potential support/targets):
├── Previous swing low → First target
├── 127.2% extension → Standard target
├── 161.8% extension → Extended target
└── 261.8% extension → Maximum extension

REVERSAL WATCH (Counter-trend LONG opportunity):
├── Major support confluence
├── Multiple TF extension levels aligning
├── 161.8% or 261.8% extensions
└── Previous major lows
```

### Ranging Market: Approach with Caution

```
RANGING MARKET (EH + EL)

CAUTION:
├── Fibonacci less reliable
├── Levels get broken and retaken
├── False signals more common

APPROACH:
├── Wait for breakout from range
├── Trade the breakout direction
├── Use range high/low as A and B points
├── Project from breakout point
```

### Fibonacci Tool Selection by Trend Phase

```
┌─────────────────┬────────────────────────────────────────────┐
│ TREND PHASE     │ PRIMARY FIBONACCI TOOL                     │
├─────────────────┼────────────────────────────────────────────┤
│ Impulse (UP)    │ EXTENSION - Where might this leg end?      │
│ Correction (DN) │ RETRACEMENT - Where might pullback hold?   │
│ Continuation    │ PROJECTION - Project previous swing        │
│ Exhaustion      │ EXTENSION + RETRACEMENT - Watch both       │
├─────────────────┼────────────────────────────────────────────┤
│ Impulse (DN)    │ EXTENSION - Where might this leg end?      │
│ Correction (UP) │ RETRACEMENT - Where might rally fail?      │
│ Continuation    │ PROJECTION - Project previous swing        │
│ Exhaustion      │ EXTENSION + RETRACEMENT - Watch both       │
└─────────────────┴────────────────────────────────────────────┘
```

### Intelligent Level Prioritisation

**The application should:**

1. **Detect trend direction** (HH/HL or LH/LL)
2. **Identify trend phase** (Impulse, Correction, Continuation, Exhaustion)
3. **Calculate relevant Fibonacci levels** (based on trend and phase)
4. **Highlight primary levels** (most likely to be tested next)
5. **Flag confluence zones** (multiple levels/timeframes align)

```
EXAMPLE OUTPUT:

Trend: UPTREND (HH + HL confirmed)
Phase: CORRECTION (pulling back from recent high)

PRIMARY LEVELS (BUY opportunities):
├── 38.2% at 49,150 ← Shallow, strong trend
├── 50.0% at 48,900 ← Standard pullback
├── 61.8% at 48,650 ← Deep pullback        [CONFLUENCE: Weekly 38.2%]
└── 78.6% at 48,300 ← Very deep

SECONDARY LEVELS (Targets once long):
├── Previous High at 49,600 ← Target 1
├── 127.2% Ext at 50,100 ← Target 2
└── 161.8% Ext at 50,800 ← Extended target

REVERSAL WATCH (Counter-trend SHORT if reached):
└── 161.8% Ext at 50,800 with Weekly resistance
```

---

## 6. The Cascade Effect: How Trends Reverse

### Understanding Trend Changes

**Critical Insight:** A monthly trend reversal doesn't happen instantly. It **bubbles up** from lower timeframes. This creates tradeable opportunities BEFORE the higher timeframe confirms.

### The Reversal Cascade (Uptrend to Downtrend)

```
STAGE 1: EVERYTHING ALIGNED UP
├── Monthly: UP
├── Weekly: UP
├── Daily: UP
├── 4H: UP
├── 1H: UP
└── Status: "Strong uptrend, trade pullbacks long"

Price hits MAJOR Fibonacci resistance (confluence zone)...

STAGE 2: SMALLEST TIMEFRAMES TURN FIRST
├── Monthly: UP
├── Weekly: UP
├── Daily: UP
├── 4H: UP
├── 1H: DOWN ← First to turn
└── Status: "Minor pullback beginning"

STAGE 3: MOMENTUM BUILDS
├── Monthly: UP
├── Weekly: UP
├── Daily: UP
├── 4H: DOWN ← Now turning
├── 1H: DOWN
└── Status: "Deeper pullback, but still uptrend"

STAGE 4: DAILY JOINS
├── Monthly: UP
├── Weekly: UP
├── Daily: DOWN ← Now turning
├── 4H: DOWN
├── 1H: DOWN
└── Status: "Significant correction"

STAGE 5: WEEKLY JOINS
├── Monthly: UP
├── Weekly: DOWN ← Now turning
├── Daily: DOWN
├── 4H: DOWN
├── 1H: DOWN
└── Status: "Potential trend change"

STAGE 6: MONTHLY FINALLY TURNS
├── Monthly: DOWN ← Finally turns
├── Weekly: DOWN
├── Daily: DOWN
├── 4H: DOWN
├── 1H: DOWN
└── Status: "New downtrend confirmed"
```

### Trading Implications

**At Stage 2:**
- Trend-only traders: "Just a pullback, wait to buy"
- Bi-directional traders: "Short opportunity on 1H, tight stop"

**At Stage 3:**
- Trend-only traders: "Deeper pullback, looking for support"
- Bi-directional traders: "Short working, trail stop, watch daily levels"

**At Stage 4:**
- Trend-only traders: "Getting concerned, maybe reduce longs"
- Bi-directional traders: "Shorts in profit, preparing for potential continuation"

**At Stage 5:**
- Trend-only traders: "Trend might be changing, exit longs"
- Bi-directional traders: "Been short since Stage 2, now adding on confirmations"

**The difference:** Bi-directional traders caught the reversal 3-4 stages earlier.

### Mathematics of Missing Reversals

```
Example: Major trend lasting 24 months

TREND-ONLY APPROACH:
├── Trade UP for 18 months ✅
├── Monthly turns DOWN (miss first 3 months of move)
├── Trade DOWN for 3 months
└── Total captured: 21 months

BI-DIRECTIONAL APPROACH:
├── Trade UP for 18 months ✅
├── SHORT at major resistance (Stage 2)
├── First attempt stopped out (small loss)
├── Re-SHORT at higher resistance (Stage 3)
├── Catch reversal, ride DOWN for 6 months
└── Total captured: 24+ months

DIFFERENCE: Caught the TURN, not just the CONFIRMATION
```

### Identifying Potential Reversal Zones

**Higher probability reversal zones have:**

1. **Multiple Fibonacci levels converging**
   - Daily 127% = Weekly 61.8% = Monthly structure

2. **Historical significance**
   - Previous all-time highs/lows
   - Major psychological levels

3. **Harmonic pattern completion**
   - Gartley D point
   - Butterfly D point

4. **Momentum divergence**
   - Price making new high, momentum not confirming

5. **Multiple timeframe exhaustion**
   - Extensions reached on several timeframes simultaneously

---

## 7. Confluence Zones and Probability Stacking

### What Is Confluence?

Confluence occurs when multiple independent factors align at the same price level, increasing the probability of that level being significant.

### Types of Confluence

**1. Fibonacci Confluence (Same Timeframe)**
```
Multiple Fibonacci levels from different swings landing at same price:
├── Swing 1: 61.8% retracement at 49,200
├── Swing 2: 127% extension at 49,180
├── Swing 3: 50% retracement at 49,220
└── CONFLUENCE ZONE: 49,180 - 49,220
```

**2. Timeframe Confluence (Different Timeframes)**
```
Same level significant on multiple timeframes:
├── Daily: 61.8% retracement at 49,200
├── Weekly: 38.2% retracement at 49,150
├── Monthly: Key structure support at 49,100
└── CONFLUENCE ZONE: 49,100 - 49,200
```

**3. Technical Confluence (Fibonacci + Other)**
```
Fibonacci level aligns with other technical factors:
├── Fibonacci: 50% retracement at 49,300
├── Trendline: Rising trendline support at 49,280
├── Moving Average: 200 SMA at 49,350
├── Previous structure: Support turned resistance at 49,300
└── CONFLUENCE ZONE: 49,280 - 49,350
```

### Confluence Scoring System

```
CONFLUENCE SCORE CALCULATION:

Base Fibonacci Level:                    +1 point
Same TF additional Fib level:            +1 point each
Higher TF Fibonacci level:               +2 points each
Previous major pivot:                    +2 points
Harmonic pattern completion:             +3 points
Psychological round number:              +1 point
Trendline intersection:                  +1 point

SCORING INTERPRETATION:
├── 1-2 points:  Standard level, normal approach
├── 3-4 points:  Important level, increased attention
├── 5-6 points:  Significant level, high probability
├── 7+ points:   Major level, highest conviction
```

### Confluence Zone Identification

```
PROCESS:

1. CALCULATE all Fibonacci levels on primary timeframe
2. CALCULATE all Fibonacci levels on higher timeframe
3. IDENTIFY where levels cluster (within 0.5% of each other)
4. MARK structural confluences (previous pivots, trendlines)
5. SCORE each level
6. RANK by confluence score
7. HIGHLIGHT top 3-5 levels for focus
```

### Trading Confluence Zones

**Higher Confluence = Higher Conviction:**
```
LOW CONFLUENCE (1-2):
├── Trade with standard position size
├── Standard stop placement
├── Expect some failures
└── Multiple attempts may be needed

MEDIUM CONFLUENCE (3-4):
├── Trade with standard to slightly larger size
├── Standard stop placement
├── Higher probability of holding
└── Watch for strong signal bars

HIGH CONFLUENCE (5+):
├── Trade with full conviction
├── Can use slightly larger size
├── Stop can be tighter (level should hold)
├── Watch for harmonic patterns
└── Potential reversal zone
```

---

## 8. Risk Reduction Through Timeframe Selection

### The Core Concept

**Same major level, different entry timeframes = different risk profiles.**

The Fibonacci level is identified on a higher timeframe, but the ENTRY is executed on a lower timeframe for precision and reduced risk.

### Risk Comparison by Entry Timeframe

```
MAJOR SUPPORT LEVEL: 49,000 (identified on Daily chart)

ENTRY ON DAILY:
├── Entry: 49,000
├── Stop: 48,500 (below structure, 500 points)
├── Risk at £1/point: £500
├── Attempts possible: 1 (one signal bar)
└── Risk/Reward profile: Standard

ENTRY ON 4H:
├── Wait for price to reach daily level
├── Entry: 49,050 (after 4H signal bar)
├── Stop: 48,900 (below 4H structure, 150 points)
├── Risk at £1/point: £150
├── Attempts possible: 2-3
└── Risk/Reward profile: Improved

ENTRY ON 1H:
├── Wait for price to reach daily level
├── Entry: 49,030 (after 1H signal bar)
├── Stop: 48,970 (below 1H structure, 60 points)
├── Risk at £1/point: £60
├── Attempts possible: 5-8
└── Risk/Reward profile: Optimised

ENTRY ON 15MIN:
├── Wait for price to reach daily level
├── Entry: 49,015 (after 15min signal bar)
├── Stop: 48,985 (below 15min structure, 30 points)
├── Risk at £1/point: £30
├── Attempts possible: 10+
└── Risk/Reward profile: Maximum precision
```

### Risk Reduction Multiplier

| Entry TF | Typical Stop | Risk Multiplier | Attempts |
|----------|-------------|-----------------|----------|
| Daily | 300-500 pts | 1.0x (baseline) | 1 |
| 4H | 100-200 pts | 0.3-0.5x | 2-4 |
| 1H | 40-80 pts | 0.15-0.25x | 4-8 |
| 15min | 15-40 pts | 0.05-0.15x | 8-15 |

**The maths:** If your 15min stop is 30 points and your daily stop would be 300 points, you can attempt the trade 10 times with the same total risk as one daily entry.

### The Multi-Attempt Strategy

```
SCENARIO: Daily level at 49,000, want to risk maximum £500

APPROACH A: Single Daily Entry
├── Enter at 49,000
├── Stop at 48,500 (500 points × £1 = £500 risk)
├── If stopped: Full loss, no more attempts
└── If works: Ride to target

APPROACH B: Multiple Lower TF Entries
├── Attempt 1: Enter 49,050, stop 48,980 (70 pts = £70)
│   └── Stopped out. Loss: £70
├── Attempt 2: Enter 49,020, stop 48,960 (60 pts = £60)
│   └── Stopped out. Loss: £60
├── Attempt 3: Enter 49,000, stop 48,950 (50 pts = £50)
│   └── Stopped out. Loss: £50
├── Attempt 4: Enter 48,980, stop 48,930 (50 pts = £50)
│   └── WORKS! Price reverses
├── Total risk used: £230 (of £500 budget)
├── Remaining budget: £270
└── Trade captured at better entry than daily approach

APPROACH B captures the trade while risking less than half the budget.
```

### When to Use Each Timeframe

```
USE HIGHER TF ENTRY (Daily/4H) WHEN:
├── You cannot monitor charts frequently
├── The level is extremely high confluence
├── You want "set and forget" approach
├── Lower TF is choppy/unclear
└── You have high conviction

USE LOWER TF ENTRY (1H/15min) WHEN:
├── You can monitor charts actively
├── You want to optimise risk/reward
├── The level might have multiple tests
├── You want multiple attempts at the level
└── You're willing to be more hands-on
```

### Implementation Note

The trading application should:
1. Identify levels on higher timeframes
2. Alert when price approaches these levels
3. Provide entry options across multiple timeframes
4. Calculate risk for each entry timeframe
5. Let user choose based on their trading style

---

## 9. Signal Bars as the Gatekeeper

### Purpose of Signal Bars

Signal bars serve as the **confirmation mechanism** that transforms a Fibonacci level from "potential opportunity" to "actionable trade."

### Signal Bar Requirements (Review)

**For LONG Entry:**
```
✓ Price reaches Fibonacci support level
✓ Bar closes ABOVE opening price (bullish bar)
✓ Close is ABOVE the Fibonacci level
✓ Ideal: Price tested level and was rejected (Type 1)
```

**For SHORT Entry:**
```
✓ Price reaches Fibonacci resistance level
✓ Bar closes BELOW opening price (bearish bar)
✓ Close is BELOW the Fibonacci level
✓ Ideal: Price tested level and was rejected (Type 1)
```

### Signal Bar Types

```
TYPE 1 SIGNAL (Stronger)
├── Price penetrates through the Fibonacci level
├── Gets rejected (buyers/sellers step in)
├── Closes back on the "right" side of the level
├── Shows clear rejection of the level
└── Higher probability of success

TYPE 2 SIGNAL (Moderate)
├── Price approaches the Fibonacci level
├── Closes in the correct direction
├── But didn't deeply test the level
├── Less dramatic rejection
└── Still valid, slightly lower probability
```

**Visual Representation:**
```
TYPE 1 BUY SIGNAL:          TYPE 2 BUY SIGNAL:
                            
    │ Close                     │ Close
    │                           │
    ├───── Fib Level            ├───── Fib Level
    │                           │ Open
    │ Open                      │
    │                           │
    └──── Wick tested           │
         below level            │
                            
(Price went through,        (Price touched, closed
 got rejected)               above, less dramatic)
```

### Signal Bar Functions

```
FUNCTION 1: CONFIRMATION
├── The level IS being respected
├── Buyers/sellers ARE present at this level
├── Not just price passing through
└── Actionable evidence

FUNCTION 2: TIMING
├── Precise entry point (bar close)
├── No guessing when to enter
├── Waiting for commitment (close)
└── Reduces premature entries

FUNCTION 3: STOP PLACEMENT
├── Stop goes beyond the signal bar
├── If signal bar low is 49,000 → Stop at 48,990
├── Defined risk BEFORE entry
└── No ambiguity

FUNCTION 4: FILTER
├── No signal bar = No trade
├── Removes "almost" setups
├── Forces patience
└── Quality over quantity
```

### Signal Bar Decision Flow

```
Price reaches Fibonacci level
         │
         ▼
    Wait for bar to CLOSE
         │
         ▼
    Check close vs open direction
         │
    ┌────┴────┐
    │         │
  Correct   Wrong
 Direction  Direction
    │         │
    ▼         ▼
    │      NO SIGNAL
    │      (Wait for
    │       next bar)
    │
    ▼
 Check close vs Fibonacci level
         │
    ┌────┴────┐
    │         │
  Beyond     Not
   Level    Beyond
    │         │
    ▼         ▼
    │      NO SIGNAL
    │      (Wait for
    │       next bar)
    │
    ▼
 Check rejection quality
         │
    ┌────┴────┐
    │         │
  Tested    Touched
    &       Only
 Rejected     │
    │         │
    ▼         ▼
  TYPE 1    TYPE 2
  SIGNAL    SIGNAL
    │         │
    └────┬────┘
         │
         ▼
    ENTER TRADE
    Stop beyond signal bar
```

### Multi-Timeframe Signal Bars

**Important:** Signal bars form on each timeframe independently.

```
SCENARIO: Daily Fibonacci support at 49,000

DAILY SIGNAL BAR:
├── Forms once per day
├── Need to wait up to 24 hours
├── If forms: Enter with daily stop
└── Larger stop, single opportunity

1H SIGNAL BAR:
├── Forms once per hour
├── Multiple opportunities per day
├── Can enter faster with smaller stop
└── Tighter risk, more attempts

15MIN SIGNAL BAR:
├── Forms every 15 minutes
├── Many opportunities at the level
├── Fastest entry, smallest stop
└── Requires more monitoring
```

---

## 10. Binary Outcomes at Fibonacci Levels

### The Fundamental Truth

At every significant Fibonacci level, there are only two possible outcomes:

```
PRICE REACHES FIBONACCI LEVEL
              │
              ├── OUTCOME A: Level HOLDS
              │   ├── Signal bar forms
              │   ├── Price reverses
              │   └── Trade to next level
              │
              └── OUTCOME B: Level BREAKS
                  ├── No signal bar (or failed)
                  ├── Price continues through
                  └── Move to next level
```

### Why This Matters

**You are not predicting.** You are preparing for both outcomes.

```
PREPARATION MINDSET:

"Price is approaching the 61.8% retracement at 49,200"

IF IT HOLDS:
├── I will look for a signal bar
├── I will enter LONG if signal confirms
├── My stop will be below the signal bar
├── My target will be the previous high
└── R:R approximately 3:1

IF IT BREAKS:
├── I will cancel the pending setup
├── Next level is 78.6% at 48,900
├── I will prepare the same setup there
└── The break confirms that 61.8% wasn't strong enough
```

### Managing Both Outcomes

**Outcome A: Level Holds**
```
1. Signal bar confirms
2. Enter trade
3. Set stop beyond signal bar
4. Set targets at Fibonacci extensions
5. Manage trade (breakeven at +1R, trail stop)
6. Exit at target or trailing stop
7. Prepare for opposite direction at next level
```

**Outcome B: Level Breaks**
```
1. No signal bar (or signal bar fails)
2. Mark level as broken
3. Note: Broken support becomes resistance (and vice versa)
4. Move to next Fibonacci level
5. Prepare same setup at new level
6. Small loss (or no loss if no entry)
7. Continue systematic approach
```

### The Retry Framework

```
FIBONACCI LEVELS (Downward in uptrend pullback):

38.2% Level (First attempt)
├── HOLDS? → Trade LONG, target new high
└── BREAKS? → Move to next level ↓

50.0% Level (Second attempt)
├── HOLDS? → Trade LONG, target new high
└── BREAKS? → Move to next level ↓

61.8% Level (Third attempt)
├── HOLDS? → Trade LONG, target new high
└── BREAKS? → Move to next level ↓

78.6% Level (Fourth attempt)
├── HOLDS? → Trade LONG (note: trend weakening)
└── BREAKS? → Trend potentially changing
              └── Watch for lower timeframe confirmation
              └── Prepare potential SHORT setup
```

### Tracking Level Performance

The application should track:
```
LEVEL: 49,200 (61.8% retracement)
STATUS: TESTED
OUTCOME: HELD

LEVEL: 48,900 (78.6% retracement)
STATUS: NOT YET REACHED
OUTCOME: PENDING

LEVEL: 49,600 (Previous High)
STATUS: BROKEN (previously)
OUTCOME: NOW ACTING AS SUPPORT
```

---

## 11. Trading Style Spectrum

### The Flexibility of Fibonacci

The same Fibonacci methodology applies across all trading styles. The difference is timeframe selection and holding period.

### Trading Style Definitions

```
SCALPING / SNIPER
├── Timeframes: 1min, 3min, 5min, 15min
├── Hold time: Minutes to hours
├── Stops: Very tight (5-30 points)
├── Targets: Next Fib level on execution TF
├── Frequency: Multiple trades per day
├── Risk per trade: Very small
├── Requires: Constant monitoring, quick decisions
├── Best for: Full-time traders, high activity tolerance
└── Goal: Capture micro-swings

INTRADAY / DAY TRADING
├── Timeframes: 15min, 1H, 4H
├── Hold time: Hours (close by end of day)
├── Stops: Tight to moderate (20-100 points)
├── Targets: Daily Fib levels
├── Frequency: 1-5 trades per day
├── Risk per trade: Small
├── Requires: Active monitoring during session
├── Best for: Part-time traders, dedicated hours
└── Goal: Capture intraday swings

SWING TRADING
├── Timeframes: 4H, Daily, Weekly
├── Hold time: Days to weeks
├── Stops: Moderate to wide (50-300 points)
├── Targets: Weekly/Daily Fib levels
├── Frequency: 1-5 trades per week
├── Risk per trade: Moderate
├── Requires: Check charts 1-3 times daily
├── Best for: Working professionals
└── Goal: Capture multi-day swings

POSITION TRADING
├── Timeframes: Daily, Weekly, Monthly
├── Hold time: Weeks to months
├── Stops: Wide (200-1000+ points)
├── Targets: Monthly/Weekly Fib levels
├── Frequency: 1-5 trades per month
├── Risk per trade: Larger (properly sized)
├── Requires: Weekly chart review
├── Best for: Long-term investors
└── Goal: Capture major market moves
```

### Style Comparison Table

| Aspect | Scalper | Day Trader | Swing | Position |
|--------|---------|------------|-------|----------|
| **Primary TF** | 5-15min | 1H-4H | Daily | Weekly |
| **Entry TF** | 1-3min | 15min-1H | 4H-Daily | Daily-Weekly |
| **Typical Stop** | 10-30 pts | 30-100 pts | 100-300 pts | 300-1000 pts |
| **Hold Time** | Mins-Hours | Hours | Days-Weeks | Weeks-Months |
| **Trades/Week** | 20-100 | 5-25 | 2-10 | 1-4 |
| **Screen Time** | Constant | Session | 1-3x/day | Weekly |
| **Stress Level** | High | Medium-High | Medium | Low |
| **Capital Need** | Lower | Moderate | Moderate | Higher |

### Hybrid Approaches

Most traders combine styles:

```
EXAMPLE: SWING TRADER WITH SNIPER ENTRIES

Analysis timeframe: Daily (identify major levels)
Entry timeframe: 1H or 15min (precision entry)
Stop placement: Based on entry timeframe
Target: Based on Daily levels
Hold time: Days

BENEFIT: Swing trade targets with day trade risk
```

```
EXAMPLE: POSITION TRADER WITH SWING MANAGEMENT

Analysis timeframe: Weekly/Monthly (identify major levels)
Entry timeframe: Daily (confirm entry)
Stop placement: Based on Daily structure
Target: Based on Weekly/Monthly levels
Management: Active (add on pullbacks, trail stop)

BENEFIT: Major moves captured with active management
```

### Application Implementation

The trading application should support all styles by:

1. **Timeframe Selection**
   - Let user choose primary analysis timeframe
   - Suggest entry timeframe based on preference
   
2. **Alert Configuration**
   - Scalper: Real-time alerts
   - Day trader: Hourly checks
   - Swing: Daily alerts
   - Position: Weekly alerts

3. **Level Presentation**
   - Show levels relevant to user's trading timeframe
   - Filter noise from irrelevant timeframes

4. **Risk Calculator**
   - Adjust position sizing for different stop distances
   - Suggest appropriate style based on account size

---

## 12. Complete Decision Framework

### Master Decision Tree

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPLETE DECISION FRAMEWORK                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: TREND IDENTIFICATION                                    │
├─────────────────────────────────────────────────────────────────┤
│ Analyse last 3-5 pivots:                                        │
│ • Higher Highs + Higher Lows = UPTREND                          │
│ • Lower Highs + Lower Lows = DOWNTREND                          │
│ • Equal Highs + Equal Lows = RANGING (caution)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: TREND PHASE IDENTIFICATION                              │
├─────────────────────────────────────────────────────────────────┤
│ Where is price in the trend?                                    │
│ • IMPULSE: Moving away from levels (targets)                    │
│ • CORRECTION: Pulling back (entries)                            │
│ • CONTINUATION: Resuming after pullback                         │
│ • EXHAUSTION: Potential reversal zone                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: FIBONACCI LEVEL CALCULATION                             │
├─────────────────────────────────────────────────────────────────┤
│ Calculate based on trend and phase:                             │
│ • UPTREND + CORRECTION: Retracements for BUY levels             │
│ • UPTREND + IMPULSE: Extensions for SELL targets                │
│ • DOWNTREND + CORRECTION: Retracements for SELL levels          │
│ • DOWNTREND + IMPULSE: Extensions for BUY targets               │
│ Apply to multiple timeframes                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: CONFLUENCE IDENTIFICATION                               │
├─────────────────────────────────────────────────────────────────┤
│ Score each level:                                               │
│ • Same TF Fib confluence: +1 each                               │
│ • Higher TF Fib confluence: +2 each                             │
│ • Structure confluence: +2                                      │
│ • Harmonic pattern: +3                                          │
│ Prioritise highest scoring levels                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: BI-DIRECTIONAL SETUP PREPARATION                        │
├─────────────────────────────────────────────────────────────────┤
│ Prepare BOTH directions:                                        │
│                                                                 │
│ SETUP A (With-Trend):                                           │
│ • Entry level, stop, targets                                    │
│ • Standard position size                                        │
│ • Higher probability                                            │
│                                                                 │
│ SETUP B (Counter-Trend at Major Levels):                        │
│ • Entry level, stop, targets                                    │
│ • Reduced position size                                         │
│ • Lower probability, higher reward if correct                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: TIMEFRAME ENTRY SELECTION                               │
├─────────────────────────────────────────────────────────────────┤
│ Choose entry timeframe based on:                                │
│ • Available monitoring time                                     │
│ • Desired risk per attempt                                      │
│ • Number of attempts wanted                                     │
│ • Trading style preference                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 7: WAIT FOR PRICE TO REACH LEVEL                           │
├─────────────────────────────────────────────────────────────────┤
│ Set alerts at key levels                                        │
│ Monitor approach to level                                       │
│ Prepare for signal bar                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 8: SIGNAL BAR CONFIRMATION                                 │
├─────────────────────────────────────────────────────────────────┤
│ Wait for bar to CLOSE at the level:                             │
│                                                                 │
│ FOR LONG:                                                       │
│ ✓ Close > Open (bullish bar)                                    │
│ ✓ Close > Fibonacci level                                       │
│ ✓ Ideally: Tested and rejected (Type 1)                         │
│                                                                 │
│ FOR SHORT:                                                      │
│ ✓ Close < Open (bearish bar)                                    │
│ ✓ Close < Fibonacci level                                       │
│ ✓ Ideally: Tested and rejected (Type 1)                         │
│                                                                 │
│ IF NO SIGNAL: Wait for next bar or next level                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                         ┌────┴────┐
                         │         │
                     SIGNAL     NO SIGNAL
                     FORMS         │
                         │         ▼
                         │    ┌─────────────────┐
                         │    │ Level breaks?   │
                         │    ├─────────────────┤
                         │    │ YES: Next level │
                         │    │ NO: Wait        │
                         │    └─────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 9: ENTRY EXECUTION                                         │
├─────────────────────────────────────────────────────────────────┤
│ On signal bar confirmation:                                     │
│ 1. Calculate position size (Risk ÷ Stop Distance)               │
│ 2. Enter at close of signal bar                                 │
│ 3. Set stop loss (beyond signal bar structure)                  │
│ 4. Set Target 1 (next Fibonacci level)                          │
│ 5. Set Target 2 (extension level)                               │
│ 6. Set alerts for management                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 10: TRADE MANAGEMENT                                       │
├─────────────────────────────────────────────────────────────────┤
│ As trade progresses:                                            │
│                                                                 │
│ AT +1R (Risk amount in profit):                                 │
│ → Move stop to breakeven (FREE TRADE)                           │
│                                                                 │
│ AT TARGET 1:                                                    │
│ → Take partial profits (50-75%)                                 │
│ → Trail stop on remainder                                       │
│                                                                 │
│ AT TARGET 2:                                                    │
│ → Exit remaining position                                       │
│ OR                                                              │
│ → Continue trailing for extended move                           │
│                                                                 │
│ IF STOPPED:                                                     │
│ → Accept small loss                                             │
│ → Review: Was entry valid?                                      │
│ → Prepare for next opportunity                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 11: CYCLE CONTINUATION                                     │
├─────────────────────────────────────────────────────────────────┤
│ After trade completes:                                          │
│                                                                 │
│ 1. Exit position (at target or stop)                            │
│ 2. Identify new current price position                          │
│ 3. Recalculate Fibonacci levels                                 │
│ 4. Prepare OPPOSITE direction setup                             │
│    (Long completed → prepare Short at resistance)               │
│    (Short completed → prepare Long at support)                  │
│ 5. Return to STEP 7                                             │
│ 6. REPEAT indefinitely                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 13. Position Sizing by Trade Type

### Position Sizing Formula (Review)

```
Position Size = Risk Capital ÷ Stop Distance

Where:
- Risk Capital = Amount willing to lose (e.g., £500)
- Stop Distance = Entry price - Stop price (in points)
- Position Size = £ per point (or $ per pip, etc.)
```

### Position Sizing by Trade Category

**With-Trend Trades (Higher Probability)**
```
RISK: Standard (1-2% of account)

Example:
Account: £50,000
Risk per trade: 2% = £1,000
Entry: 49,000
Stop: 48,800 (200 points)
Position Size: £1,000 ÷ 200 = £5/point
```

**Counter-Trend Trades (Lower Probability)**
```
RISK: Reduced (0.5-1% of account)

Example:
Account: £50,000
Risk per trade: 1% = £500
Entry: 49,000
Stop: 49,150 (150 points)
Position Size: £500 ÷ 150 = £3.33/point
```

**Reversal Attempt Trades (Speculative)**
```
RISK: Small (0.25-0.5% of account)

Example:
Account: £50,000
Risk per trade: 0.5% = £250
Entry: 49,000
Stop: 49,080 (80 points)
Position Size: £250 ÷ 80 = £3.12/point

Note: If reversal confirms, can ADD to position
```

### Position Sizing by Confluence

| Confluence Score | Risk % | Position Size Adjustment |
|------------------|--------|--------------------------|
| 1-2 (Low) | 0.5-1% | Reduced |
| 3-4 (Medium) | 1-1.5% | Standard |
| 5-6 (High) | 1.5-2% | Standard to Increased |
| 7+ (Very High) | 2-3% | Full conviction |

### Multiple Entry Position Building

```
SCALING INTO A POSITION:

Major support zone: 49,000-48,800

ENTRY 1: First signal at 49,000
├── Size: 50% of intended position
├── Stop: 48,950

Price dips, second signal at 48,900

ENTRY 2: Second signal at 48,900
├── Size: Additional 30% of intended
├── Stop: 48,850 (move Entry 1 stop here too)

Price dips, third signal at 48,800

ENTRY 3: Third signal at 48,800
├── Size: Final 20% of intended
├── Stop: 48,750 (move all stops here)

RESULT:
├── Full position built at average 48,900
├── Final stop: 48,750 (150 points average risk)
├── Multiple confirmations of level holding
└── Better average entry than single attempt
```

---

## 14. Implementation Requirements

### Core System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    SYSTEM ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │  DATA FEED      │───▶│  TREND ENGINE   │                     │
│  │  (Price data)   │    │  (HH/HL/LH/LL)  │                     │
│  └─────────────────┘    └────────┬────────┘                     │
│                                  │                              │
│                                  ▼                              │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │  PIVOT          │◀───│  FIBONACCI      │                     │
│  │  DETECTOR       │    │  CALCULATOR     │                     │
│  └─────────────────┘    └────────┬────────┘                     │
│                                  │                              │
│                                  ▼                              │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │  CONFLUENCE     │───▶│  SIGNAL BAR     │                     │
│  │  SCORER         │    │  DETECTOR       │                     │
│  └─────────────────┘    └────────┬────────┘                     │
│                                  │                              │
│                                  ▼                              │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │  POSITION       │◀───│  TRADE          │                     │
│  │  SIZER          │    │  GENERATOR      │                     │
│  └─────────────────┘    └────────┬────────┘                     │
│                                  │                              │
│                                  ▼                              │
│                         ┌─────────────────┐                     │
│                         │  USER           │                     │
│                         │  INTERFACE      │                     │
│                         └─────────────────┘                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Component Specifications

**1. TREND ENGINE**
```
INPUT: Price data (OHLC) for multiple timeframes
PROCESS:
├── Identify pivot highs and lows
├── Compare sequential pivots
├── Determine HH/HL or LH/LL pattern
├── Classify trend: UPTREND, DOWNTREND, RANGING
├── Identify trend phase: IMPULSE, CORRECTION, CONTINUATION, EXHAUSTION
OUTPUT: Trend direction and phase for each timeframe
```

**2. PIVOT DETECTOR**
```
INPUT: Price data (OHLC)
PROCESS:
├── Scan for bars with higher highs than neighbours (Pivot High)
├── Scan for bars with lower lows than neighbours (Pivot Low)
├── Confirm with 1-2 bars on each side
├── Label pivots chronologically
├── Track pivot relationships (which pivot relates to which)
OUTPUT: List of confirmed pivot points with prices and timestamps
```

**3. FIBONACCI CALCULATOR**
```
INPUT: Pivot points, trend direction
PROCESS:
├── Select appropriate pivots based on trend
├── Calculate retracement levels (38.2%, 50%, 61.8%, 78.6%)
├── Calculate extension levels (127.2%, 161.8%, 261.8%)
├── Calculate projection levels if 3+ pivots (62%, 79%, 100%, 127%, 162%)
├── Calculate expansion levels if needed
├── Apply to multiple timeframes
OUTPUT: Complete list of Fibonacci levels with source pivots
```

**4. CONFLUENCE SCORER**
```
INPUT: Fibonacci levels from all timeframes
PROCESS:
├── Group levels within tolerance (e.g., 0.5%)
├── Score each level:
│   ├── Base Fib level: +1
│   ├── Same TF confluence: +1 each
│   ├── Higher TF confluence: +2 each
│   ├── Structure (previous pivot): +2
│   ├── Harmonic pattern: +3
├── Rank levels by score
OUTPUT: Prioritised list of levels with confluence scores
```

**5. SIGNAL BAR DETECTOR**
```
INPUT: Current price action at Fibonacci level
PROCESS:
├── Monitor price approach to level
├── Wait for bar close
├── Check: Close vs Open (direction)
├── Check: Close vs Fibonacci level (beyond?)
├── Check: Wick rejection (Type 1 vs Type 2)
├── Validate signal bar criteria
OUTPUT: Signal confirmation (TYPE 1, TYPE 2, or NO SIGNAL)
```

**6. TRADE GENERATOR**
```
INPUT: Confirmed signal, confluence score, trend context
PROCESS:
├── Determine trade direction (LONG/SHORT)
├── Set entry price (signal bar close)
├── Set stop price (beyond signal bar)
├── Set target prices (next Fib levels)
├── Calculate R:R ratio
├── Flag: WITH-TREND or COUNTER-TREND
├── Assign probability estimate
OUTPUT: Complete trade setup with all parameters
```

**7. POSITION SIZER**
```
INPUT: Trade setup, account parameters, risk preferences
PROCESS:
├── Calculate stop distance (Entry - Stop)
├── Determine risk capital based on trade type
├── Calculate position size (Risk ÷ Distance)
├── Validate against account constraints
├── Adjust for leverage/margin requirements
OUTPUT: Recommended position size
```

### User Interface Requirements

**Dashboard Display:**
```
┌─────────────────────────────────────────────────────────────────┐
│                        MARKET OVERVIEW                          │
├──────────────────────────┬──────────────────────────────────────┤
│ INSTRUMENT: DOW JONES    │ CURRENT: 49,450                      │
├──────────────────────────┼──────────────────────────────────────┤
│ MONTHLY: UP (HH+HL)      │ PHASE: Correction                    │
│ WEEKLY:  UP (HH+HL)      │ NEXT LEVEL: 49,200 (61.8%)           │
│ DAILY:   UP (pulling bk) │ CONFLUENCE: 5 (High)                 │
│ 4H:      DOWN            │ DIRECTION: LONG                      │
│ 1H:      DOWN            │ PROBABILITY: With-Trend (Higher)     │
└──────────────────────────┴──────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      ACTIVE SETUPS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ SETUP 1: LONG at 49,200 (61.8% Retracement)                     │
│ ├── Type: WITH-TREND                                            │
│ ├── Confluence: 5 (Daily 61.8% + Weekly 38.2% + Structure)      │
│ ├── Entry: 49,200                                               │
│ ├── Stop: 49,050 (150 points)                                   │
│ ├── Target 1: 49,600 (400 points) R:R 2.7:1                     │
│ ├── Target 2: 50,100 (900 points) R:R 6:1                       │
│ ├── Signal: WAITING                                             │
│ └── Position Size: £6.67/point (at £1,000 risk)                 │
│                                                                 │
│ SETUP 2: SHORT at 49,800 (127% Extension)                       │
│ ├── Type: COUNTER-TREND (Potential Reversal)                    │
│ ├── Confluence: 3 (Daily 127% + Previous Structure)             │
│ ├── Entry: 49,800                                               │
│ ├── Stop: 49,950 (150 points)                                   │
│ ├── Target 1: 49,200 (600 points) R:R 4:1                       │
│ ├── Target 2: 48,600 (1200 points) R:R 8:1                      │
│ ├── Signal: WAITING                                             │
│ └── Position Size: £3.33/point (at £500 risk - reduced)         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    FIBONACCI LEVEL MAP                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  50,100 ──── 127% Extension ─────────────── [Target 2]          │
│                                                                 │
│  49,800 ──── Daily Structure ─────────────── [SHORT zone]       │
│                                                                 │
│  49,600 ──── Previous High ──────────────── [Target 1]          │
│                                                                 │
│  49,450 ──── CURRENT PRICE ◀──────────────── ● HERE             │
│                                                                 │
│  49,200 ──── 61.8% Ret + Weekly 38.2% ──── [LONG zone] ★★★★★    │
│                                                                 │
│  49,050 ──── 78.6% Retracement ─────────── [LONG zone] ★★★      │
│                                                                 │
│  48,900 ──── Swing Low ──────────────────── [Stop area]         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Alert System Requirements

```
ALERT TYPES:

1. LEVEL APPROACH ALERT
   "Price approaching 61.8% support at 49,200 (50 points away)"

2. SIGNAL BAR FORMING ALERT
   "Potential signal bar forming at 49,200 - watching for close"

3. SIGNAL CONFIRMED ALERT
   "TYPE 1 SIGNAL CONFIRMED - LONG at 49,200
    Entry: 49,210 | Stop: 49,150 | Target: 49,600"

4. LEVEL BROKEN ALERT
   "61.8% support at 49,200 BROKEN - next level 78.6% at 49,050"

5. TRADE MANAGEMENT ALERT
   "+1R reached - move stop to breakeven (49,210)"
   "Target 1 reached at 49,600 - consider partial exit"
```

---

## 15. Appendix: Quick Reference Tables

### A. Fibonacci Ratio Reference

| Ratio | Decimal | Category | Primary Use |
|-------|---------|----------|-------------|
| 38.2% | 0.382 | Retracement | Shallow pullback (strong trend) |
| 50.0% | 0.500 | Retracement | Standard pullback |
| 61.8% | 0.618 | Retracement | Deep pullback |
| 78.6% | 0.786 | Retracement | Very deep pullback |
| 127.2% | 1.272 | Extension | First extension target |
| 161.8% | 1.618 | Extension | Standard extension target |
| 261.8% | 2.618 | Extension | Maximum extension target |

### B. Trend Identification Reference

| Pattern | Meaning | Trade Bias |
|---------|---------|------------|
| HH + HL | Higher Highs + Higher Lows | UPTREND - Buy pullbacks |
| LH + LL | Lower Highs + Lower Lows | DOWNTREND - Sell rallies |
| EH + EL | Equal Highs + Equal Lows | RANGING - Caution/Breakout |

### C. Trade Type Risk Reference

| Trade Type | Probability | Risk % | Position Size |
|------------|-------------|--------|---------------|
| With-Trend | Higher | 1-2% | Standard |
| Counter-Trend | Lower | 0.5-1% | Reduced |
| Reversal Attempt | Speculative | 0.25-0.5% | Small |

### D. Signal Bar Checklist

**LONG Signal:**
- [ ] Price at Fibonacci support level
- [ ] Bar closes ABOVE opening (bullish)
- [ ] Close is ABOVE Fibonacci level
- [ ] Wick shows rejection (Type 1 preferred)

**SHORT Signal:**
- [ ] Price at Fibonacci resistance level
- [ ] Bar closes BELOW opening (bearish)
- [ ] Close is BELOW Fibonacci level
- [ ] Wick shows rejection (Type 1 preferred)

### E. Position Sizing Quick Calculator

```
Position Size = Risk Amount ÷ Stop Distance

Examples at £1,000 risk:
├── 50 point stop  = £20/point
├── 100 point stop = £10/point
├── 150 point stop = £6.67/point
├── 200 point stop = £5/point
├── 250 point stop = £4/point
└── 300 point stop = £3.33/point
```

### F. Confluence Scoring Quick Reference

| Factor | Points |
|--------|--------|
| Base Fibonacci level | +1 |
| Additional same TF Fib | +1 each |
| Higher TF Fibonacci | +2 each |
| Previous major pivot | +2 |
| Harmonic pattern (D point) | +3 |
| Psychological level | +1 |
| Trendline intersection | +1 |

**Interpretation:**
- 1-2: Standard level
- 3-4: Important level
- 5-6: Significant level
- 7+: Major level

---

## Document Control

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | January 2026 | Initial release |

---

**This document is a companion to the Professional Fibonacci Workshop by Sandy Jadeja (SignalPro, 2017). It extends the core methodology with bi-directional trading concepts, multi-timeframe analysis frameworks, and implementation specifications for automated trading systems.**

---

*End of Document*
