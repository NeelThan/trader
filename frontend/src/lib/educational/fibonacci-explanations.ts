/**
 * Educational content for Fibonacci trading concepts.
 * Used by workflow steps to explain ratios, levels, and tools.
 */

export type FibonacciRatio = 0.236 | 0.382 | 0.5 | 0.618 | 0.786 | 1.0 | 1.272 | 1.618;

export type FibonacciExplanation = {
  ratio: number;
  percentage: string;
  name: string;
  significance: string;
  tradingUse: string;
};

export const FIBONACCI_RATIO_EXPLANATIONS: FibonacciExplanation[] = [
  {
    ratio: 0.236,
    percentage: "23.6%",
    name: "Shallow Retracement",
    significance: "Weakest retracement level, often seen in strong trends",
    tradingUse: "Entry in strong momentum; tight stops required",
  },
  {
    ratio: 0.382,
    percentage: "38.2%",
    name: "Golden Pocket Entry",
    significance: "First significant Fibonacci level, common pullback target",
    tradingUse: "Aggressive entries in trending markets",
  },
  {
    ratio: 0.5,
    percentage: "50%",
    name: "Half Retracement",
    significance: "Psychological level, not a true Fibonacci ratio",
    tradingUse: "Confluence with other levels strengthens the zone",
  },
  {
    ratio: 0.618,
    percentage: "61.8%",
    name: "Golden Ratio",
    significance: "Most important Fibonacci ratio, high-probability reversal",
    tradingUse: "Primary entry zone for counter-trend trades",
  },
  {
    ratio: 0.786,
    percentage: "78.6%",
    name: "Deep Retracement",
    significance: "Last defense before trend invalidation",
    tradingUse: "Final opportunity entries with close stops",
  },
  {
    ratio: 1.0,
    percentage: "100%",
    name: "Full Retracement",
    significance: "Complete reversal of the prior move",
    tradingUse: "Trend invalidation level; stop loss placement",
  },
  {
    ratio: 1.272,
    percentage: "127.2%",
    name: "First Extension",
    significance: "Conservative profit target",
    tradingUse: "Take partial profits or trail stops here",
  },
  {
    ratio: 1.618,
    percentage: "161.8%",
    name: "Golden Extension",
    significance: "Primary profit target in trending markets",
    tradingUse: "Major target zone; expect resistance/support",
  },
];

export type FibonacciToolType = "retracement" | "extension" | "projection" | "expansion";

export const FIBONACCI_TOOL_EXPLANATIONS: Record<FibonacciToolType, {
  name: string;
  description: string;
  usage: string;
  calculation: string;
}> = {
  retracement: {
    name: "Fibonacci Retracement",
    description: "Measures pullback levels within a trend",
    usage: "Identify entry zones during pullbacks in trending markets",
    calculation: "High - (Range × Ratio) for uptrend entries",
  },
  extension: {
    name: "Fibonacci Extension",
    description: "Projects price targets beyond the initial move",
    usage: "Set profit targets and identify potential resistance/support",
    calculation: "Low + (Range × Ratio) for uptrend targets",
  },
  projection: {
    name: "Fibonacci Projection",
    description: "Uses ABC pattern to project wave targets",
    usage: "Forecast where the next impulse wave may complete",
    calculation: "C + (A to B distance × Ratio)",
  },
  expansion: {
    name: "Fibonacci Expansion",
    description: "Projects levels from a two-point swing",
    usage: "Quick target estimation from current swing",
    calculation: "B + (A to B distance × Ratio)",
  },
};

export const CONFLUENCE_EXPLANATION =
  "When multiple Fibonacci levels from different timeframes or tools " +
  "cluster near the same price, it creates a high-probability zone. " +
  "The heat score (0-100) measures this confluence strength.";

export const HEAT_SCORE_THRESHOLDS = {
  high: { min: 70, description: "Strong confluence - high probability zone" },
  medium: { min: 40, description: "Moderate confluence - valid but use caution" },
  low: { min: 0, description: "Weak confluence - wait for additional confirmation" },
};
