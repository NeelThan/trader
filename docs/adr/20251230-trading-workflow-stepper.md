# Trading Workflow Stepper Architecture

- Status: accepted
- Deciders: Development team
- Date: 2025-12-30
- Tags: frontend, workflow, trading, UX

Technical Story: Implement a guided trading workflow based on SignalPro methodology

## Context and Problem Statement

Traders need a systematic approach to execute trades following the SignalPro Fibonacci methodology. The process involves 8 distinct phases from market analysis to trade management. How do we guide users through this process while maintaining flexibility?

## Decision Drivers

- Traders need step-by-step guidance to avoid missing critical analysis steps
- The methodology requires sequential validation (e.g., trend alignment before entry)
- Users should be able to resume partially completed workflows
- Individual tools should be accessible outside the workflow for quick analysis
- The workflow must enforce validation rules (e.g., block if STAND_ASIDE)

## Considered Options

1. **Stepper Workflow** - Linear wizard-style interface with 8 steps
2. **Single Page Dashboard** - All tools visible at once with collapsible sections
3. **Multi-Page Flow** - Separate pages for each phase, linked together
4. **Tab-Based Interface** - Tabs for each phase (similar to existing AnalysisTabs)

## Decision Outcome

Chosen option: "Stepper Workflow", because it provides clear guidance through the trading process, enforces sequential validation, and matches the mental model of the SignalPro methodology phases.

### Positive Consequences

- Clear visual progress indication shows where user is in the process
- Sequential validation prevents skipping critical steps
- State persists between sessions allowing workflow resumption
- Each step can focus on one concern without overwhelming the user
- Matches the documented 7-step trading process from the methodology

### Negative Consequences

- More clicks required compared to single-page approach
- Requires state management for workflow progress
- Users may feel constrained if they want to jump between steps

## Pros and Cons of the Options

### Stepper Workflow

- Good, because it provides clear guidance through complex process
- Good, because it can enforce validation between steps
- Good, because it matches the methodology's phase structure
- Good, because it allows focused UI for each step
- Bad, because requires more navigation clicks
- Bad, because needs workflow state management

### Single Page Dashboard

- Good, because all information visible at once
- Good, because minimal navigation required
- Bad, because overwhelming with too much information
- Bad, because difficult to enforce step sequence
- Bad, because doesn't guide inexperienced users

### Multi-Page Flow

- Good, because familiar web navigation pattern
- Bad, because loses context when navigating
- Bad, because complex URL/state management
- Bad, because not clear how far along user is

### Tab-Based Interface

- Good, because already used elsewhere in app (AnalysisTabs)
- Good, because fast switching between sections
- Bad, because doesn't enforce sequence
- Bad, because tabs don't visually show progress

## Links

- [SignalPro Trading Methodology](../references/fibonacci_strategy_knowledge.md)
- [Application Specification](../references/fibonacci_trading_app_specification.md)
