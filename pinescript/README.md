# Pine Script

TradingView Pine Script indicators and strategies that mirror functionality from the Trader app.

## Structure

- `indicators/` - Custom indicators
- `strategies/` - Trading strategies
- `libraries/` - Reusable Pine Script libraries

## Available Indicators

### Swing Detection & Pivot Points (`indicators/swing_detection.pine`)

Replicates the swing detection from Workflow V2. Identifies and classifies swing points:

**Features:**
- Detects swing highs and swing lows using configurable lookback
- Classifies swings as HH (Higher High), HL (Higher Low), LH (Lower High), LL (Lower Low)
- Enforces alternation (high → low → high → low pattern)
- Draws connecting lines between pivots
- Info panel showing current state

**Settings:**
| Setting | Default | Description |
|---------|---------|-------------|
| Lookback Period | 5 | Bars to check on each side (2-20). Higher = fewer, more significant pivots |
| Show Swing Labels | true | Display HH/HL/LH/LL labels |
| Show Pivot Dots | true | Mark pivot points with dots |
| Show Connecting Lines | true | Draw zigzag lines between pivots |

**Algorithm:**
1. A bar is a **swing high** if its high > all highs within lookback bars on both sides
2. A bar is a **swing low** if its low < all lows within lookback bars on both sides
3. Pivots must alternate (consecutive same-type keeps the more extreme one)
4. Classification compares current pivot to previous pivot of same type

## Usage

1. Open TradingView
2. Click "Pine Editor" at the bottom
3. Copy the script content and paste
4. Click "Add to Chart"
