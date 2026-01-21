/**
 * Educational Content for Workflow V2 Tooltips
 *
 * Centralized source of truth for all educational tooltip content.
 * Used by InfoTooltip components across workflow panels.
 */

/**
 * Confluence Score - measures how many factors align at a price level
 */
export const CONFLUENCE_CONTENT = {
  title: "Confluence Score",
  description:
    "Measures how many factors align at a price level. Higher scores indicate stronger support/resistance zones.",
  factors: [
    { label: "Base Fib Level", points: "+1", description: "Primary Fibonacci level" },
    { label: "Same TF Confluence", points: "+1-3", description: "Multiple Fibs from same timeframe" },
    { label: "Higher TF Confluence", points: "+1-6", description: "Alignment with higher timeframe Fibs" },
    { label: "Cross-Tool", points: "+1-2", description: "Alignment with other tools (pivots, etc.)" },
    { label: "Psychological Level", points: "+1", description: "Round numbers (100, 1000, etc.)" },
  ],
  interpretations: {
    major: "7+ points: High-probability zone with multiple confirmations",
    significant: "5-6 points: Strong zone with good confluence",
    important: "3-4 points: Notable zone worth watching",
    minor: "1-2 points: Single factor, use with caution",
  },
};

/**
 * Validation checks explanations
 */
export const VALIDATION_CHECKS = {
  trendAlignment: {
    title: "Trend Alignment",
    content: "Checks if the trade direction matches the higher timeframe trend. Trading with the trend improves win rate.",
  },
  fibConfirmation: {
    title: "Fibonacci Confirmation",
    content: "Verifies price is near a significant Fibonacci level (0.382, 0.5, 0.618, 0.786) for entries or targets.",
  },
  momentumConfirmation: {
    title: "Momentum Confirmation",
    content: "RSI and MACD indicators support the trade direction. Momentum should align with intended entry.",
  },
  structureIntact: {
    title: "Structure Intact",
    content: "Recent swing highs/lows support the current trend structure. No broken patterns that invalidate the setup.",
  },
  volumeConfirmation: {
    title: "Volume Confirmation",
    content: "Volume supports the move. Breakouts should have expanding volume; reversals may show volume divergence.",
  },
  passThreshold: {
    title: "Pass Threshold (60%)",
    content: "At least 60% of validation checks must pass to proceed. This ensures multiple factors confirm the trade.",
  },
};

/**
 * Fibonacci ratios and their meanings
 */
export const FIB_RATIOS = {
  "0.236": {
    title: "23.6% Retracement",
    content: "Very shallow retracement. Indicates extremely strong momentum - price barely pulls back before continuing.",
  },
  "0.382": {
    title: "38.2% Retracement",
    content: "Shallow retracement typical of strong trends. First major support in an uptrend or resistance in a downtrend.",
  },
  "0.5": {
    title: "50% Retracement",
    content: "Mid-point pullback. Not a true Fibonacci ratio but widely watched. Balanced pullback level.",
  },
  "0.618": {
    title: "61.8% Retracement (Golden Ratio)",
    content: "The most important Fibonacci level. Deep retracement that often marks trend continuation points.",
  },
  "0.786": {
    title: "78.6% Retracement",
    content: "Very deep retracement - trend is weakening. Last major defense before potential trend reversal.",
  },
  "1.0": {
    title: "100% Extension",
    content: "Full measured move. Price has traveled the same distance as the initial swing.",
  },
  "1.272": {
    title: "127.2% Extension",
    content: "First major extension target. Common take-profit level for trend continuation trades.",
  },
  "1.618": {
    title: "161.8% Extension (Golden Extension)",
    content: "Key extension target based on the golden ratio. Strong profit-taking zone.",
  },
};

/**
 * Trend Alignment concepts
 */
export const TREND_ALIGNMENT = {
  confidence: {
    title: "Confidence Percentage",
    content: "Calculated from trend strength: Strong = 85%, Moderate = 60%, Weak = 35%. Higher confidence = clearer trend.",
  },
  calculation: {
    title: "How Trend Is Calculated",
    content: "Trend = (Swing Pattern x 40%) + (RSI x 30%) + (MACD x 30%). Each indicator votes bullish (+), bearish (-), or neutral (0).",
  },
  weights: {
    title: "Indicator Weights",
    content: "Swing patterns carry 40% weight as they show actual price structure. RSI and MACD each carry 30% for momentum confirmation.",
  },
  bullish: {
    title: "Bullish Trend",
    content: "Higher highs and higher lows pattern with momentum indicators above their midlines. Favor long trades.",
  },
  bearish: {
    title: "Bearish Trend",
    content: "Lower highs and lower lows pattern with momentum indicators below their midlines. Favor short trades.",
  },
  ranging: {
    title: "Ranging Market",
    content: "No clear trend direction - mixed signals across indicators. Fibonacci levels less reliable; consider waiting for breakout.",
  },
  multiTfAlignment: {
    title: "Multi-Timeframe Alignment",
    content: "When higher and lower timeframes agree on trend direction, trades have higher probability. Conflicts suggest caution.",
  },
};

/**
 * Cascade Effect model (6 stages)
 */
export const CASCADE_STAGES = {
  overview: {
    title: "Cascade Effect Model",
    content: "Trend reversals 'bubble up' from lower to higher timeframes in 6 stages. Early detection (Stage 2-3) allows catching reversals before full confirmation.",
  },
  stage1: {
    title: "Stage 1: Micro Divergence",
    content: "Initial divergence appears on lowest timeframes (1m-5m). Very early signal with high false positive rate. Wait for confirmation.",
  },
  stage2: {
    title: "Stage 2: Short-Term Shift",
    content: "15m-1H timeframes begin diverging. Early entry opportunity for aggressive traders. Use tight stops.",
  },
  stage3: {
    title: "Stage 3: Intermediate Transition",
    content: "4H timeframe joins the reversal. Good entry point balancing early entry with confirmation. Most bi-directional traders act here.",
  },
  stage4: {
    title: "Stage 4: Daily Confirmation",
    content: "Daily timeframe confirms the new trend. High-confidence signal but reduced R:R. Conservative entry point.",
  },
  stage5: {
    title: "Stage 5: Weekly Alignment",
    content: "Weekly timeframe aligns with reversal. Trend change is well established. Good for position trades.",
  },
  stage6: {
    title: "Stage 6: Full Cascade",
    content: "All timeframes aligned. Trend reversal complete. May be late for entry - consider waiting for next pullback.",
  },
  reversalProbability: {
    title: "Reversal Probability",
    content: "Likelihood that the current trend will reverse. Higher stages = higher probability but reduced entry opportunity.",
  },
  dominantTrend: {
    title: "Dominant Trend",
    content: "The prevailing trend direction across most timeframes. Diverging timeframes suggest potential change.",
  },
  diverging: {
    title: "Diverging Timeframes",
    content: "Timeframes showing opposite trend to the dominant direction. Early warning of potential trend change.",
  },
};

/**
 * Signal types
 */
export const SIGNAL_TYPES = {
  trendAlignment: {
    title: "Trend Alignment Signal",
    content: "Generated when multiple timeframes align in the same direction. Strong directional bias.",
  },
  fibRejection: {
    title: "Fib Rejection Signal",
    content: "Price shows rejection (wick, reversal candle) at a Fibonacci level. Suggests level is acting as support/resistance.",
  },
  confluence: {
    title: "Confluence Signal",
    content: "Multiple technical factors converge at the same price zone. Higher confluence = stronger signal.",
  },
  signalConfidence: {
    title: "Signal Confidence",
    content: "Percentage based on signal strength: 80%+ = High confidence (green), 60-79% = Medium (amber), <60% = Low (gray).",
  },
  activeSignal: {
    title: "Active Signal",
    content: "Current price is within the signal's valid range. Inactive signals are waiting for price to reach the zone.",
  },
};

/**
 * Position Sizing concepts
 */
export const POSITION_SIZING = {
  riskPercentage: {
    title: "Risk Per Trade",
    content: "Percentage of account balance risked on this trade. Professional traders typically risk 1-2%. Never risk more than you can afford to lose.",
  },
  riskAmount: {
    title: "Risk Amount",
    content: "Dollar amount at risk = Account Balance x Risk Percentage. This is your maximum loss if stopped out.",
  },
  positionSize: {
    title: "Position Size",
    content: "Calculated as Risk Amount / Stop Distance. Determines how many units/contracts to trade.",
  },
  stopDistance: {
    title: "Stop Distance",
    content: "Points/pips between entry and stop loss. Wider stops = smaller position size for same risk.",
  },
  riskRewardRatio: {
    title: "Risk:Reward Ratio",
    content: "Potential profit / potential loss. Minimum 2:1 recommended. 3:1+ is excellent. Below 1:1 requires very high win rate.",
  },
  categoryAdjustment: {
    title: "Category Risk Adjustment",
    content: "Counter-trend and reversal trades have reduced risk allocation. With-trend = 100%, Counter = 75%, Reversal = 50%.",
  },
  guardrails: {
    title: "Position Sizing Guardrails",
    content: "Safety checks to prevent oversized positions. Includes max position size, margin requirements, and volatility adjustments.",
  },
  recommendation: {
    title: "Trade Recommendation",
    content: "Based on R:R ratio: Excellent (3:1+), Good (2:1-3:1), Marginal (1:1-2:1), Poor (<1:1).",
  },
};

/**
 * ATR (Volatility) concepts
 */
export const ATR_CONTENT = {
  title: "Average True Range (ATR)",
  description: "Measures market volatility as the average range of price movement over a period.",
  usage: {
    stopPlacement: "Use ATR for stop loss placement: 1x ATR (tight), 1.5x ATR (standard), 2x ATR (wide).",
    volatilityLevels: {
      extreme: "Extreme volatility: Wide stops required. Consider reducing position size.",
      high: "High volatility: Use wider stops. Good for breakout trades.",
      normal: "Normal volatility: Standard stop distances apply.",
      low: "Low volatility: Tighter stops possible. Watch for breakouts.",
    },
  },
  period: "Common periods: 7 (short-term), 14 (standard), 21 (longer-term). Higher period = smoother, more stable readings.",
};

/**
 * Trade categories
 */
export const TRADE_CATEGORIES = {
  withTrend: {
    title: "With-Trend Trade",
    content: "Trade direction aligns with higher timeframe trend. Highest probability, full risk allocation (100%).",
  },
  counterTrend: {
    title: "Counter-Trend Trade",
    content: "Trade against the immediate trend but with structure support. Reduced risk (75% allocation).",
  },
  reversalAttempt: {
    title: "Reversal Attempt",
    content: "Trading against established trend expecting reversal. Highest risk, reduced allocation (50%).",
  },
};

/**
 * General trading concepts used across panels
 */
export const GENERAL_CONCEPTS = {
  higherTimeframe: {
    title: "Higher Timeframe",
    content: "The larger timeframe used for trend direction and major levels. Provides context for trade decisions.",
  },
  lowerTimeframe: {
    title: "Lower Timeframe",
    content: "The smaller timeframe used for entry timing. Allows precise entries within the higher timeframe trend.",
  },
  swingHigh: {
    title: "Swing High",
    content: "A price peak where price reversed from going up to going down. Creates resistance level.",
  },
  swingLow: {
    title: "Swing Low",
    content: "A price trough where price reversed from going down to going up. Creates support level.",
  },
};
