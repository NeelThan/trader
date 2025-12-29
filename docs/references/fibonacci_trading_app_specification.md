# Fibonacci Trading Application - Complete Specification

**Document Version:** 1.0  
**Created:** December 2025  
**Based on:** SignalPro Professional Fibonacci Workshop by Sandy Jadeja  
**Status:** Planning Phase

---

## Table of Contents

- [1. Executive Summary](#1-executive-summary)
- [2. Core Strategy Principles](#2-core-strategy-principles)
- [3. Complete Feature List](#3-complete-feature-list)
- [4. User Story Map](#4-user-story-map)
- [5. Walking Skeleton](#5-walking-skeleton)
- [6. MVP (Minimum Viable Product)](#6-mvp-minimum-viable-product)
- [7. Release 1: Enhanced Analysis](#7-release-1-enhanced-analysis)
- [8. Release 2: Pattern Recognition](#8-release-2-pattern-recognition)
- [9. Release 3: Advanced Patterns & Automation](#9-release-3-advanced-patterns--automation)
- [10. Release 4: Platform & Ecosystem](#10-release-4-platform--ecosystem)
- [11. Release Roadmap Summary](#11-release-roadmap-summary)
- [12. Technical Reference](#12-technical-reference)
- [Appendix A: Fibonacci Ratio Reference](#appendix-a-fibonacci-ratio-reference)
- [Appendix B: Pattern Specifications](#appendix-b-pattern-specifications)

---

## 1. Executive Summary

### 1.1 Vision

Build a comprehensive trading analysis application that implements the SignalPro Fibonacci strategy, enabling traders to:

- Identify high-probability trade setups using Fibonacci price tools
- Detect harmonic patterns (Gartley 222 and Butterfly)
- Manage risk through systematic position sizing
- Execute a disciplined trading workflow

### 1.2 Target Users

| User Type | Description | Key Needs |
|-----------|-------------|-----------|
| Position Trader | Holds trades for weeks/months | Weekly/Daily analysis, larger moves |
| Swing Trader | Holds trades for days/weeks | Daily/4H analysis, swing detection |
| Day Trader | Intraday trading | 4H/1H/15M analysis, quick signals |
| Scalper | Very short-term | 15M/5M/1M analysis, rapid execution |

### 1.3 Core Value Proposition

1. **Automated Fibonacci Analysis** - Calculate all four Fibonacci tools automatically
2. **Pattern Recognition** - Detect Gartley 222 and Butterfly patterns
3. **Signal Validation** - Confirm entries with signal bar detection
4. **Risk Management** - Systematic position sizing and trade management
5. **Workflow Guidance** - Step-by-step trading process

---

## 2. Core Strategy Principles

### 2.1 Multi-Timeframe Trend Alignment

The foundation of the strategy is trading in alignment with the higher timeframe trend.

#### Configurable Timeframe Pairs

| Higher Timeframe | Lower Timeframe | Trading Style |
|------------------|-----------------|---------------|
| Monthly | Weekly | Position Trading |
| Weekly | Daily | Position/Swing Trading |
| Daily | 4-Hour | Swing Trading |
| 4-Hour | 1-Hour | Day Trading |
| 1-Hour | 15-Minute | Day Trading |
| 15-Minute | 5-Minute | Scalping |

#### Trend Alignment Rules

| Higher TF Trend | Lower TF Trend | Action | Rationale |
|-----------------|----------------|--------|-----------|
| UP | DOWN | **GO LONG** | Buy the dip in uptrend |
| DOWN | UP | **GO SHORT** | Sell the rally in downtrend |
| UP | UP | STAND ASIDE | Wait for pullback |
| DOWN | DOWN | STAND ASIDE | Wait for bounce |

### 2.2 The Four Fibonacci Price Tools

| Tool | Pivots Required | Forecast From | Key Levels | Use Case |
|------|-----------------|---------------|------------|----------|
| **Retracement** | 2 (A, X) | Within range | 38%, 50%, 62%, 79% | Entry on pullback |
| **Extension** | 2 (A, X) | A (origin) | 127%, 162%, 262% | Target beyond origin |
| **Projection** | 3 (A, B, C) | C (current pivot) | 62%, 79%, 100%, 127%, 162% | Swing projection |
| **Expansion** | 2 (A, B) | B (end of swing) | 38%, 50%, 62%, 100%, 162% | Range expansion |

### 2.3 Signal Bar Confirmation

#### BUY Signal Requirements
1. Price reaches Fibonacci level
2. Bar closes **above** opening price
3. Bar closes **above** Fibonacci level

#### SELL Signal Requirements
1. Price reaches Fibonacci level
2. Bar closes **below** opening price
3. Bar closes **below** Fibonacci level

#### Signal Types
- **Type 1 (Stronger):** Price tests level, gets rejected, closes beyond
- **Type 2 (Moderate):** Price closes beyond level without deep test

### 2.4 Position Sizing Formula

```
Position Size = Risk Capital ÷ (Entry Price - Stop Loss Price)
```

### 2.5 The 7-Step Trading Process

1. **Look for pattern** - Identify Fibonacci setup or harmonic pattern
2. **Wait for reversal signal bar** - Confirm with signal bar
3. **Calculate entry to stop distance** - Measure risk in points
4. **Divide risk capital by distance** - Calculate position size
5. **Enter trade with stop order** - Execute with protection
6. **Aim for free trade** - Move stop to breakeven when profitable
7. **Exit at target or trail stop** - Manage to completion

---

## 3. Complete Feature List

### F1. Market & Instrument Management

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F1.1 | Instrument Library | Database of tradeable instruments with metadata | MVP |
| F1.2 | Instrument Search | Search/filter instruments by name, symbol, type | R1 |
| F1.3 | Watchlist Management | Create, edit, delete custom watchlists | MVP |
| F1.4 | Market Categories | Classify as Slow/Moderate/Aggressive growth | R2 |
| F1.5 | Instrument Properties | Store spread, margin, tick size, trading hours | R1 |
| F1.6 | Favourite Instruments | Quick access to frequently traded instruments | R1 |
| F1.7 | Market Status Indicator | Display OPEN/CLOSED/PRE-MARKET/AFTER-HOURS | MVP |
| F1.8 | Trading Hours Configuration | Define market hours per instrument/exchange | R2 |

### F2. Price Data & Charts

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F2.1 | Real-Time Price Feed | Live price updates for monitored instruments | MVP |
| F2.2 | Historical Data Access | OHLC data across all timeframes | MVP |
| F2.3 | Multi-Timeframe Support | 1m, 5m, 15m, 1H, 4H, Daily, Weekly, Monthly | MVP |
| F2.4 | Custom Timeframes | User-defined timeframe intervals | R3 |
| F2.5 | Basic Charting | Candlestick/bar chart display | MVP |
| F2.6 | Chart Zoom/Pan | Navigate through price history | R1 |
| F2.7 | Chart Annotations | Draw lines, text, shapes on charts | R1 |
| F2.8 | Multi-Chart Layout | View multiple instruments/timeframes | R2 |
| F2.9 | Chart Templates | Save and load chart configurations | R2 |
| F2.10 | Price Alerts | Notify when price reaches specific level | R2 |

### F3. Timeframe & Trend Analysis

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F3.1 | Timeframe Pair Configuration | Define higher/lower timeframe combinations | MVP |
| F3.2 | Timeframe Presets | Pre-built pairs for position/swing/day/scalp | MVP |
| F3.3 | Custom Timeframe Pairs | User-defined timeframe relationships | R1 |
| F3.4 | Trend Direction Detection | Algorithmic UP/DOWN trend identification | MVP |
| F3.5 | Trend Detection Parameters | Configure sensitivity/lookback for trend detection | R1 |
| F3.6 | Trend Alignment Matrix | Visual grid showing alignment across pairs | MVP |
| F3.7 | Trade Direction Advisor | Recommend LONG/SHORT/STAND ASIDE | MVP |
| F3.8 | Multi-Pair Monitoring | Track multiple timeframe pairs simultaneously | R1 |
| F3.9 | Timeframe Cascade View | Nested view across 3+ timeframes | R1 |
| F3.10 | Trend Confluence Detector | Identify when multiple pairs align | R1 |
| F3.11 | Trend Change Alerts | Notify when trend direction changes | R2 |
| F3.12 | Historical Trend Analysis | Review past trend alignment accuracy | R2 |

### F4. Pivot Point Detection

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F4.1 | Pivot High Detection | Identify bars with higher highs than neighbours | MVP |
| F4.2 | Pivot Low Detection | Identify bars with lower lows than neighbours | MVP |
| F4.3 | Pivot Confirmation Rules | Configure confirmation bar requirements | R1 |
| F4.4 | Multi-Timeframe Pivots | Detect pivots across all timeframes | MVP |
| F4.5 | Pivot Strength Rating | Score significance based on timeframe | R1 |
| F4.6 | Pivot Labelling | Auto-label as X, A, B, C, D points | MVP |
| F4.7 | Manual Pivot Override | User can manually mark/adjust pivots | R1 |
| F4.8 | Pivot History | Store significant historical pivots | R2 |
| F4.9 | Pivot Overlay | Display pivots on chart | MVP |
| F4.10 | Swing Structure Mapping | Connect pivots to show swing structure | R1 |
| F4.11 | Pivot Age Indicator | Show how recently pivot formed | R2 |
| F4.12 | Pivot Invalidation | Detect when pivot is broken/invalidated | R1 |

### F5. Fibonacci Calculations

#### Retracements

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F5.1 | Retracement Calculator | Calculate 38%, 50%, 62%, 79% levels | MVP |
| F5.2 | BUY Retracement Formula | Level = High - (Range × Ratio) | MVP |
| F5.3 | SELL Retracement Formula | Level = Low + (Range × Ratio) | MVP |
| F5.4 | Custom Retracement Ratios | Add/remove ratio levels | MVP |
| F5.5 | Retracement Visualisation | Draw levels on chart | MVP |

#### Extensions

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F5.6 | Extension Calculator | Calculate 127%, 162%, 262% levels | MVP |
| F5.7 | BUY Extension Formula | Target below origin point | MVP |
| F5.8 | SELL Extension Formula | Target above origin point | MVP |
| F5.9 | Custom Extension Ratios | Add/remove ratio levels | MVP |
| F5.10 | Extension Visualisation | Draw levels on chart | MVP |

#### Projections

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F5.11 | Projection Calculator | 3-point calculation (A, B, C → D) | MVP |
| F5.12 | Swing Measurement | Measure A→B swing distance | MVP |
| F5.13 | Projection Levels | Calculate 62%, 79%, 100%, 127%, 162% | MVP |
| F5.14 | AB=CD Pattern Check | Verify swing equality | MVP |
| F5.15 | Projection Visualisation | Draw projected levels on chart | MVP |

#### Expansions

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F5.16 | Expansion Calculator | Calculate from pivot B | MVP |
| F5.17 | Expansion Levels | 38%, 50%, 62%, 100%, 162% | MVP |
| F5.18 | Expansion vs Extension Clarity | Visual distinction between tools | MVP |
| F5.19 | Expansion Visualisation | Draw levels on chart | MVP |

#### Tool Selection

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F5.20 | Smart Tool Recommender | Suggest tool based on pivot count/goal | R1 |
| F5.21 | Tool Selection Decision Tree | Interactive guide | R1 |
| F5.22 | Multi-Tool Overlay | Display multiple Fibonacci tools | MVP |
| F5.23 | Level Confluence Zones | Highlight where levels cluster | R1 |
| F5.24 | Calculation Breakdown | Show step-by-step workings | R1 |

### F6. Harmonic Pattern Detection

#### Pattern Structure

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F6.1 | XABCD Structure Detection | Identify 5-point pattern formations | R2 |
| F6.2 | Pattern Point Labelling | Auto-label X, A, B, C, D | R2 |
| F6.3 | Pattern Visualisation | Draw pattern structure on chart | R2 |
| F6.4 | Incomplete Pattern Detection | Identify forming patterns | R2 |
| F6.5 | Pattern Completion Zone | Calculate where D should complete | R2 |

#### Gartley 222

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F6.6 | Gartley Scanner | Scan for valid Gartley patterns | R2 |
| F6.7 | Gartley Ratio Validation | Verify B, C, D ratios within tolerance | R2 |
| F6.8 | AB=CD Internal Validation | Confirm internal structure | R2 |
| F6.9 | C-Within-A Validation | Ensure C stays within A's range | R2 |
| F6.10 | Bullish Gartley Detection | BUY setup identification | R2 |
| F6.11 | Bearish Gartley Detection | SELL setup identification | R2 |
| F6.12 | Gartley Quality Score | Rate pattern validity | R2 |

#### Butterfly

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F6.13 | Butterfly Scanner | Scan for valid Butterfly patterns | R3 |
| F6.14 | Butterfly Ratio Validation | Verify extension ratios | R3 |
| F6.15 | D Beyond X Validation | Confirm D extends past X | R3 |
| F6.16 | BD Ratio Check | Verify BD = 127-162% | R3 |
| F6.17 | Bullish Butterfly Detection | BUY setup identification | R3 |
| F6.18 | Bearish Butterfly Detection | SELL setup identification | R3 |
| F6.19 | Butterfly Quality Score | Rate pattern validity | R3 |
| F6.20 | Butterfly R:R Calculator | Highlight superior risk/reward | R3 |

#### Pattern Management

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F6.21 | Gartley vs Butterfly Classifier | Auto-distinguish patterns | R3 |
| F6.22 | Pattern Ratio Tolerance | Configure acceptable variance | R2 |
| F6.23 | Pattern Alerts | Notify on pattern completion | R2 |
| F6.24 | Pattern History | Track past pattern performance | R3 |
| F6.25 | Failed Pattern Analysis | Review invalidated patterns | R3 |

### F7. Signal Bar Detection

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F7.1 | BUY Signal Detection | Close > Open AND Close > Fib Level | MVP |
| F7.2 | SELL Signal Detection | Close < Open AND Close < Fib Level | MVP |
| F7.3 | Type 1 Signal Detection | Level tested and rejected (stronger) | R1 |
| F7.4 | Type 2 Signal Detection | Close beyond without deep test | R1 |
| F7.5 | Signal Strength Rating | Score signal quality | MVP |
| F7.6 | Signal Bar Highlighting | Mark valid signals on chart | MVP |
| F7.7 | Real-Time Signal Monitoring | Watch for signals as bars close | R1 |
| F7.8 | Signal Formation Alert | Notify when signal bar closes | MVP |
| F7.9 | Level Approach Alert | Notify when price nears level | R1 |
| F7.10 | Signal Confirmation Checklist | Interactive verification | R2 |
| F7.11 | False Signal Filter | Configurable filters to reduce noise | R1 |
| F7.12 | Signal History Log | Track all detected signals | R2 |

### F8. Position Sizing & Risk Management

#### Position Sizing

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F8.1 | Position Size Calculator | Size = Risk Capital ÷ Distance to Stop | MVP |
| F8.2 | Risk Capital Input | Set fixed risk amount per trade | MVP |
| F8.3 | Percentage Risk Mode | Risk as % of account balance | R2 |
| F8.4 | Account Balance Tracking | Monitor account equity | R2 |
| F8.5 | Points-to-Stop Calculator | Auto-calculate entry to stop distance | MVP |
| F8.6 | Currency Converter | Display risk in account currency | R1 |
| F8.7 | Position Size Limits | Maximum position cap | R2 |
| F8.8 | Stake Adjuster | Reduce size if risk too high | R3 |

#### Stop Loss

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F8.9 | Auto Stop Suggestion | Place beyond swing high/low | MVP |
| F8.10 | Gartley Stop Placement | Stop beyond X point | R1 |
| F8.11 | Butterfly Stop Placement | Tight stop just beyond D | R3 |
| F8.12 | Manual Stop Override | User-defined stop level | MVP |
| F8.13 | Stop Distance Warning | Alert if stop too tight/wide | R1 |
| F8.14 | Stop in Points/Pips/Ticks | Display in various units | R3 |

#### Risk Assessment

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F8.15 | Go/No-Go Decision Engine | Recommend trade or skip | MVP |
| F8.16 | Risk/Reward Calculator | Calculate R:R ratio | MVP |
| F8.17 | Minimum R:R Filter | Skip trades below threshold | R1 |
| F8.18 | Daily Risk Limit | Cap total daily exposure | R2 |
| F8.19 | Correlation Risk Warning | Alert on correlated positions | R3 |

### F9. Trade Execution & Management

#### Order Entry

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F9.1 | Entry Order Placement | Execute trades (manual or via broker API) | R3 |
| F9.2 | Order Type Selection | Market, Limit, Stop orders | R3 |
| F9.3 | Stop Loss Order | Automatic SL attachment | R3 |
| F9.4 | Take Profit Order | Automatic TP attachment | R3 |
| F9.5 | OCO Orders | One-cancels-other order pairs | R3 |
| F9.6 | Order Confirmation | Review before submission | R3 |
| F9.7 | Paper Trading Mode | Simulated execution | R2 |

#### Free Trade Management

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F9.8 | Breakeven Calculator | Calculate when to move stop | MVP |
| F9.9 | Free Trade Alert | Notify when price = risk amount | MVP |
| F9.10 | Auto-Breakeven Option | Automatically move stop to entry | R2 |
| F9.11 | Partial Close at Breakeven | Option to take partial profits | R2 |

#### Target Management

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F9.12 | Multi-Target Display | Show all extension targets | MVP |
| F9.13 | Target Achievement Tracker | Monitor progress to targets | R1 |
| F9.14 | Partial Profit Calculator | Scale-out suggestions | R2 |
| F9.15 | Target Hit Alert | Notify when target reached | R2 |

#### Trailing Stop

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F9.16 | Manual Trailing | User-controlled stop adjustment | R1 |
| F9.17 | Auto-Trail by Swing | Trail to swing high/lows | R3 |
| F9.18 | Auto-Trail by ATR | Trail by volatility measure | R3 |
| F9.19 | Trail Step Configuration | Configure trailing increment | R3 |

#### Trade Monitoring

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F9.20 | Open Position Dashboard | View all active trades | MVP |
| F9.21 | P&L Tracking | Real-time profit/loss | MVP |
| F9.22 | Trade Duration Monitor | Time in trade | R1 |
| F9.23 | Slow Trade Warning | Alert if trade taking too long | R2 |
| F9.24 | Manual Early Exit | Close trade before target/stop | R3 |

### F10. Trade Workflow & Checklists

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F10.1 | 7-Step Workflow Engine | Guided trading process | R1 |
| F10.2 | Step 1: Pattern Detection | Scan for setups | R1 |
| F10.3 | Step 2: Signal Waiting | Monitor for confirmation | R1 |
| F10.4 | Step 3: Distance Calculation | Entry to stop measurement | R1 |
| F10.5 | Step 4: Size Calculation | Position sizing | R1 |
| F10.6 | Step 5: Order Entry | Execute with stops | R1 |
| F10.7 | Step 6: Free Trade Monitor | Move to breakeven | R1 |
| F10.8 | Step 7: Exit Management | Target or trail | R1 |
| F10.9 | Pre-Trade Checklist | Interactive verification | MVP |
| F10.10 | Entry Criteria Validation | Confirm all conditions met | MVP |
| F10.11 | Checklist Templates | Customisable checklists | R1 |
| F10.12 | Checklist History | Review past trade decisions | R1 |
| F10.13 | Workflow State Tracking | Track progress through steps | R1 |
| F10.14 | Workflow Notifications | Prompt for next action | R1 |

### F11. Alerts & Notifications

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F11.1 | Alert Configuration | Set up custom alerts | R1 |
| F11.2 | Price Level Alerts | Trigger at specific prices | R1 |
| F11.3 | Fibonacci Level Alerts | Trigger near Fib levels | R1 |
| F11.4 | Signal Bar Alerts | Trigger on valid signals | R2 |
| F11.5 | Pattern Completion Alerts | Trigger when pattern completes | R2 |
| F11.6 | Trend Change Alerts | Trigger on trend direction change | R3 |
| F11.7 | Risk Limit Alerts | Trigger when approaching limits | R3 |
| F11.8 | Notification Channels | In-app, email, push, SMS | R1 |
| F11.9 | Alert Priority Levels | Critical, important, informational | R2 |
| F11.10 | Alert Scheduling | Only during specified hours | R2 |
| F11.11 | Alert Snooze | Temporarily silence alerts | R3 |
| F11.12 | Alert History | Log of triggered alerts | R2 |

### F12. Dashboard & Visualisation

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F12.1 | Main Dashboard | Overview of all activity | MVP |
| F12.2 | Active Signals Panel | Current actionable setups | MVP |
| F12.3 | Watchlist Overview | Quick status of watched instruments | R3 |
| F12.4 | Trend Alignment Summary | All timeframe pair statuses | MVP |
| F12.5 | Open Positions Panel | Current trades and P&L | MVP |
| F12.6 | Pending Setups Panel | Patterns/levels waiting for signal | R2 |
| F12.7 | Recent Alerts Panel | Latest notifications | R2 |
| F12.8 | Performance Summary | Win rate, P&L statistics | R3 |
| F12.9 | Dashboard Customisation | Add/remove/resize panels | R2 |
| F12.10 | Dashboard Presets | Save/load layouts | R3 |
| F12.11 | Dark/Light Theme | Visual theme options | R3 |
| F12.12 | Responsive Design | Desktop, tablet, mobile views | R3 |

### F13. Trade Journal & Analytics

#### Trade Logging

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F13.1 | Auto Trade Logging | Record all trade details | MVP |
| F13.2 | Manual Trade Entry | Add trades from other platforms | R3 |
| F13.3 | Trade Notes | Add comments/observations | R1 |
| F13.4 | Screenshot Attachment | Attach chart images to trades | R2 |
| F13.5 | Trade Tags | Categorise trades (pattern type, etc.) | R1 |

#### Performance Analytics

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F13.6 | Win/Loss Statistics | Overall success rate | MVP |
| F13.7 | P&L Summary | Total profit/loss | MVP |
| F13.8 | Average Win/Loss | Mean trade outcomes | R2 |
| F13.9 | Risk/Reward Achieved | Actual R:R vs planned | R2 |
| F13.10 | Performance by Pattern | Stats per pattern type | R1 |
| F13.11 | Performance by Timeframe | Stats per timeframe pair | R2 |
| F13.12 | Performance by Instrument | Stats per market | R2 |
| F13.13 | Equity Curve | Visual P&L over time | R2 |
| F13.14 | Drawdown Analysis | Maximum drawdown tracking | R3 |

#### Review & Learning

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F13.15 | Trade Review Interface | Analyse past trades | R3 |
| F13.16 | Mistake Categorisation | Tag errors for learning | R3 |
| F13.17 | Pattern Performance Report | Which patterns work best | R3 |
| F13.18 | Weekly/Monthly Reports | Periodic summaries | R3 |
| F13.19 | Export Reports | PDF, CSV export | R3 |

### F14. Educational & Reference

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F14.1 | Knowledge Base | Built-in strategy documentation | R2 |
| F14.2 | Ratio Reference Table | All Fibonacci ratios | R2 |
| F14.3 | Formula Reference | All calculation formulas | R2 |
| F14.4 | Pattern Diagrams | Visual pattern reference | R2 |
| F14.5 | Tool Selection Guide | Interactive decision tree | R2 |
| F14.6 | Contextual Help | Tooltips and explanations | R3 |
| F14.7 | "Why This Level?" | Explain any displayed level | R3 |
| F14.8 | Video Tutorials | Embedded learning content | R3 |
| F14.9 | Calculation Practice Mode | Verify manual calculations | R2 |
| F14.10 | Pattern Quiz | Test pattern identification | R2 |
| F14.11 | Glossary | Trading term definitions | R3 |

### F15. Settings & Configuration

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F15.1 | User Profile | Account settings | R3 |
| F15.2 | Risk Parameters | Default risk settings | R3 |
| F15.3 | Fibonacci Ratio Configuration | Customise ratio levels | R3 |
| F15.4 | Pattern Tolerance Settings | Ratio variance allowances | R3 |
| F15.5 | Timeframe Preferences | Default timeframe pairs | R3 |
| F15.6 | Alert Preferences | Notification settings | R3 |
| F15.7 | Display Preferences | Chart and UI settings | R3 |
| F15.8 | Broker Integration | API connections | R3 |
| F15.9 | Data Source Selection | Price feed configuration | R3 |
| F15.10 | Backup & Restore | Export/import settings | R3 |
| F15.11 | Keyboard Shortcuts | Customisable hotkeys | R3 |

### F16. Integration & Data

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F16.1 | Broker API Integration | Connect to trading platforms | R3 |
| F16.2 | Data Provider Integration | Price feed connections | R3 |
| F16.3 | TradingView Export | Export indicators to TradingView | R3 |
| F16.4 | CSV Import/Export | Data portability | R3 |
| F16.5 | API for External Tools | Expose data via API | R4 |
| F16.6 | Webhook Support | Send alerts to external services | R4 |
| F16.7 | Mobile Companion | iOS/Android app | R4 |

---

## 4. User Story Map

### 4.1 User Activities (Backbone)

```
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│   Setup &   │   Analyse   │  Identify   │  Validate   │    Size     │   Execute   │   Manage    │  Review &   │
│  Configure  │   Markets   │   Setups    │   Entry     │  Position   │   Trade     │   Trade     │   Learn     │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

### 4.2 Story Map Breakdown

```
SETUP & CONFIGURE
├── Walking Skeleton: Add instrument to watchlist
├── MVP: Configure timeframe pairs
├── Release 1: Watchlist management
├── Release 2: Market categories
└── Release 3: Broker integration

ANALYSE MARKETS
├── Walking Skeleton: View price chart
├── MVP: View trend alignment
├── Release 1: Multi-TF trend detection
├── Release 2: Trend alerts
└── Release 3: Multi-chart layout

IDENTIFY SETUPS
├── Walking Skeleton: Detect pivots manually
├── Walking Skeleton: Calculate retracement
├── MVP: Auto-detect pivots
├── MVP: Calculate all 4 Fib tools
├── Release 1: Level confluence
├── Release 2: Gartley scanner
└── Release 3: Butterfly scanner

VALIDATE ENTRY
├── Walking Skeleton: Check signal bar rules
├── MVP: Auto-detect signal bars
├── Release 1: Signal strength rating
├── Release 2: Pattern alerts
└── Release 3: Pattern quality score

SIZE POSITION
├── Walking Skeleton: Calculate position size
├── MVP: Risk/reward calculator
├── Release 1: Go/no-go decision
├── Release 2: Daily risk limits
└── Release 3: Correlation warnings

EXECUTE TRADE
├── Walking Skeleton: Log trade manually
├── MVP: Entry checklist
├── Release 1: 7-step workflow
├── Release 2: Paper trading
└── Release 3: Order execution

MANAGE TRADE
├── Walking Skeleton: Move stop to breakeven
├── MVP: Free trade alerts
├── Release 1: Trailing stop
├── Release 2: Auto breakeven
└── Release 3: Auto trailing

REVIEW & LEARN
├── Walking Skeleton: View trade history
├── MVP: Basic statistics
├── Release 1: Performance by pattern
├── Release 2: Equity curve
└── Release 3: Advanced analytics
```

---

## 5. Walking Skeleton

### 5.1 Goal

Prove the technical architecture end-to-end with minimal functionality. A user can complete one full trading workflow manually.

### 5.2 Features Included

| ID | Feature | User Story |
|----|---------|------------|
| WS-1 | Basic Instrument Entry | As a trader, I can add an instrument by symbol so I can track it |
| WS-2 | Price Data Display | As a trader, I can view current price and basic OHLC chart |
| WS-3 | Manual Pivot Marking | As a trader, I can click to mark pivot highs and lows on the chart |
| WS-4 | Retracement Calculator | As a trader, I can select two pivots and see retracement levels (38%, 50%, 62%, 79%) |
| WS-5 | Level Display | As a trader, I can see calculated levels drawn on the chart |
| WS-6 | Signal Bar Checklist | As a trader, I can manually verify signal bar criteria via checklist |
| WS-7 | Position Size Calculator | As a trader, I can enter risk capital and stop distance to get position size |
| WS-8 | Manual Trade Log | As a trader, I can record a trade with entry, stop, target, and result |
| WS-9 | Trade List View | As a trader, I can see a list of my logged trades |
| WS-10 | Basic P&L Display | As a trader, I can see total profit/loss from logged trades |

### 5.3 Technical Architecture Validated

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   React UI  │  │    Chart    │  │    Input    │             │
│  │             │  │  Component  │  │    Forms    │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
└─────────┼────────────────┼────────────────┼────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  API Layer  │  │ Calculation │  │ Data Store  │             │
│  │             │  │   Engine    │  │             │             │
│  └──────┬──────┘  └─────────────┘  └─────────────┘             │
└─────────┼───────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                        EXTERNAL                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Price Data API                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 Acceptance Criteria

- [ ] User can add instrument and see live price
- [ ] User can view candlestick chart with historical data
- [ ] User can mark two points and see retracement levels calculated
- [ ] User can calculate position size from inputs
- [ ] User can log a trade and see it in history
- [ ] System persists data between sessions

### 5.5 Duration

**Estimated:** 4 weeks

---

## 6. MVP (Minimum Viable Product)

### 6.1 Goal

Deliver core value - automated Fibonacci analysis with signal detection. A trader can identify and validate setups without manual calculation.

### 6.2 Features by Category

| Category | Feature IDs | Description |
|----------|-------------|-------------|
| Instrument Management | F1.1, F1.3, F1.7 | Manage watchlists, see market status |
| Price Data | F2.1, F2.2, F2.3, F2.5 | Real-time data, multi-timeframe charts |
| Trend Analysis | F3.1, F3.2, F3.4, F3.6, F3.7 | Configure timeframe pairs, see trend alignment |
| Pivot Detection | F4.1, F4.2, F4.4, F4.6, F4.9 | Auto-detect pivots across timeframes |
| Fibonacci Tools | F5.1-F5.19, F5.22 | All 4 Fibonacci tools with visualisation |
| Signal Detection | F7.1, F7.2, F7.5, F7.6, F7.8 | Auto-detect and classify signal bars |
| Position Sizing | F8.1, F8.2, F8.5, F8.9, F8.12, F8.15, F8.16 | Calculate size, suggest stops, R:R |
| Trade Workflow | F10.9, F10.10 | Pre-trade checklist with validation |
| Trade Management | F9.8, F9.9, F9.12, F9.20, F9.21 | Free trade alerts, target display |
| Trade Journal | F13.1, F13.6, F13.7 | Auto-log trades, basic statistics |
| Dashboard | F12.1, F12.2, F12.4, F12.5 | Main dashboard with key panels |

### 6.3 User Stories

#### EPIC: Market Analysis

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-1 | As a trader, I can configure my preferred timeframe pairs (e.g., Daily/4H) | Can select from presets or create custom pairs |
| US-2 | As a trader, I can see the trend direction for each timeframe | UP/DOWN indicator for each configured timeframe |
| US-3 | As a trader, I can see the alignment matrix showing trade direction | Visual grid showing all pair alignments |
| US-4 | As a trader, I receive LONG/SHORT/STAND ASIDE recommendations | Clear recommendation based on alignment rules |

#### EPIC: Fibonacci Analysis

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-5 | As a trader, I can see auto-detected pivot highs and lows | Pivots marked on chart with >90% accuracy |
| US-6 | As a trader, I can see retracement levels calculated automatically | 38%, 50%, 62%, 79% levels displayed |
| US-7 | As a trader, I can see extension levels for profit targets | 127%, 162%, 262% levels displayed |
| US-8 | As a trader, I can see projection levels from 3-point swings | Levels projected from pivot C |
| US-9 | As a trader, I can see expansion levels from swing endpoints | Levels expanded from pivot B |
| US-10 | As a trader, I can see where multiple Fibonacci levels cluster | Confluence zones highlighted |

#### EPIC: Signal Detection

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-11 | As a trader, I am notified when price approaches a Fibonacci level | Alert triggered within configurable distance |
| US-12 | As a trader, I can see when a valid BUY signal bar forms | Signal highlighted when criteria met |
| US-13 | As a trader, I can see when a valid SELL signal bar forms | Signal highlighted when criteria met |
| US-14 | As a trader, I can see signal strength rating | Type 1/2 classification displayed |
| US-15 | As a trader, I can verify entry criteria via checklist | Interactive checklist with validation |

#### EPIC: Risk Management

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-16 | As a trader, I can set my risk capital per trade | Input field for risk amount |
| US-17 | As a trader, I can see the calculated position size | Auto-calculated from risk and stop |
| US-18 | As a trader, I can see suggested stop loss placement | Stop suggested beyond swing high/low |
| US-19 | As a trader, I can see the risk/reward ratio before entry | R:R displayed with target levels |
| US-20 | As a trader, I get a GO/NO-GO recommendation | Clear recommendation based on R:R |

#### EPIC: Trade Management

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-21 | As a trader, I can log my trade entry | Entry recorded with all details |
| US-22 | As a trader, I am alerted when to move stop to breakeven | Alert when price moves equal to risk |
| US-23 | As a trader, I can see my open positions and P&L | Dashboard panel with live P&L |
| US-24 | As a trader, I can see my extension targets on the chart | Target levels drawn on chart |
| US-25 | As a trader, I can log my trade exit and result | Exit recorded, P&L calculated |

#### EPIC: Dashboard

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-26 | As a trader, I can see all active signals on one screen | Signals panel on dashboard |
| US-27 | As a trader, I can see trend alignment for my watchlist | Alignment summary panel |
| US-28 | As a trader, I can see my win rate and total P&L | Statistics panel on dashboard |
| US-29 | As a trader, I can quickly navigate to any setup | Click-through from signals to chart |

### 6.4 Acceptance Criteria

- [ ] Trend alignment works across configurable timeframe pairs
- [ ] Pivots auto-detected with >90% accuracy vs manual
- [ ] All 4 Fibonacci tools calculate correctly
- [ ] Signal bars detected within 1 bar of manual identification
- [ ] Position sizing matches manual calculation
- [ ] Dashboard loads in <3 seconds
- [ ] Trade journal captures all required fields

### 6.5 Duration

**Estimated:** 8 weeks

---

## 7. Release 1: Enhanced Analysis

### 7.1 Goal

Improve analysis accuracy and workflow efficiency. Reduce manual steps and add confluence detection.

### 7.2 Features Added

| Category | Feature IDs | Value |
|----------|-------------|-------|
| Instrument Management | F1.2, F1.5, F1.6 | Better instrument organisation |
| Charts | F2.6, F2.7 | Chart navigation and annotation |
| Trend Analysis | F3.3, F3.5, F3.8, F3.9, F3.10 | Custom timeframes, multi-pair monitoring |
| Pivot Detection | F4.3, F4.5, F4.7, F4.10, F4.12 | Configurable rules, strength rating |
| Fibonacci Tools | F5.20, F5.21, F5.23, F5.24 | Smart tool selection, confluence zones |
| Signal Detection | F7.3, F7.4, F7.7, F7.9, F7.11 | Type 1/2 classification, real-time monitoring |
| Position Sizing | F8.6, F8.10, F8.13, F8.17 | Currency display, stop warnings |
| Trade Workflow | F10.1-F10.8, F10.11-F10.14 | Full 7-step workflow engine |
| Trade Management | F9.13, F9.16, F9.22 | Target tracking, manual trailing |
| Journal | F13.3, F13.5, F13.10 | Notes, tags, performance by pattern |
| Alerts | F11.1, F11.2, F11.3, F11.8 | Basic alert system |

### 7.3 Release Themes

1. **Confluence Power** - Find where multiple signals align
2. **Workflow Automation** - Guided 7-step process
3. **Signal Quality** - Better signal classification
4. **Analysis Depth** - Multi-pair, multi-tool analysis

### 7.4 Key User Stories

| ID | User Story |
|----|------------|
| R1-1 | As a trader, I can see confluence zones where multiple Fibonacci levels cluster |
| R1-2 | As a trader, I am guided through the 7-step trading workflow |
| R1-3 | As a trader, I can distinguish between Type 1 and Type 2 signals |
| R1-4 | As a trader, I can monitor multiple timeframe pairs simultaneously |
| R1-5 | As a trader, I can manually trail my stop loss |
| R1-6 | As a trader, I can see my performance broken down by pattern type |
| R1-7 | As a trader, I receive alerts when price approaches Fibonacci levels |
| R1-8 | As a trader, I can use the smart tool recommender to select the right Fibonacci tool |

### 7.5 Duration

**Estimated:** 6 weeks

---

## 8. Release 2: Pattern Recognition

### 8.1 Goal

Add harmonic pattern detection and paper trading for skill development.

### 8.2 Features Added

| Category | Feature IDs | Value |
|----------|-------------|-------|
| Instrument Management | F1.4, F1.8 | Market categories, trading hours |
| Charts | F2.8, F2.9, F2.10 | Multi-chart, templates, price alerts |
| Trend Analysis | F3.11, F3.12 | Trend change alerts, historical analysis |
| Pivot Detection | F4.8, F4.11 | Pivot history, age indicator |
| Harmonic Patterns | F6.1-F6.12, F6.22, F6.23 | Gartley 222 scanner with full validation |
| Signal Detection | F7.10, F7.12 | Confirmation checklist, signal history |
| Position Sizing | F8.3, F8.4, F8.7, F8.18 | % risk mode, account tracking |
| Trade Execution | F9.7 | Paper trading mode |
| Trade Management | F9.10, F9.11, F9.14, F9.15, F9.23 | Auto-breakeven, partial profits |
| Journal | F13.4, F13.8, F13.9, F13.11-F13.13 | Screenshots, R:R analysis, equity curve |
| Alerts | F11.4, F11.5, F11.9, F11.10, F11.12 | Pattern/signal alerts, scheduling |
| Dashboard | F12.6, F12.7, F12.9 | Pending setups, alerts panel |
| Education | F14.1-F14.5, F14.9, F14.10 | Knowledge base, practice mode |

### 8.3 Release Themes

1. **Harmonic Trading** - Gartley 222 pattern detection
2. **Risk-Free Practice** - Paper trading mode
3. **Visual Learning** - Charts, screenshots, equity curve
4. **Pattern Mastery** - Education and practice tools

### 8.4 Key User Stories

| ID | User Story |
|----|------------|
| R2-1 | As a trader, I can see when a Gartley 222 pattern is forming |
| R2-2 | As a trader, I can validate Gartley patterns against ratio rules |
| R2-3 | As a trader, I can paper trade to practice without risking capital |
| R2-4 | As a trader, I can see my equity curve over time |
| R2-5 | As a trader, I receive alerts when harmonic patterns complete |
| R2-6 | As a trader, I can view multiple charts simultaneously |
| R2-7 | As a trader, I can test my pattern recognition with quizzes |
| R2-8 | As a trader, I can automatically move my stop to breakeven |

### 8.5 Duration

**Estimated:** 8 weeks

---

## 9. Release 3: Advanced Patterns & Automation

### 9.1 Goal

Complete harmonic suite, broker integration, and advanced automation.

### 9.2 Features Added

| Category | Feature IDs | Value |
|----------|-------------|-------|
| Charts | F2.4 | Custom timeframes |
| Harmonic Patterns | F6.13-F6.21, F6.24, F6.25 | Butterfly scanner, pattern management |
| Position Sizing | F8.8, F8.11, F8.14, F8.19 | Butterfly stops, correlation warnings |
| Trade Execution | F9.1-F9.6 | Broker integration, order types |
| Trade Management | F9.17, F9.18, F9.19, F9.24 | Auto-trailing options |
| Journal | F13.2, F13.14-F13.19 | Import, drawdown, reports |
| Alerts | F11.6, F11.7, F11.11 | Risk alerts, snooze |
| Dashboard | F12.3, F12.8, F12.10-F12.12 | Full customisation, themes |
| Education | F14.6-F14.8, F14.11 | Contextual help, videos |
| Settings | F15.1-F15.11 | Full configuration suite |
| Integration | F16.1-F16.4 | Broker API, TradingView export |

### 9.3 Release Themes

1. **Butterfly Patterns** - Complete harmonic suite
2. **Live Trading** - Broker integration
3. **Full Automation** - Auto-trailing, auto-breakeven
4. **Professional Analytics** - Advanced reporting

### 9.4 Key User Stories

| ID | User Story |
|----|------------|
| R3-1 | As a trader, I can see when a Butterfly pattern is forming |
| R3-2 | As a trader, I can execute trades directly through broker integration |
| R3-3 | As a trader, I can set up automatic trailing stops |
| R3-4 | As a trader, I can see correlation warnings between positions |
| R3-5 | As a trader, I can export my indicators to TradingView |
| R3-6 | As a trader, I can generate professional PDF reports |
| R3-7 | As a trader, I can customise my dashboard layout |
| R3-8 | As a trader, I can import trades from other platforms |

### 9.5 Duration

**Estimated:** 8 weeks

---

## 10. Release 4: Platform & Ecosystem

### 10.1 Goal

Multi-platform support, API access, and community features.

### 10.2 Features Added

| Category | Feature IDs | Value |
|----------|-------------|-------|
| Integration | F16.5, F16.6, F16.7 | API, webhooks, mobile app |
| Community | New features | Shared setups, leaderboards |
| AI Enhancement | New features | Pattern prediction, optimal parameters |
| Multi-Account | New features | Portfolio view, account switching |

### 10.3 Release Themes

1. **Mobile Trading** - iOS/Android companion app
2. **Developer Platform** - Public API access
3. **Community Features** - Shared setups, social trading
4. **AI Enhancement** - Machine learning pattern prediction

### 10.4 Key User Stories

| ID | User Story |
|----|------------|
| R4-1 | As a trader, I can access my setups on mobile |
| R4-2 | As a trader, I can share my successful setups with the community |
| R4-3 | As a developer, I can integrate the app via API |
| R4-4 | As a trader, I can receive AI-powered pattern predictions |
| R4-5 | As a trader, I can manage multiple trading accounts |
| R4-6 | As a trader, I can send alerts to external services via webhook |

### 10.5 Duration

**Estimated:** 10 weeks

---

## 11. Release Roadmap Summary

### 11.1 Timeline Overview

```
2025
├── Q1: Walking Skeleton (4 weeks) + MVP (8 weeks)
├── Q2: Release 1 (6 weeks) + Release 2 Start (2 weeks)
├── Q3: Release 2 (6 weeks remaining) + Release 3 Start (6 weeks)
└── Q4: Release 3 (2 weeks remaining) + Release 4 (10 weeks)
```

### 11.2 Release Summary Table

| Release | Duration | Start | End | Key Deliverables |
|---------|----------|-------|-----|------------------|
| Walking Skeleton | 4 weeks | Week 1 | Week 4 | Architecture proven, basic flow |
| MVP | 8 weeks | Week 5 | Week 12 | Core Fibonacci analysis, signal detection |
| Release 1 | 6 weeks | Week 13 | Week 18 | Confluence, workflow, alerts |
| Release 2 | 8 weeks | Week 19 | Week 26 | Gartley patterns, paper trading |
| Release 3 | 8 weeks | Week 27 | Week 34 | Butterfly, broker integration |
| Release 4 | 10 weeks | Week 35 | Week 44 | Mobile, API, community |

### 11.3 Feature Count by Release

| Release | New Features | Cumulative | % Complete |
|---------|--------------|------------|------------|
| Walking Skeleton | 10 | 10 | 6% |
| MVP | 45 | 55 | 33% |
| Release 1 | 35 | 90 | 54% |
| Release 2 | 40 | 130 | 78% |
| Release 3 | 30 | 160 | 96% |
| Release 4 | 7+ | 167+ | 100% |

### 11.4 Value Delivery

| Release | User Value |
|---------|------------|
| Walking Skeleton | Prove technical feasibility |
| MVP | Find and validate Fibonacci setups automatically |
| Release 1 | Faster, more accurate analysis with confluence |
| Release 2 | Trade harmonic patterns, practice safely |
| Release 3 | Execute live trades with automation |
| Release 4 | Trade anywhere, share with community |

---

## 12. Technical Reference

### 12.1 Fibonacci Calculation Formulas

#### Retracement

```
BUY Setup:
Level = High - (Range × Ratio)

SELL Setup:
Level = Low + (Range × Ratio)

Where Range = High - Low
```

#### Extension

```
BUY Setup (target below):
Level = High - (Range × Ratio)

SELL Setup (target above):
Level = Low + (Range × Ratio)

Where Range = High - Low, Ratio > 1.0
```

#### Projection

```
BUY Setup (project down):
Level = C - (Swing × Ratio)

SELL Setup (project up):
Level = C + (Swing × Ratio)

Where Swing = |A - B|
```

#### Expansion

```
BUY Setup (expand down from B):
Level = B - (Range × Ratio)

SELL Setup (expand up from B):
Level = B + (Range × Ratio)

Where Range = |A - B|
```

### 12.2 Position Sizing Formula

```
Position Size = Risk Capital ÷ |Entry Price - Stop Loss Price|

Example:
Risk Capital = £500
Entry = 7950
Stop = 7900
Distance = 50 points

Position Size = £500 ÷ 50 = £10 per point
```

### 12.3 Signal Bar Rules

#### BUY Signal
```
IF price_touched_fib_level AND
   close > open AND
   close > fib_level
THEN signal = BUY

IF price_rejected_from_level THEN signal_type = 1 (stronger)
ELSE signal_type = 2 (moderate)
```

#### SELL Signal
```
IF price_touched_fib_level AND
   close < open AND
   close < fib_level
THEN signal = SELL

IF price_rejected_from_level THEN signal_type = 1 (stronger)
ELSE signal_type = 2 (moderate)
```

---

## Appendix A: Fibonacci Ratio Reference

### A.1 Core Ratios

| Ratio | Decimal | Derivation | Category |
|-------|---------|------------|----------|
| 38.2% | 0.382 | 89 ÷ 233 | Retracement |
| 50.0% | 0.500 | Not Fibonacci | Retracement |
| 61.8% | 0.618 | 89 ÷ 144 (Golden Ratio) | Retracement |
| 78.6% | 0.786 | √0.618 | Retracement |
| 100% | 1.000 | — | Projection |
| 127.2% | 1.272 | √1.618 | Extension |
| 161.8% | 1.618 | 144 ÷ 89 (Phi) | Extension |
| 261.8% | 2.618 | 233 ÷ 89 | Extension |

### A.2 Ratio Usage by Tool

| Tool | Levels Used |
|------|-------------|
| Retracement | 38%, 50%, 62%, 79% |
| Extension | 127%, 162%, 262% |
| Projection | 62%, 79%, 100%, 127%, 162% |
| Expansion | 38%, 50%, 62%, 100%, 162% |

---

## Appendix B: Pattern Specifications

### B.1 Gartley 222 Pattern

#### Structure
```
Bullish Gartley:
        A
       /\
      /  \
     /    \    C
    /      \  /\
   /        \/  \
  /          B   \
 /                \
X                  D (BUY)

Bearish Gartley:
X                  D (SELL)
 \                /
  \          B   /
   \        /\  /
    \      /  \/
     \    /    C
      \  /
       \/
        A
```

#### Ratio Rules
| Point | Ratio | Of |
|-------|-------|-----|
| B | 38-62% | XA |
| C | 62-79% | AB |
| D | 62-79% | XA |
| AB=CD | Required | Internal structure |

#### Validation
- C must remain within A's range (below A for bullish, above A for bearish)
- In strong markets, B can be 38% or 50%
- Stop placed beyond X

### B.2 Butterfly Pattern

#### Structure
```
Bullish Butterfly:
        A
       /\
      /  \    C
     /    \  /\
    /      \/  \
   X........B   \
    \            \
     \............D (BUY - below X)

Bearish Butterfly:
     /............D (SELL - above X)
    /            /
   X........B   /
    \      /\  /
     \    /  \/
      \  /    C
       \/
        A
```

#### Ratio Rules
| Point | Ratio | Of |
|-------|-------|-----|
| B | 38-79% | XA |
| C | 62-79% | AB |
| D | 127-162% | XA (Extension) |
| BD | 127-162% | Required |

#### Validation
- D extends beyond X (key difference from Gartley)
- In strong markets, B and C can be 38% or 50%
- Stop placed just beyond D (tight stop = better R:R)

### B.3 Pattern Comparison

| Aspect | Gartley 222 | Butterfly |
|--------|-------------|-----------|
| D Location | Within XA (62-79%) | Beyond X (127-162%) |
| Pattern Type | Retracement | Extension |
| Stop Placement | Beyond X | Just beyond D |
| Risk/Reward | Standard | Superior (tighter stop) |
| B Behaviour | Stays within XA | Can extend beyond X |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | December 2025 | — | Initial specification |

---

*This document is based on the SignalPro Professional Fibonacci Workshop by Sandy Jadeja and serves as the product specification for the Fibonacci Trading Application.*
