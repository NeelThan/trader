# Chart Pro: Visual-First Trading Workflow

- Status: accepted
- Deciders: User, Claude
- Date: 2026-01-01
- Tags: frontend, workflow, chart, ux

Technical Story: Add a chart-centric workflow as an alternative to the step-by-step trading workflow for A/B testing different user experiences.

## Context and Problem Statement

The existing trading workflow (`/workflow`) uses a step-by-step guided approach with 8 steps. While thorough, some traders prefer to see everything at once on a chart and interact visually. How can we provide an alternative chart-centric experience that maintains the same analytical rigor?

## Decision Drivers

- Some traders prefer visual/chart-first interaction over step-by-step wizards
- Need to maintain same analysis quality (Fibonacci, signals, harmonics)
- Want to enable A/B testing of user experience approaches
- Must support multi-timeframe analysis on a single view
- Should leverage existing backend endpoints (thin client architecture)
- Need confluence detection (multiple levels clustering at same price)

## Considered Options

1. **Enhance existing workflow** - Add more chart interactivity to current steps
2. **New Chart Pro page** - Separate `/chart-pro` page with chart-centric design
3. **Configurable workflow** - Single workflow that switches between step/visual modes

## Decision Outcome

Chosen option: "New Chart Pro page", because it allows independent development, A/B testing, and doesn't risk breaking the existing working workflow.

### Positive Consequences

- Clean separation of concerns - two distinct UX patterns
- Can iterate on Chart Pro without affecting stable workflow
- Users can choose preferred experience
- A/B testing possible for conversion/satisfaction metrics
- Easier to sunset one approach if clear winner emerges

### Negative Consequences

- Some code duplication (chart components, level calculations)
- Two pages to maintain
- Users might be confused by multiple entry points

## Pros and Cons of the Options

### Enhance existing workflow

- Good, because single codebase to maintain
- Good, because gradual improvement
- Bad, because hard to A/B test
- Bad, because might break existing user habits
- Bad, because step-by-step structure limits visual integration

### New Chart Pro page

- Good, because clean separation
- Good, because enables true A/B testing
- Good, because doesn't risk existing workflow
- Good, because can use different component architecture
- Bad, because some code duplication
- Bad, because two pages to maintain

### Configurable workflow

- Good, because single entry point
- Good, because user preference remembered
- Bad, because complex switching logic
- Bad, because neither mode optimized
- Bad, because hard to maintain

## Key Features

Chart Pro will include:

1. **Auto Swing Detection** - HH/HL/LH/LL labels on chart pivots
2. **Indicator Panes** - RSI, MACD below price chart (toggleable)
3. **Multi-Strategy Levels** - Fibonacci, Harmonics, Signals across timeframes
4. **Rich Labels** - `[TF] [Price] [Type] [Dir]` on each level line
5. **Per-Level Visibility** - Toggle individual levels on/off
6. **Theme System** - Distinct (colors by TF), Simple (blue/red only), Custom
7. **Levels Table** - Sortable/filterable table with Heat scores
8. **Confluence Heatmap** - Overlay zones where levels cluster
9. **Monitor Zones** - Watch price zones for alerts
10. **Trade Creation** - Create trades from monitored zones

## Architecture

- Follows thin client architecture (ADR-20251230)
- All calculations done by backend APIs
- Frontend handles display, user interaction, and state management
- Uses existing endpoints: `/pivot/detect`, `/fibonacci/*`, `/signal/detect`, `/harmonic/*`
- New endpoint: `/indicators/macd` for technical indicators

## Links

- Supersedes: None (new feature)
- Related: [ADR-20251230 Thin Client Architecture](20251230-thin-client-architecture.md)
- Related: [ADR-20251230 Trading Workflow Stepper](20251230-trading-workflow-stepper.md)
