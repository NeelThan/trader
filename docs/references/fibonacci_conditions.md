# Fibonacci Level Buy/Sell Conditions

This document defines when to show BUY (long) or SELL (short) levels for each Fibonacci tool based on swing structure detection.

**Key Principle**: The relationship between pivot points B and C (or A, B, C for Projection) determines which direction levels to display.

---

## Pivot Point Definitions

In our multi-timeframe system, we track three alternating pivot points:
- **A** = Oldest alternating pivot
- **B** = Middle alternating pivot
- **C** = Most recent alternating pivot (current)

| Strategy | Points Used |
|----------|-------------|
| Retracement | B and C |
| Extension | B and C |
| Expansion | B and C |
| Projection | A, B, and C |

---

## Quick Reference Table

| Fibonacci Tool | BUY Condition | SELL Condition |
|----------------|---------------|----------------|
| **Retracement** | B < C (swing UP) | B > C (swing DOWN) |
| **Extension** | B < C (swing UP) | B > C (swing DOWN) |
| **Expansion** | B > C (swing DOWN) | B < C (swing UP) |
| **Projection** | A > B (bearish ABC) | A < B (bullish ABC) |

---

## 1. RETRACEMENT (using B and C)

Retracements measure pullback levels within the B→C swing.

### BUY Retracement
**Setup**: B < C (B is LOW, C is HIGH - swing went UP)

```
        C (High) ← Most recent pivot
       /|
      / |
     /  |  ← Retracement levels (pullback DOWN)
    /   |
   B (Low) ← Middle pivot
```

**Calculation**:
- Range = C - B
- Formula: `Level = C - (Range × Ratio)`
- Levels are BETWEEN B and C

**Example**: B = 80, C = 100, Range = 20
| Ratio | Calculation | Level |
|-------|-------------|-------|
| 38.2% | 100 - (20 × 0.382) | 92.36 |
| 50.0% | 100 - (20 × 0.500) | 90.00 |
| 61.8% | 100 - (20 × 0.618) | 87.64 |
| 78.6% | 100 - (20 × 0.786) | 84.28 |

**Action**: BUY at these levels (buying the pullback in an uptrend)

---

### SELL Retracement
**Setup**: B > C (B is HIGH, C is LOW - swing went DOWN)

```
   B (High) ← Middle pivot
    \   |
     \  |  ← Retracement levels (pullback UP)
      \ |
       \|
        C (Low) ← Most recent pivot
```

**Calculation**:
- Range = B - C
- Formula: `Level = C + (Range × Ratio)`
- Levels are BETWEEN C and B

**Example**: B = 100, C = 80, Range = 20
| Ratio | Calculation | Level |
|-------|-------------|-------|
| 38.2% | 80 + (20 × 0.382) | 87.64 |
| 50.0% | 80 + (20 × 0.500) | 90.00 |
| 61.8% | 80 + (20 × 0.618) | 92.36 |
| 78.6% | 80 + (20 × 0.786) | 95.72 |

**Action**: SELL at these levels (selling the pullback in a downtrend)

---

## 2. EXTENSION (using B and C)

Extensions project targets BEYOND the B→C swing (using ratios > 1.0).

### BUY Extension
**Setup**: B < C (B is LOW, C is HIGH - swing went UP)

```
        C (High)
       /
      /
     /
    B (Low)
    |
    | ← Extension targets (BELOW B)
    ↓
```

**Calculation**:
- Range = C - B
- Formula: `Level = C - (Range × Ratio)` where Ratio > 1.0
- Levels are BELOW B

**Example**: B = 80, C = 100, Range = 20
| Ratio | Calculation | Level |
|-------|-------------|-------|
| 127.2% | 100 - (20 × 1.272) | 74.56 |
| 161.8% | 100 - (20 × 1.618) | 67.64 |
| 200.0% | 100 - (20 × 2.000) | 60.00 |
| 261.8% | 100 - (20 × 2.618) | 47.64 |

**Action**: BUY targets at these levels

---

### SELL Extension
**Setup**: B > C (B is HIGH, C is LOW - swing went DOWN)

```
    ↑
    | ← Extension targets (ABOVE B)
    |
    B (High)
     \
      \
       \
        C (Low)
```

**Calculation**:
- Range = B - C
- Formula: `Level = C + (Range × Ratio)` where Ratio > 1.0
- Levels are ABOVE B

**Example**: B = 100, C = 80, Range = 20
| Ratio | Calculation | Level |
|-------|-------------|-------|
| 127.2% | 80 + (20 × 1.272) | 105.44 |
| 161.8% | 80 + (20 × 1.618) | 112.36 |
| 200.0% | 80 + (20 × 2.000) | 120.00 |
| 261.8% | 80 + (20 × 2.618) | 132.36 |

**Action**: SELL targets at these levels

---

## 3. EXPANSION (using B and C)

Expansions project from C using the B-C range.

### BUY Expansion
**Setup**: B > C (B is HIGH, C is LOW - swing went DOWN)

```
    B (High)
    |
    | ← Range (B-C)
    |
    C (Low)
    |
    | ← Expansion targets (BELOW C)
    ↓
```

**Calculation**:
- Range = B - C
- Formula: `Level = C - (Range × Ratio)`
- Levels are BELOW C

**Example**: B = 100, C = 80, Range = 20
| Ratio | Calculation | Level |
|-------|-------------|-------|
| 38.2% | 80 - (20 × 0.382) | 72.36 |
| 50.0% | 80 - (20 × 0.500) | 70.00 |
| 61.8% | 80 - (20 × 0.618) | 67.64 |
| 100.0% | 80 - (20 × 1.000) | 60.00 |
| 161.8% | 80 - (20 × 1.618) | 47.64 |

**Action**: BUY targets at these levels

---

### SELL Expansion
**Setup**: B < C (B is LOW, C is HIGH - swing went UP)

```
    ↑
    | ← Expansion targets (ABOVE C)
    |
    C (High)
    |
    | ← Range (C-B)
    |
    B (Low)
```

**Calculation**:
- Range = C - B
- Formula: `Level = C + (Range × Ratio)`
- Levels are ABOVE C

**Example**: B = 80, C = 100, Range = 20
| Ratio | Calculation | Level |
|-------|-------------|-------|
| 38.2% | 100 + (20 × 0.382) | 107.64 |
| 50.0% | 100 + (20 × 0.500) | 110.00 |
| 61.8% | 100 + (20 × 0.618) | 112.36 |
| 100.0% | 100 + (20 × 1.000) | 120.00 |
| 161.8% | 100 + (20 × 1.618) | 132.36 |

**Action**: SELL targets at these levels

---

## 4. PROJECTION (using A, B, and C)

Projections use all three pivot points. The A-B range is projected from point C.

### BUY Projection
**Setup**: A > B (A is HIGH, B is LOW), C is between A and B

```
  A (High) ← Oldest pivot
   \
    \
     \
      B (Low) ← Middle pivot
       \
        \ C (Pullback high, between A and B)
         \|
          | ← Projection targets (BELOW C)
          ↓
```

**Calculation**:
- Range = A - B
- Formula: `Level = C - (Range × Ratio)`
- Levels are BELOW C

**Example**: A = 120, B = 80, C = 100, Range = 40
| Ratio | Calculation | Level |
|-------|-------------|-------|
| 61.8% | 100 - (40 × 0.618) | 75.28 |
| 78.6% | 100 - (40 × 0.786) | 68.56 |
| 100.0% | 100 - (40 × 1.000) | 60.00 |
| 127.2% | 100 - (40 × 1.272) | 49.12 |
| 161.8% | 100 - (40 × 1.618) | 35.28 |

**Action**: BUY targets at these levels

---

### SELL Projection
**Setup**: A < B (A is LOW, B is HIGH), C is between A and B

```
          ↑
          | ← Projection targets (ABOVE C)
         /|
        / C (Pullback low, between A and B)
       /
      B (High) ← Middle pivot
     /
    /
   /
  A (Low) ← Oldest pivot
```

**Calculation**:
- Range = B - A
- Formula: `Level = C + (Range × Ratio)`
- Levels are ABOVE C

**Example**: A = 80, B = 120, C = 100, Range = 40
| Ratio | Calculation | Level |
|-------|-------------|-------|
| 61.8% | 100 + (40 × 0.618) | 124.72 |
| 78.6% | 100 + (40 × 0.786) | 131.44 |
| 100.0% | 100 + (40 × 1.000) | 140.00 |
| 127.2% | 100 + (40 × 1.272) | 150.88 |
| 161.8% | 100 + (40 × 1.618) | 164.72 |

**Action**: SELL targets at these levels

---

## Formula Summary

| Strategy | Setup | Range | Formula | Levels |
|----------|-------|-------|---------|--------|
| **Retracement BUY** | B < C | C - B | C - (Range × ratio) | Between B and C |
| **Retracement SELL** | B > C | B - C | C + (Range × ratio) | Between C and B |
| **Extension BUY** | B < C | C - B | C - (Range × ratio) | Below B |
| **Extension SELL** | B > C | B - C | C + (Range × ratio) | Above B |
| **Expansion BUY** | B > C | B - C | C - (Range × ratio) | Below C |
| **Expansion SELL** | B < C | C - B | C + (Range × ratio) | Above C |
| **Projection BUY** | A > B | A - B | C - (Range × ratio) | Below C |
| **Projection SELL** | A < B | B - A | C + (Range × ratio) | Above C |

---

## Key Pattern

- **BUY setups**: Subtract from reference point → levels go DOWN
- **SELL setups**: Add to reference point → levels go UP

---

## Detection Logic

```typescript
// Determine BUY or SELL based on pivot relationships
function getFibDirection(strategy: string, a: number, b: number, c: number): 'BUY' | 'SELL' {
  switch (strategy) {
    case 'retracement':
    case 'extension':
      return b < c ? 'BUY' : 'SELL';
    case 'expansion':
      return b > c ? 'BUY' : 'SELL';
    case 'projection':
      return a > b ? 'BUY' : 'SELL';
  }
}

// Calculate level based on direction
function calcLevel(direction: 'BUY' | 'SELL', refPoint: number, range: number, ratio: number): number {
  return direction === 'BUY'
    ? refPoint - (range * ratio)  // Subtract for BUY
    : refPoint + (range * ratio); // Add for SELL
}
```

---

## Reference

Source: Sandy Jadeja Fibonacci Trading Workshop
