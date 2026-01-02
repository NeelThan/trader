/**
 * Educational content for risk management and position sizing.
 * Used by workflow steps to explain position sizing calculations.
 */

export type TradeQuality = "excellent" | "good" | "marginal" | "poor";

export const RISK_REWARD_EXPLANATIONS: Record<TradeQuality, {
  label: string;
  ratio: string;
  description: string;
  recommendation: string;
}> = {
  excellent: {
    label: "Excellent Trade",
    ratio: "3:1 or higher",
    description: "Risk-reward strongly favors the trade",
    recommendation: "Full position size appropriate",
  },
  good: {
    label: "Good Trade",
    ratio: "2:1 to 3:1",
    description: "Risk-reward is favorable",
    recommendation: "Standard position size appropriate",
  },
  marginal: {
    label: "Marginal Trade",
    ratio: "1:1 to 2:1",
    description: "Risk-reward is borderline",
    recommendation: "Consider reduced position or better entry",
  },
  poor: {
    label: "Poor Trade",
    ratio: "Below 1:1",
    description: "Risk exceeds potential reward",
    recommendation: "Avoid this trade or wait for better setup",
  },
};

export const POSITION_SIZING_RULES = {
  maxRiskPerTrade: {
    conservative: { percentage: 0.5, description: "Very low risk per trade" },
    moderate: { percentage: 1.0, description: "Standard risk per trade" },
    aggressive: { percentage: 2.0, description: "Higher risk per trade" },
  },
  formula: {
    riskCapital: "Account Balance × Risk Percentage",
    positionSize: "Risk Capital ÷ (Entry Price - Stop Loss)",
    distanceToStop: "|Entry Price - Stop Loss|",
  },
};

export const POSITION_SIZING_EXPLANATION =
  "Position sizing determines how many units to trade based on your " +
  "acceptable risk level. The formula ensures you never risk more than " +
  "your predetermined percentage on any single trade.";

export const STOP_LOSS_PLACEMENT_TIPS = [
  "Place stops beyond recent swing high/low for breathing room",
  "Account for normal market volatility (ATR can help)",
  "Never move stops further away once in a trade",
  "Consider moving to breakeven after first target hit",
];

export const TARGET_PLACEMENT_TIPS = [
  "First target: 127.2% Fibonacci extension (conservative)",
  "Second target: 161.8% Fibonacci extension (standard)",
  "Third target: Trail stops for extended moves",
  "Consider partial exits at each target level",
];

export const RISK_MANAGEMENT_PRINCIPLES = [
  {
    title: "Never Risk More Than 2%",
    description:
      "Limit risk per trade to protect against drawdowns. " +
      "A series of losses won't devastate your account.",
  },
  {
    title: "Minimum 2:1 Risk-Reward",
    description:
      "Only take trades where potential profit is at least " +
      "twice the potential loss. This builds edge over time.",
  },
  {
    title: "Let Winners Run",
    description:
      "Trail stops on profitable trades. Take partial profits " +
      "at targets but allow room for extended moves.",
  },
  {
    title: "Cut Losses Quickly",
    description:
      "Never move stops away from entry. Accept small losses " +
      "as part of the trading process.",
  },
];

export const FREE_TRADE_EXPLANATION =
  "A 'free trade' occurs when you've taken enough profit to cover your " +
  "original risk. At this point, the remaining position is effectively " +
  "risk-free. Move your stop to breakeven or slightly profitable.";

export const TRAILING_STOP_EXPLANATION =
  "A trailing stop moves with the market to lock in profits while giving " +
  "the trade room to develop. Common methods include trailing by ATR, " +
  "swing points, or fixed percentage.";
