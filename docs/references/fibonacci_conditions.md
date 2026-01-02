# Fibonacci Level Buy/Sell Conditions

This document defines when to show BUY (long) or SELL (short) levels for each Fibonacci tool based on swing structure detection.

**Key Principle**: The "shape" of the swing on each timeframe determines which direction levels to display.

---

## Quick Reference Table

| Fibonacci Tool | BUY/Long Condition | SELL/Short Condition |
|----------------|-------------------|---------------------|
| **Retracement** | Swing DOWN (High→Low) | Swing UP (Low→High) |
| **Extension** | Bearish move (targets below) | Bullish move (targets above) |
| **Projection** | A=Low, B=High, C=pullback (targets down) | A=High, B=Low, C=pullback (targets up) |
| **Expansion** | A=High, B=Low (targets below B) | A=Low, B=High (targets above B) |

---

## 1. RETRACEMENT Conditions

Retracements measure pullback levels within a swing move.

### BUY Setup (Long Retracement)
**Shape Required**: Swing from HIGH to LOW
- Point A = Swing High
- Point X = Swing Low
- Price moved DOWN, waiting for pullback UP to retracement levels
- Formula: `Level = High - (Range × Ratio)`
- **Action**: Look to BUY at retracement levels (38.2%, 50%, 61.8%, 78.6%)

```
    A (High)
    |\
    | \
    |  \  ← Price moved down
    |   \
    X (Low) ← Now looking for pullback UP to buy
```

### SELL Setup (Short Retracement)
**Shape Required**: Swing from LOW to HIGH
- Point X = Swing Low
- Point A = Swing High
- Price moved UP, waiting for pullback DOWN to retracement levels
- Formula: `Level = Low + (Range × Ratio)`
- **Action**: Look to SELL at retracement levels (38.2%, 50%, 61.8%, 78.6%)

```
    A (High) ← Now looking for pullback DOWN to sell
    /|
   / |
  /  |  ← Price moved up
 /   |
X (Low)
```

### Detection Logic
```typescript
// Detect swing direction from latest swing markers
if (latestSwing === "HL" || latestSwing === "LL") {
  // Swing ended LOW → next move likely UP → BUY retracement
  showLongRetracement = true;
} else if (latestSwing === "HH" || latestSwing === "LH") {
  // Swing ended HIGH → next move likely DOWN → SELL retracement
  showShortRetracement = true;
}
```

---

## 2. EXTENSION Conditions

Extensions project targets BEYOND the original swing (past 100%).

### BUY Setup (Long Extension)
**Shape Required**: Bearish swing (High→Low), targets BELOW origin
- Point A = Origin (High)
- Point X = Extreme (Low)
- Extensions project below the low
- Formula: `Level = A - (Range × Ratio)` where ratio > 1.0
- **Action**: BUY targets are at extension levels (127.2%, 161.8%, 261.8%)

```
    A (High/Origin)
    |
    | ← Range
    |
    X (Low)
    |
    | ← Extension targets (127.2%, 161.8%, 261.8%)
    ↓
```

### SELL Setup (Short Extension)
**Shape Required**: Bullish swing (Low→High), targets ABOVE origin
- Point A = Origin (Low)
- Point X = Extreme (High)
- Extensions project above the high
- Formula: `Level = A + (Range × Ratio)` where ratio > 1.0
- **Action**: SELL targets are at extension levels (127.2%, 161.8%, 261.8%)

```
    ↑
    | ← Extension targets (127.2%, 161.8%, 261.8%)
    |
    X (High)
    |
    | ← Range
    |
    A (Low/Origin)
```

### Detection Logic
```typescript
// Extension direction follows the swing direction
if (swingDirection === "down") {
  // Bearish swing → BUY extensions (targets below)
  showLongExtension = true;
} else if (swingDirection === "up") {
  // Bullish swing → SELL extensions (targets above)
  showShortExtension = true;
}
```

**Note**: Extensions are shown when price has moved past 100% of the retracement zone.

---

## 3. PROJECTION Conditions

Projections use 3 pivot points (A, B, C) to project targets from C.

### BUY Setup (Long Projection)
**Shape Required**: ABC where A=Low, B=High, C=Higher Low (pullback)
- A = Swing Low (start)
- B = Swing High (impulse)
- C = Pullback Low (retracement of A-B)
- Projects targets DOWN from C
- Formula: `Level = C - (AB_Swing × Ratio)`
- **Action**: BUY targets projected below C

```
        B (High)
       /\
      /  \
     /    \ C (Pullback)
    /      \|
   /        | ← Projection targets down from C
  A (Low)   ↓
```

### SELL Setup (Short Projection)
**Shape Required**: ABC where A=High, B=Low, C=Lower High (pullback)
- A = Swing High (start)
- B = Swing Low (impulse)
- C = Pullback High (retracement of A-B)
- Projects targets UP from C
- Formula: `Level = C + (AB_Swing × Ratio)`
- **Action**: SELL targets projected above C

```
  A (High)   ↑
   \        | ← Projection targets up from C
    \      /|
     \    / C (Pullback)
      \  /
       \/
        B (Low)
```

### Detection Logic
```typescript
// Need ABC pattern detection
if (patternType === "bullish_ABC") {
  // A=Low, B=High, C=HL → project down for BUY
  showLongProjection = true;
} else if (patternType === "bearish_ABC") {
  // A=High, B=Low, C=LH → project up for SELL
  showShortProjection = true;
}
```

---

## 4. EXPANSION Conditions

Expansions measure the range between A and B, then project from B.

### BUY Setup (Long Expansion)
**Shape Required**: A=HIGH, B=LOW (bearish range)
- A = High point
- B = Low point (expansion origin)
- Targets project BELOW B
- Formula: `Level = B - (AB_Range × Ratio)`
- **Action**: BUY targets below B

```
    A (High)
    |
    | ← Range (A-B)
    |
    B (Low)
    |
    | ← Expansion targets (38.2%, 50%, 61.8%, 100%, 161.8%)
    ↓
```

### SELL Setup (Short Expansion)
**Shape Required**: A=LOW, B=HIGH (bullish range)
- A = Low point
- B = High point (expansion origin)
- Targets project ABOVE B
- Formula: `Level = B + (AB_Range × Ratio)`
- **Action**: SELL targets above B

```
    ↑
    | ← Expansion targets (38.2%, 50%, 61.8%, 100%, 161.8%)
    |
    B (High)
    |
    | ← Range (A-B)
    |
    A (Low)
```

### Detection Logic
```typescript
// Based on A-B relationship
if (pointA > pointB) {
  // A=High, B=Low → BUY expansion (targets below)
  showLongExpansion = true;
} else if (pointA < pointB) {
  // A=Low, B=High → SELL expansion (targets above)
  showShortExpansion = true;
}
```

---

## Sync Logic Implementation

When the user clicks "Smart Sync", for each timeframe:

1. **Get swing detection results** (HH, HL, LH, LL markers)
2. **Determine swing shape**:
   - Latest HL/LL = swing ended LOW → shape is "down"
   - Latest HH/LH = swing ended HIGH → shape is "up"

3. **Apply conditions per strategy**:

| Strategy | Shape "down" (ended low) | Shape "up" (ended high) |
|----------|-------------------------|------------------------|
| Retracement | Show LONG (buy pullback) | Show SHORT (sell pullback) |
| Extension | Show LONG (targets below) | Show SHORT (targets above) |
| Projection | Show LONG (if ABC bullish) | Show SHORT (if ABC bearish) |
| Expansion | Based on A>B or A<B | Based on A<B or A>B |

4. **Price position filtering**:
   - If price < 100% of swing → primarily show RETRACEMENTS
   - If price > 100% of swing → primarily show EXTENSIONS
   - Show BOTH if price is near 100% (80-120% range)

---

## Example Scenarios

### Scenario 1: Monthly timeframe with swing down
- Latest marker: HL (Higher Low)
- Swing: High→Low (bearish move completed)
- **Retracement**: Show LONG (buying the pullback up)
- **Extension**: Show LONG (targets below the low)

### Scenario 2: Daily timeframe with swing up
- Latest marker: LH (Lower High)
- Swing: Low→High (bullish move completed)
- **Retracement**: Show SHORT (selling the pullback down)
- **Extension**: Show SHORT (targets above the high)

### Scenario 3: Mixed timeframes
- Monthly: HL → Show LONG levels
- Weekly: LH → Show SHORT levels
- Daily: LL → Show LONG levels
- Result: Multi-TF analysis shows conflicting directions - wait for alignment

---

## Reference

Source: Sandy Jadeja Fibonacci Trading Workshop
Document: `docs/references/fibonacci_strategy_knowledge.md`

Key pages:
- Page 21: Retracement buy signal conditions
- Page 23: Extension formulas
- Page 24: Projection (ABC) patterns
- Page 25: Expansion calculations
