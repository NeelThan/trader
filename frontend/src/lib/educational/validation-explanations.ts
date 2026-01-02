/**
 * Educational content for trade validation checks.
 * Provides explanations for each validation criterion.
 */

/**
 * Check importance level
 * - required: Must pass to proceed with trade
 * - warning: Should pass, but can be overridden
 * - ignored: Not checked (user disabled)
 */
export type CheckImportance = "required" | "warning" | "ignored";

/**
 * Validation check type
 */
export type ValidationCheckType =
  | "trend_alignment"
  | "entry_zone"
  | "target_zones"
  | "rsi_confirmation"
  | "macd_confirmation";

/**
 * Educational content for a validation check
 */
export type ValidationCheckExplanation = {
  /** Check identifier */
  type: ValidationCheckType;
  /** Display name */
  name: string;
  /** Short description (1-2 sentences) */
  brief: string;
  /** Detailed explanation */
  detailed: string;
  /** Why this check matters */
  importance: string;
  /** What to do if it fails */
  failureGuidance: string;
  /** Default importance level */
  defaultImportance: CheckImportance;
};

export const VALIDATION_CHECK_EXPLANATIONS: Record<
  ValidationCheckType,
  ValidationCheckExplanation
> = {
  trend_alignment: {
    type: "trend_alignment",
    name: "Trend Alignment",
    brief:
      "Verifies that higher and lower timeframes agree on trade direction.",
    detailed:
      "Trend alignment checks whether the higher timeframe trend supports your " +
      "intended trade direction on the lower timeframe. Trading with the trend " +
      "significantly increases the probability of success. This check verifies " +
      "both the trend direction and the confidence level (minimum 60%).",
    importance:
      "Trading against the higher timeframe trend is one of the most common " +
      "mistakes traders make. The higher TF acts as the 'boss' - it determines " +
      "the overall market direction. Lower TF moves that align with the higher " +
      "TF have momentum support and tend to be more sustainable.",
    failureGuidance:
      "If trend alignment fails, consider waiting for the higher timeframe to " +
      "confirm your direction, or look for opportunities in the direction " +
      "the higher timeframe is already trending.",
    defaultImportance: "required",
  },
  entry_zone: {
    type: "entry_zone",
    name: "Entry Zone",
    brief: "Confirms Fibonacci retracement levels exist for entry.",
    detailed:
      "Entry zone validation ensures there are valid Fibonacci retracement " +
      "levels on the lower timeframe that match your trade direction. These " +
      "levels provide optimal entry points where price is likely to find " +
      "support (for longs) or resistance (for shorts) during a pullback.",
    importance:
      "Entering at random prices reduces your edge. Fibonacci levels represent " +
      "natural support and resistance areas where institutional traders often " +
      "place orders. Entries at these levels give you a defined risk point " +
      "and increase the probability of price moving in your favor.",
    failureGuidance:
      "If no entry zone is detected, price may have already moved past the " +
      "optimal entry area. Wait for a new pullback to establish fresh Fib " +
      "levels, or look at a different timeframe for better entry zones.",
    defaultImportance: "required",
  },
  target_zones: {
    type: "target_zones",
    name: "Target Zones",
    brief: "Confirms Fibonacci extension levels exist for profit targets.",
    detailed:
      "Target zone validation checks for Fibonacci extension levels on the " +
      "higher timeframe. These extension levels (127.2%, 161.8%, 261.8%) " +
      "project where price might reach after breaking the previous swing, " +
      "providing clear profit-taking areas.",
    importance:
      "Without defined targets, you're trading blind. Extension levels help " +
      "you calculate risk-reward ratios before entering. Knowing your targets " +
      "also helps you manage the trade - taking partial profits at each level " +
      "and trailing stops for maximum gain.",
    failureGuidance:
      "If no targets are found, the trade may lack defined profit objectives. " +
      "Consider using the most recent swing high/low as a minimum target, or " +
      "check if price needs to complete the current swing before extensions apply.",
    defaultImportance: "warning",
  },
  rsi_confirmation: {
    type: "rsi_confirmation",
    name: "RSI Confirmation",
    brief: "Checks RSI supports trade direction (not overbought/oversold).",
    detailed:
      "RSI confirmation verifies that the Relative Strength Index on the entry " +
      "timeframe supports your trade. For long trades, RSI should be bullish " +
      "or neutral (not overbought). For short trades, RSI should be bearish " +
      "or neutral (not oversold).",
    importance:
      "RSI measures momentum and can warn you of potential reversals. Entering " +
      "a long trade when RSI is already overbought (above 70) increases the " +
      "risk of a pullback against you. RSI confirmation adds a momentum filter " +
      "to your Fibonacci-based entries.",
    failureGuidance:
      "If RSI conflicts with your trade direction, consider waiting for RSI " +
      "to reset. Alternatively, you can proceed with caution using a smaller " +
      "position size or tighter stops. RSI divergences can also signal " +
      "weakening momentum worth monitoring.",
    defaultImportance: "warning",
  },
  macd_confirmation: {
    type: "macd_confirmation",
    name: "MACD Confirmation",
    brief: "Checks MACD momentum aligns with trade direction.",
    detailed:
      "MACD confirmation checks whether the Moving Average Convergence " +
      "Divergence indicator shows momentum in your trade direction. For longs, " +
      "MACD should be bullish (MACD above signal line or histogram positive). " +
      "For shorts, MACD should be bearish.",
    importance:
      "MACD is a trend-following momentum indicator. When MACD agrees with your " +
      "trade direction, momentum is building in your favor. Trading against " +
      "MACD momentum means fighting the current short-term trend, which " +
      "reduces probability of immediate success.",
    failureGuidance:
      "If MACD conflicts, momentum may be shifting against your trade. Wait " +
      "for a MACD crossover in your direction, or use the current MACD conflict " +
      "as a reason to reduce position size. MACD often lags, so price action " +
      "at Fibonacci levels may lead MACD confirmation.",
    defaultImportance: "warning",
  },
};

/**
 * Default importance settings for all checks
 */
export const DEFAULT_CHECK_IMPORTANCE: Record<ValidationCheckType, CheckImportance> = {
  trend_alignment: "required",
  entry_zone: "required",
  target_zones: "warning",
  rsi_confirmation: "warning",
  macd_confirmation: "warning",
};

/**
 * Importance level explanations
 */
export const IMPORTANCE_LEVEL_EXPLANATIONS: Record<
  CheckImportance,
  {
    label: string;
    description: string;
    color: string;
  }
> = {
  required: {
    label: "Required",
    description:
      "This check must pass before proceeding. Failing required checks " +
      "blocks the trade until resolved.",
    color: "red",
  },
  warning: {
    label: "Warning",
    description:
      "This check should pass, but you can override it if you have good " +
      "reason. Overrides are logged for learning.",
    color: "amber",
  },
  ignored: {
    label: "Ignored",
    description:
      "This check is disabled and will not be evaluated. Use sparingly " +
      "as these checks protect your trading edge.",
    color: "zinc",
  },
};

/**
 * Override logging explanation
 */
export const OVERRIDE_EXPLANATION =
  "When you override a warning check, the override is logged to your trade " +
  "journal. This helps you learn which overrides lead to winning vs losing " +
  "trades over time. Review your override history periodically to refine " +
  "your trading rules.";

/**
 * Validation score thresholds
 */
export const VALIDATION_SCORE_THRESHOLDS = {
  excellent: {
    min: 80,
    label: "Excellent Setup",
    description: "All or most checks pass. High-probability trade.",
    recommendation: "Proceed with full position size.",
  },
  good: {
    min: 60,
    label: "Good Setup",
    description: "Most checks pass. Solid opportunity.",
    recommendation: "Proceed with standard position size.",
  },
  marginal: {
    min: 40,
    label: "Marginal Setup",
    description: "Mixed results. Some concerns exist.",
    recommendation: "Consider reduced size or wait for improvement.",
  },
  poor: {
    min: 0,
    label: "Poor Setup",
    description: "Multiple checks fail. High risk.",
    recommendation: "Avoid this trade or wait for better conditions.",
  },
};

/**
 * Get validation quality based on pass percentage
 */
export function getValidationQuality(
  passPercentage: number
): keyof typeof VALIDATION_SCORE_THRESHOLDS {
  if (passPercentage >= 80) return "excellent";
  if (passPercentage >= 60) return "good";
  if (passPercentage >= 40) return "marginal";
  return "poor";
}

/**
 * General validation tips
 */
export const VALIDATION_TIPS = [
  "Higher timeframe trend alignment is the most important factor for trade success.",
  "Required checks protect you from common trading mistakes - respect them.",
  "Overriding warning checks is acceptable when you have additional confluence.",
  "Track your override outcomes to improve your trading rules over time.",
  "A 60% pass rate is the minimum - aim for 80%+ for highest probability trades.",
];
