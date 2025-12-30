# Use yahoo-finance2 for Real-Time Market Data

- Status: accepted
- Deciders: Development team
- Date: 2025-12-30
- Tags: frontend, api, market-data, yahoo-finance

Technical Story: Integrate real market data into the trading chart application as an alternative to simulated data.

## Context and Problem Statement

The trading chart application needs access to real market data for meaningful technical analysis. Users need to see actual price movements for indices (DJI, SPX, NDX), cryptocurrencies (BTC), forex (EUR/USD), and commodities (Gold) across multiple timeframes.

## Decision Drivers

- Need for real-time or near-real-time market data
- Support for multiple asset classes (stocks, crypto, forex, commodities)
- No API key requirement for initial development
- Support for intraday and historical data
- Cost considerations (free tier availability)

## Considered Options

- Yahoo Finance via yahoo-finance2 npm package
- Alpha Vantage API
- Polygon.io API
- TradingView data (widget-only)
- Paid Bloomberg/Reuters feeds

## Decision Outcome

Chosen option: "Yahoo Finance via yahoo-finance2", because it provides free access to a wide range of market data without requiring API keys, supports all our target asset classes, and has an active open-source community maintaining the library.

### Positive Consequences

- No API key or account required
- Wide asset class coverage (stocks, indices, crypto, forex, commodities)
- Intraday data available (1m, 15m, 1h intervals)
- Historical data available (daily, weekly, monthly)
- Active npm package with TypeScript support
- Can run server-side in Next.js API routes

### Negative Consequences

- Unofficial API - Yahoo provides no guarantees
- Rate limiting exists but is undocumented
- May experience service disruptions
- Cannot run in browser (requires server-side execution)
- 1-minute data limited to recent 7 days

## Rate Limiting Considerations

**Important**: Yahoo Finance does not provide official API documentation. Based on community research:

| Limit Type | Estimated Threshold | Source |
|------------|---------------------|--------|
| Requests per hour | ~360 | Community reports |
| Bulk requests | ~950 tickers before 429 | GitHub issues (Nov 2024) |
| Aggressive scraping | Temporary IP ban | Common experience |

### Recommended Safeguards

1. **Implement refresh intervals based on timeframe**:
   - 1m/15m timeframes: Refresh every 60 seconds
   - 1H/4H timeframes: Refresh every 5 minutes
   - 1D timeframes: Refresh every 15 minutes
   - 1W/1M timeframes: Refresh every 1 hour

2. **User controls**:
   - Allow users to disable auto-refresh
   - Provide manual refresh button
   - Show countdown timer for transparency

3. **Error handling**:
   - Gracefully handle 429 (rate limit) errors
   - Implement exponential backoff on failures
   - Fall back to simulated data when unavailable

4. **Request optimization**:
   - Cache responses where appropriate
   - Avoid unnecessary refetches on parameter changes
   - Consider request queuing for multiple symbols

## Implementation Details

### Symbol Mapping

| App Symbol | Yahoo Symbol | Asset Type |
|------------|--------------|------------|
| DJI | ^DJI | Index |
| SPX | ^GSPC | Index |
| NDX | ^NDX | Index |
| BTCUSD | BTC-USD | Crypto |
| EURUSD | EURUSD=X | Forex |
| GOLD | GC=F | Commodity (Futures) |

### Timeframe Mapping

| App Timeframe | Yahoo Interval | Notes |
|---------------|----------------|-------|
| 1m | 1m | Limited to ~7 days history |
| 15m | 15m | Limited to ~60 days history |
| 1H | 1h | - |
| 4H | 1h (aggregated) | Manually aggregate 4x1h bars |
| 1D | 1d | - |
| 1W | 1wk | - |
| 1M | 1mo | - |

### API Route Location

`frontend/src/app/api/market-data/route.ts`

## Pros and Cons of the Options

### Yahoo Finance via yahoo-finance2

- Good, because free with no API key required
- Good, because supports all target asset classes
- Good, because active open-source maintenance since 2013
- Good, because TypeScript support in v3
- Bad, because unofficial API with no guarantees
- Bad, because undocumented rate limits
- Bad, because potential for service disruption

### Alpha Vantage API

- Good, because official API with documentation
- Good, because free tier available (25 requests/day)
- Bad, because very limited free tier
- Bad, because paid plans expensive for real-time data
- Bad, because limited crypto/forex coverage on free tier

### Polygon.io API

- Good, because official API with excellent documentation
- Good, because real-time data available
- Bad, because requires paid subscription for real-time
- Bad, because free tier is delayed data only

### TradingView data (widget-only)

- Good, because reliable and comprehensive
- Good, because already integrated for widget view
- Bad, because cannot extract data programmatically
- Bad, because limited to widget display only

## Links

- [yahoo-finance2 npm package](https://www.npmjs.com/package/yahoo-finance2)
- [yahoo-finance2 GitHub](https://github.com/gadicc/node-yahoo-finance2)
- [Rate limiting discussion](https://github.com/ranaroussi/yfinance/issues/2128)
- Relates to: [Frontend Design System ADR](20251230-frontend-design-system.md)
