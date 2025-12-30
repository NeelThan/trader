# Implement Auto-Refresh for Market Data with Countdown Timer

- Status: accepted
- Deciders: Development team
- Date: 2025-12-30
- Tags: frontend, ux, market-data, real-time

Technical Story: Users need to know when market data will refresh and want control over the refresh behavior.

## Context and Problem Statement

When viewing real-time market data from Yahoo Finance, users need visibility into data freshness. Without feedback, users cannot know if they're looking at current prices or stale data. Additionally, different timeframes have different freshness requirements - a 1-minute chart needs more frequent updates than a weekly chart.

## Decision Drivers

- Users need confidence in data freshness
- Different timeframes require different refresh rates
- Yahoo Finance has undocumented rate limits to respect
- Users should have control over refresh behavior
- Transparency builds trust in the application

## Considered Options

- Fixed refresh interval for all timeframes
- Timeframe-based refresh intervals with user controls
- Manual refresh only
- WebSocket-based real-time updates

## Decision Outcome

Chosen option: "Timeframe-based refresh intervals with user controls", because it balances data freshness with rate limit concerns while giving users transparency and control.

### Positive Consequences

- Users always know when data will refresh (countdown timer)
- Users can see when data was last updated (timestamp)
- Refresh rate adapts to timeframe needs
- Users can disable auto-refresh if desired
- Manual refresh available for immediate updates
- Respects Yahoo Finance rate limits

### Negative Consequences

- Adds UI complexity with timer display
- Requires state management for countdown
- Still not truly real-time (polling-based)

## Implementation Details

### Refresh Intervals by Timeframe

| Timeframe | Refresh Interval | Rationale |
|-----------|------------------|-----------|
| 1m | 60 seconds | Match candle period |
| 15m | 60 seconds | Sub-candle updates useful |
| 1H | 5 minutes | Balance freshness/rate limits |
| 4H | 5 minutes | Balance freshness/rate limits |
| 1D | 15 minutes | Daily data changes slowly |
| 1W | 1 hour | Weekly data rarely urgent |
| 1M | 1 hour | Monthly data rarely urgent |

### UI Components

1. **Auto-Refresh Toggle**: Green button when enabled, outline when disabled
2. **Refresh Now Button**: Manual trigger, disabled during loading
3. **Countdown Timer**: Format "M:SS" showing time until next refresh
4. **Last Updated**: Timestamp of most recent successful fetch
5. **Interval Indicator**: Shows current refresh frequency

### State Management

```typescript
const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
const [countdown, setCountdown] = useState<number>(0);
const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
```

### Rate Limit Compliance

With these intervals, maximum requests per hour:
- 1m/15m timeframe: 60 requests/hour (well under 360 limit)
- 1H/4H timeframe: 12 requests/hour
- 1D timeframe: 4 requests/hour
- 1W/1M timeframe: 1 request/hour

## Pros and Cons of the Options

### Fixed refresh interval for all timeframes

- Good, because simple to implement
- Bad, because wastes requests on slow timeframes
- Bad, because may not be fresh enough for fast timeframes

### Timeframe-based refresh intervals with user controls

- Good, because adapts to user needs
- Good, because respects rate limits
- Good, because provides transparency
- Good, because gives user control
- Bad, because more complex implementation

### Manual refresh only

- Good, because simplest implementation
- Good, because no rate limit concerns
- Bad, because poor UX for active trading
- Bad, because users may miss price movements

### WebSocket-based real-time updates

- Good, because truly real-time
- Bad, because Yahoo Finance doesn't offer WebSocket API
- Bad, because would require paid data provider

## Links

- Relates to: [Yahoo Finance Market Data ADR](20251230-yahoo-finance-market-data.md)
- Relates to: [UX Best Practices](../frontend/ux-best-practices.md)
