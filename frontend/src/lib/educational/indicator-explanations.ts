/**
 * Educational content for technical indicators.
 * Used by workflow steps to explain RSI, MACD, and other indicators.
 */

export type RSIZone = "oversold" | "neutral" | "overbought";

export const RSI_EXPLANATIONS = {
  name: "Relative Strength Index (RSI)",
  description:
    "A momentum oscillator that measures the speed and magnitude of " +
    "recent price changes to evaluate overbought or oversold conditions.",
  range: "0 to 100",
  defaultPeriod: 14,
  zones: {
    oversold: {
      range: "Below 30",
      interpretation:
        "Market may be oversold, potential buying opportunity. " +
        "In strong downtrends, RSI can stay oversold for extended periods.",
      tradingAction: "Look for bullish reversal signals at Fibonacci levels",
    },
    neutral: {
      range: "30 to 70",
      interpretation:
        "Market in equilibrium. Direction determined by other factors. " +
        "Look for divergences and trend confirmation.",
      tradingAction: "Use trend direction and Fibonacci levels for entries",
    },
    overbought: {
      range: "Above 70",
      interpretation:
        "Market may be overbought, potential selling opportunity. " +
        "In strong uptrends, RSI can stay overbought for extended periods.",
      tradingAction: "Look for bearish reversal signals at Fibonacci levels",
    },
  },
  divergence: {
    bullish: "Price makes lower low, RSI makes higher low - potential reversal up",
    bearish: "Price makes higher high, RSI makes lower high - potential reversal down",
  },
};

export const MACD_EXPLANATIONS = {
  name: "Moving Average Convergence Divergence (MACD)",
  description:
    "A trend-following momentum indicator showing the relationship " +
    "between two moving averages of a security's price.",
  components: {
    macdLine: {
      name: "MACD Line",
      calculation: "12-period EMA minus 26-period EMA",
      interpretation: "Shows momentum direction and strength",
    },
    signalLine: {
      name: "Signal Line",
      calculation: "9-period EMA of the MACD Line",
      interpretation: "Smoother trend line for crossover signals",
    },
    histogram: {
      name: "Histogram",
      calculation: "MACD Line minus Signal Line",
      interpretation: "Visual representation of momentum strength",
    },
  },
  signals: {
    bullish: [
      "MACD crosses above Signal Line (bullish crossover)",
      "Histogram turns positive (momentum shifting up)",
      "MACD crosses above zero (trend turning bullish)",
    ],
    bearish: [
      "MACD crosses below Signal Line (bearish crossover)",
      "Histogram turns negative (momentum shifting down)",
      "MACD crosses below zero (trend turning bearish)",
    ],
  },
};

export type ConfirmationLevel = "strong" | "partial" | "wait";

export const CONFIRMATION_LEVEL_EXPLANATIONS: Record<ConfirmationLevel, {
  label: string;
  description: string;
  action: string;
}> = {
  strong: {
    label: "Strong Confirmation",
    description: "RSI and MACD both confirm the trade direction",
    action: "Proceed with full position size",
  },
  partial: {
    label: "Partial Confirmation",
    description: "One indicator confirms, one is neutral or conflicting",
    action: "Consider reduced position size or additional confirmation",
  },
  wait: {
    label: "Wait for Confirmation",
    description: "Indicators are neutral or conflicting",
    action: "Wait for clearer signals before entering",
  },
};

export const INDICATOR_USAGE_TIPS = [
  "Indicators work best when combined with price action and Fibonacci levels",
  "Overbought/oversold conditions alone are not entry signals",
  "Look for confluence between indicators and key price levels",
  "Consider the higher timeframe trend before acting on indicator signals",
  "Divergences are powerful but require confirmation before trading",
];
