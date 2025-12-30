"use client";

import { Button } from "@/components/ui/button";
import { MarketSymbol, MARKET_CONFIG } from "@/lib/chart-constants";

type MarketSelectorProps = {
  symbol: MarketSymbol;
  onSelect: (symbol: MarketSymbol) => void;
};

export function MarketSelector({ symbol, onSelect }: MarketSelectorProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground mr-2">Market:</span>
      {(Object.keys(MARKET_CONFIG) as MarketSymbol[]).map((sym) => (
        <Button
          key={sym}
          variant={symbol === sym ? "default" : "outline"}
          size="sm"
          onClick={() => onSelect(sym)}
        >
          {sym}
        </Button>
      ))}
    </div>
  );
}
