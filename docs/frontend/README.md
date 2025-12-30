# Frontend Documentation

Technical documentation for the Next.js/TypeScript frontend.

## Status

**Active Development** - Core charting functionality complete with Yahoo Finance integration.

## Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Next.js | 16.1.1 |
| Language | TypeScript | 5.x |
| Charting | TradingView Lightweight Charts | 5.x |
| Styling | Tailwind CSS | 4.x |
| UI Components | shadcn/ui | Latest |
| State | React hooks + localStorage | - |
| Data Source | Yahoo Finance (yahoo-finance2) | 3.x |

## Features

### Chart Component
- Candlestick, Bar (OHLC), and Heikin Ashi chart types
- Configurable color schemes (green-red, blue-red, blue-orange, teal-pink)
- Light and dark theme support
- Responsive with auto-resize

### Fibonacci Levels
- Retracement levels (0%, 23.6%, 38.2%, 50%, 61.8%, 78.6%, 100%)
- Extension levels (127.2%, 141.4%, 161.8%, 200%, 261.8%)
- Expansion levels from swing low
- Projection levels using A-B-C pattern

### Pivot Point Detection
- Automatic swing high/low detection
- Alternating pivot pattern enforcement
- Manual pivot override option
- Visual pivot lines connecting points

### Market Data
- Yahoo Finance integration for real-time data
- Auto-refresh with configurable intervals by timeframe
- Market status display (Open, Pre-Market, After Hours, Closed)
- Countdown timer showing next refresh
- Support for indices (DJI, SPX, NDX), crypto (BTC), forex (EUR/USD), commodities (Gold)

### Settings
- Persistent settings via localStorage
- Cross-tab synchronization
- Chart preferences (type, theme, colors)
- Default symbol and timeframe
- Fibonacci visibility toggles

## Architecture

```
frontend/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── api/market-data/    # Yahoo Finance API route
│   │   ├── chart/              # Main chart page
│   │   ├── settings/           # Settings page
│   │   └── tradingview/        # TradingView widget page
│   ├── components/
│   │   ├── trading/            # Chart components
│   │   │   ├── candlestick-chart.tsx
│   │   │   └── fibonacci-levels.tsx
│   │   └── ui/                 # shadcn/ui components
│   ├── hooks/
│   │   └── use-settings.ts     # Settings hook with localStorage
│   └── lib/
│       └── utils.ts            # Utility functions
├── public/
├── package.json
└── next.config.ts
```

## API Routes

### GET /api/market-data

Fetches OHLC data from Yahoo Finance.

**Query Parameters:**
- `symbol` - Market symbol (DJI, SPX, NDX, BTCUSD, EURUSD, GOLD)
- `timeframe` - Data interval (1m, 15m, 1H, 4H, 1D, 1W, 1M)

**Response:**
```json
{
  "symbol": "DJI",
  "timeframe": "1D",
  "data": [
    { "time": "2024-01-15", "open": 42500, "high": 42600, "low": 42400, "close": 42550 }
  ],
  "meta": {
    "currency": "USD",
    "exchangeName": "DJI",
    "regularMarketPrice": 42550
  },
  "market": {
    "state": "REGULAR",
    "stateDisplay": "Market Open",
    "isOpen": true,
    "isPreMarket": false,
    "isAfterHours": false,
    "isClosed": false
  }
}
```

## Auto-Refresh Intervals

| Timeframe | Refresh Interval | Rationale |
|-----------|------------------|-----------|
| 1m | 60 seconds | Match candle period |
| 15m | 60 seconds | Sub-candle updates |
| 1H | 5 minutes | Balance freshness/rate limits |
| 4H | 5 minutes | Balance freshness/rate limits |
| 1D | 15 minutes | Daily data changes slowly |
| 1W | 1 hour | Weekly data rarely urgent |
| 1M | 1 hour | Monthly data rarely urgent |

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:3000/chart for the main chart view.

## Related Documentation

- [UX Best Practices](./ux-best-practices.md) - Design system guidelines
- [Yahoo Finance ADR](../adr/20251230-yahoo-finance-market-data.md) - Data source decision
- [Auto-Refresh ADR](../adr/20251230-auto-refresh-market-data.md) - Refresh strategy
- [Design System ADR](../adr/20251230-frontend-design-system.md) - UI framework choices
- [TradingView Lightweight Charts](https://tradingview.github.io/lightweight-charts/) - Charting library
