"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  TimeframePair,
  TrendAlignment,
  TrendDirection,
  TradeAction,
  TRADE_ACTION_CONFIG,
  TREND_DIRECTION_CONFIG,
  TRADING_STYLE_CONFIG,
  TIMEFRAME_PAIR_PRESETS,
} from "@/lib/chart-constants";

type TrendAlignmentPanelProps = {
  alignments: TrendAlignment[];
  selectedPair: TimeframePair | null;
  isLoading: boolean;
  error: string | null;
  onSelectPair: (pair: TimeframePair) => void;
  onRefresh: () => void;
};

/**
 * Displays a trend direction indicator with icon and color.
 */
function TrendIndicator({
  direction,
  strength,
}: {
  direction: TrendDirection;
  strength: number;
}) {
  const config = TREND_DIRECTION_CONFIG[direction];
  const opacity = 0.4 + strength * 0.6; // Scale opacity from 0.4 to 1.0

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex items-center gap-1 font-mono text-sm cursor-help"
          style={{ color: config.color, opacity }}
        >
          <span className="text-lg">{config.icon}</span>
          <span>{direction}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">
        <div>
          <p className="font-medium">{config.label}</p>
          <p className="text-xs text-muted-foreground">
            Strength: {(strength * 100).toFixed(0)}%
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Displays a trade action recommendation badge.
 */
function TradeActionBadge({
  action,
  confidence,
}: {
  action: TradeAction;
  confidence: number;
}) {
  const config = TRADE_ACTION_CONFIG[action];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold cursor-help ${config.bgColor}`}
          style={{ color: config.color }}
        >
          {config.label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-64">
        <div>
          <p className="font-medium">{config.description}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Confidence: {(confidence * 100).toFixed(0)}%
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Single alignment row in the matrix.
 */
function AlignmentRow({
  alignment,
  isSelected,
  onClick,
}: {
  alignment: TrendAlignment;
  isSelected: boolean;
  onClick: () => void;
}) {
  const styleConfig = TRADING_STYLE_CONFIG[alignment.pair.tradingStyle];

  return (
    <div
      onClick={onClick}
      className={`
        grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center p-3 rounded-lg cursor-pointer
        transition-colors
        ${isSelected ? "bg-primary/10 border border-primary/30" : "bg-muted/30 hover:bg-muted/50"}
      `}
    >
      {/* Pair Name */}
      <div>
        <p className="font-medium">{alignment.pair.name}</p>
        <p className="text-xs" style={{ color: styleConfig.color }}>
          {styleConfig.label}
        </p>
      </div>

      {/* Higher TF Trend */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground mb-1">Higher TF</p>
        <TrendIndicator
          direction={alignment.higherTrend.direction}
          strength={alignment.higherTrend.strength}
        />
      </div>

      {/* Lower TF Trend */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground mb-1">Lower TF</p>
        <TrendIndicator
          direction={alignment.lowerTrend.direction}
          strength={alignment.lowerTrend.strength}
        />
      </div>

      {/* Trade Action */}
      <div className="flex justify-end">
        <TradeActionBadge
          action={alignment.action}
          confidence={alignment.confidence}
        />
      </div>
    </div>
  );
}

/**
 * Summary card showing the current alignment recommendation.
 */
function AlignmentSummary({ alignment }: { alignment: TrendAlignment }) {
  const actionConfig = TRADE_ACTION_CONFIG[alignment.action];
  const isActionable = alignment.action !== "STAND_ASIDE";

  return (
    <div
      className={`p-4 rounded-lg border ${actionConfig.bgColor} border-opacity-30`}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-lg">{alignment.pair.name}</h4>
        <TradeActionBadge
          action={alignment.action}
          confidence={alignment.confidence}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 rounded bg-background/50">
          <p className="text-xs text-muted-foreground mb-1">
            {alignment.pair.higherTF} Trend
          </p>
          <TrendIndicator
            direction={alignment.higherTrend.direction}
            strength={alignment.higherTrend.strength}
          />
          {alignment.higherTrend.pivotHigh && (
            <p className="text-xs text-muted-foreground mt-1">
              High: {alignment.higherTrend.pivotHigh.toFixed(2)}
            </p>
          )}
          {alignment.higherTrend.pivotLow && (
            <p className="text-xs text-muted-foreground">
              Low: {alignment.higherTrend.pivotLow.toFixed(2)}
            </p>
          )}
        </div>

        <div className="p-3 rounded bg-background/50">
          <p className="text-xs text-muted-foreground mb-1">
            {alignment.pair.lowerTF} Trend
          </p>
          <TrendIndicator
            direction={alignment.lowerTrend.direction}
            strength={alignment.lowerTrend.strength}
          />
          {alignment.lowerTrend.pivotHigh && (
            <p className="text-xs text-muted-foreground mt-1">
              High: {alignment.lowerTrend.pivotHigh.toFixed(2)}
            </p>
          )}
          {alignment.lowerTrend.pivotLow && (
            <p className="text-xs text-muted-foreground">
              Low: {alignment.lowerTrend.pivotLow.toFixed(2)}
            </p>
          )}
        </div>
      </div>

      {isActionable ? (
        <div className="p-3 rounded bg-background/80 border">
          <p className="text-sm">
            <span className="font-medium" style={{ color: actionConfig.color }}>
              {alignment.action === "GO_LONG" ? "BUY SIGNAL:" : "SELL SIGNAL:"}
            </span>{" "}
            {alignment.action === "GO_LONG"
              ? `The ${alignment.pair.higherTF} timeframe shows an uptrend while ${alignment.pair.lowerTF} is pulling back. Look for buy entries at Fibonacci support levels.`
              : `The ${alignment.pair.higherTF} timeframe shows a downtrend while ${alignment.pair.lowerTF} is bouncing. Look for sell entries at Fibonacci resistance levels.`}
          </p>
        </div>
      ) : (
        <div className="p-3 rounded bg-muted/50 border border-muted">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">NO TRADE:</span> Both timeframes are
            trending in the same direction. Wait for a pullback on the lower
            timeframe before entering a trade.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Panel displaying multi-timeframe trend alignment analysis.
 */
export function TrendAlignmentPanel({
  alignments,
  selectedPair,
  isLoading,
  error,
  onSelectPair,
  onRefresh,
}: TrendAlignmentPanelProps) {
  const selectedAlignment = alignments.find(
    (a) => a.pair.id === selectedPair?.id
  );

  // Count actionable signals
  const longSignals = alignments.filter((a) => a.action === "GO_LONG").length;
  const shortSignals = alignments.filter((a) => a.action === "GO_SHORT").length;

  return (
    <div className="p-4 rounded-lg bg-card border space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Trend Alignment</h3>
          <p className="text-sm text-muted-foreground">
            Multi-timeframe trend analysis for trading setups
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isLoading && (
            <div className="flex items-center gap-2 text-sm">
              {longSignals > 0 && (
                <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400">
                  {longSignals} Long
                </span>
              )}
              {shortSignals > 0 && (
                <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                  {shortSignals} Short
                </span>
              )}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">
          <p>Analyzing trend alignment across timeframes...</p>
        </div>
      ) : (
        <>
          {/* Alignment Matrix */}
          <div className="space-y-2">
            {alignments.map((alignment) => (
              <AlignmentRow
                key={alignment.pair.id}
                alignment={alignment}
                isSelected={selectedPair?.id === alignment.pair.id}
                onClick={() => onSelectPair(alignment.pair)}
              />
            ))}
          </div>

          {/* Selected Pair Summary */}
          {selectedAlignment && (
            <AlignmentSummary alignment={selectedAlignment} />
          )}

          {/* Strategy Reminder */}
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-blue-400">Strategy Rule:</span>{" "}
              Trade with the higher timeframe trend. Enter on pullbacks (lower
              TF counter-trend) at Fibonacci levels with signal bar
              confirmation.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
