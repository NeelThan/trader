"use client";

import { Timeframe, TIMEFRAME_CONFIG } from "@/lib/chart-constants";
import { formatDisplayPrice } from "@/lib/market-utils";

type PriceSummaryProps = {
  symbol: string;
  currentPrice: number;
  crosshairPrice: number | null;
  priceChange: number;
  percentChange: string;
  timeframe: Timeframe;
};

export function PriceSummary({
  symbol,
  currentPrice,
  crosshairPrice,
  priceChange,
  percentChange,
  timeframe,
}: PriceSummaryProps) {
  return (
    <div className="flex items-center gap-6 p-4 rounded-lg bg-card border">
      <div>
        <span className="text-muted-foreground text-sm">Symbol</span>
        <p className="text-xl font-bold font-mono">{symbol}</p>
      </div>
      <div>
        <span className="text-muted-foreground text-sm">Price</span>
        <p className="text-xl font-bold font-mono">
          {formatDisplayPrice(crosshairPrice ?? currentPrice)}
        </p>
      </div>
      <div>
        <span className="text-muted-foreground text-sm">Change</span>
        <p
          className={`text-xl font-bold font-mono ${
            priceChange >= 0 ? "text-buy" : "text-sell"
          }`}
        >
          {priceChange >= 0 ? "+" : ""}
          {formatDisplayPrice(priceChange)} ({percentChange}%)
        </p>
      </div>
      <div>
        <span className="text-muted-foreground text-sm">Timeframe</span>
        <p className="text-xl font-bold font-mono">
          {TIMEFRAME_CONFIG[timeframe].label}
        </p>
      </div>
    </div>
  );
}
