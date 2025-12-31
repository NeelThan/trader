# Standalone + Composable Tool Design Pattern

- Status: accepted
- Deciders: Development team
- Date: 2025-12-30
- Tags: frontend, architecture, components, reusability

Technical Story: Design trading analysis tools that work both independently and within the workflow stepper

## Context and Problem Statement

The trading workflow consists of 8 tools (Market Selection, Trend Alignment, Fibonacci Setup, etc.). Users need these tools to be accessible both within the guided workflow AND as standalone utilities for quick analysis. How do we design components that serve both purposes without code duplication?

## Decision Drivers

- Tools should be reusable across different contexts (workflow, standalone pages, dashboards)
- Each tool needs to work independently with its own state/props
- Tools must integrate seamlessly into the workflow stepper
- Avoid code duplication between workflow and standalone versions
- Maintain consistent user experience across contexts

## Considered Options

1. **Standalone + Composable Pattern** - Single component with props for both modes
2. **Separate Components** - Different components for workflow vs standalone
3. **HOC Wrapper Pattern** - Base component wrapped with workflow context HOC
4. **Render Props Pattern** - Tools provide render functions, consumers handle layout

## Decision Outcome

Chosen option: "Standalone + Composable Pattern", because it maximizes code reuse while allowing each tool to function independently or within the workflow context through standardized props.

### Positive Consequences

- Single source of truth for each tool's functionality
- Tools work immediately as standalone utilities
- Easy to compose into workflow via standardized `onComplete` callback
- Reduces maintenance burden (one component to update)
- Consistent behavior across all contexts

### Negative Consequences

- Components need to handle both prop-driven and workflow-driven state
- Slightly more complex prop interface to support both modes
- Must be careful not to couple tools too tightly to workflow context

## Pros and Cons of the Options

### Standalone + Composable Pattern

```typescript
// Tool works standalone with props
<MarketTimeframeSelector
  symbol="SPX"
  onChange={(symbol) => console.log(symbol)}
/>

// Tool works in workflow with onComplete
<MarketTimeframeSelector
  symbol={state.symbol}
  onChange={(symbol) => setState({ symbol })}
  onComplete={() => nextStep()}
/>
```

- Good, because single component serves all use cases
- Good, because standardized interface (props + onComplete)
- Good, because each tool can have its own route/page
- Bad, because props interface slightly more complex

### Separate Components

- Good, because clear separation of concerns
- Bad, because code duplication
- Bad, because changes must be applied to multiple files
- Bad, because risk of behavior divergence

### HOC Wrapper Pattern

- Good, because base component stays simple
- Bad, because HOCs add complexity and are outdated pattern
- Bad, because debugging is harder with wrapper layers
- Bad, because TypeScript types become complex

### Render Props Pattern

- Good, because flexible for different layouts
- Bad, because verbose and harder to read
- Bad, because consumers must implement layout logic
- Bad, because less standardized interface

## Implementation Details

### Standardized Tool Interface

```typescript
type ToolProps<T> = {
  // Data props
  value: T;
  onChange: (value: T) => void;

  // Workflow integration (optional)
  onComplete?: () => void;
  workflowMode?: boolean;

  // Display customization (optional)
  compact?: boolean;
  showHelp?: boolean;
};
```

### Tool Component Structure

```
frontend/src/components/trading/tools/
├── MarketTimeframeSelector.tsx  # Standalone + workflow compatible
├── TrendDecisionPanel.tsx       # Standalone + workflow compatible
├── FibonacciSetupTool.tsx       # Wraps existing FibonacciCalculationPanel
├── PatternScannerTool.tsx       # Wraps SignalScanner + HarmonicScanner
├── EntrySignalTool.tsx          # New standalone tool
├── PositionSizingTool.tsx       # Wraps existing PositionSizingCalculator
├── PreTradeChecklist.tsx        # New standalone tool
└── TradeManagementPanel.tsx     # New standalone tool
```

## Links

- [Trading Workflow Stepper ADR](20251230-trading-workflow-stepper.md)
- Relates to: [Frontend Design System ADR](20251230-frontend-design-system.md)
