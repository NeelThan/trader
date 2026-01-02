/**
 * Educational content for trend patterns and swing analysis.
 * Used by workflow steps to explain concepts to users.
 */

export type SwingPattern = "HH" | "HL" | "LH" | "LL";

export type TrendExplanation = {
  pattern: SwingPattern;
  name: string;
  shortDescription: string;
  longDescription: string;
  tradingImplication: string;
  example: string;
};

export const SWING_PATTERN_EXPLANATIONS: Record<SwingPattern, TrendExplanation> = {
  HH: {
    pattern: "HH",
    name: "Higher High",
    shortDescription: "Price made a new high above the previous high",
    longDescription:
      "A Higher High occurs when the market pushes to a new peak that exceeds " +
      "the previous peak. This indicates strong bullish momentum as buyers are " +
      "willing to pay higher prices than before.",
    tradingImplication:
      "Confirms an uptrend. Look for buying opportunities on pullbacks to " +
      "Fibonacci retracement levels.",
    example: "Previous high: $100, New high: $105",
  },
  HL: {
    pattern: "HL",
    name: "Higher Low",
    shortDescription: "Price pullback stopped higher than the previous low",
    longDescription:
      "A Higher Low forms when a pullback or correction finds support at a " +
      "level higher than the previous low. This shows buyers stepping in " +
      "earlier, indicating accumulation and bullish sentiment.",
    tradingImplication:
      "Strong buy signal when combined with HH. The ideal entry point is at " +
      "a Fibonacci retracement (38.2%-61.8%) of the recent swing.",
    example: "Previous low: $90, New low: $93",
  },
  LH: {
    pattern: "LH",
    name: "Lower High",
    shortDescription: "Price rally stopped below the previous high",
    longDescription:
      "A Lower High occurs when a rally or bounce fails to reach the previous " +
      "high before reversing. This shows sellers stepping in earlier, indicating " +
      "distribution and bearish sentiment.",
    tradingImplication:
      "Strong sell signal when combined with LL. The ideal entry point is at " +
      "a Fibonacci retracement (38.2%-61.8%) of the recent swing.",
    example: "Previous high: $100, New high: $97",
  },
  LL: {
    pattern: "LL",
    name: "Lower Low",
    shortDescription: "Price made a new low below the previous low",
    longDescription:
      "A Lower Low occurs when the market drops to a new trough below the " +
      "previous trough. This indicates strong bearish momentum as sellers " +
      "are pushing prices lower.",
    tradingImplication:
      "Confirms a downtrend. Look for selling opportunities on rallies to " +
      "Fibonacci retracement levels.",
    example: "Previous low: $90, New low: $85",
  },
};

export type TrendType = "bullish" | "bearish" | "neutral";

export const TREND_TYPE_EXPLANATIONS: Record<TrendType, string> = {
  bullish:
    "An uptrend characterized by higher highs and higher lows. " +
    "The market structure shows buyers in control.",
  bearish:
    "A downtrend characterized by lower highs and lower lows. " +
    "The market structure shows sellers in control.",
  neutral:
    "No clear trend direction. The market may be consolidating " +
    "or transitioning between trends.",
};

export const TREND_ALIGNMENT_EXPLANATIONS = {
  strong:
    "All or most timeframes agree on direction. High-probability setup.",
  moderate:
    "Mixed signals across timeframes. Proceed with caution and smaller position.",
  weak:
    "Timeframes conflict significantly. Consider waiting for clearer alignment.",
};
