# Frontend Documentation

Technical documentation for the Next.js/TypeScript frontend.

## Status

**Planned** - Not yet implemented.

## Planned Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14+ |
| Language | TypeScript |
| Charting | TradingView Lightweight Charts |
| Styling | Tailwind CSS (TBD) |
| State | React Context or Zustand (TBD) |

## Planned Features

### Chart Component
- Candlestick charts with TradingView Lightweight Charts
- Fibonacci level overlays (retracement, extension, projection, expansion)
- Harmonic pattern visualization (XABCD points)
- Signal bar highlighting

### Dashboard
- Multi-timeframe trend display
- Active patterns list
- Signal alerts
- Position sizing calculator

### Trade Management
- Entry/exit planning
- Risk/reward visualization
- Trade journal

## Architecture (Planned)

```
frontend/
├── src/
│   ├── app/              # Next.js app router
│   ├── components/       # React components
│   │   ├── chart/        # TradingView chart components
│   │   ├── dashboard/    # Dashboard widgets
│   │   └── ui/           # Shared UI components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities and API client
│   └── types/            # TypeScript types
├── public/               # Static assets
├── package.json
└── README.md
```

## Related Documentation

- [Strategy Knowledge](../references/fibonacci_strategy_knowledge.md) - Trading strategy theory
- [App Specification](../references/fibonacci_trading_app_specification.md) - Feature requirements
- [ADRs](../adr/) - Architecture decisions
- [TradingView Lightweight Charts](https://tradingview.github.io/lightweight-charts/) - Charting library docs
