/**
 * Watchlist Panel Component
 *
 * Multi-symbol watchlist management and cross-symbol opportunity scanning.
 */

"use client";

import { useState } from "react";
import { RefreshCw, Plus, X, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { MarketSymbol } from "@/lib/chart-constants";
import type { TradeOpportunity } from "@/hooks/use-trade-discovery";
import type { WatchlistSummary, OpportunityFilter } from "@/hooks/use-watchlist";

export type WatchlistPanelProps = {
  watchlist: MarketSymbol[];
  availableSymbols: MarketSymbol[];
  opportunities: TradeOpportunity[];
  summary: WatchlistSummary;
  activeSymbol: MarketSymbol;
  filter: OpportunityFilter;
  isLoading: boolean;
  onAddSymbol: (symbol: MarketSymbol) => void;
  onRemoveSymbol: (symbol: MarketSymbol) => void;
  onSetActiveSymbol: (symbol: MarketSymbol) => void;
  onSetFilter: (filter: OpportunityFilter) => void;
  onClearFilter: () => void;
  onSelectOpportunity: (opportunity: TradeOpportunity) => void;
  onRefresh: () => void;
};

export function WatchlistPanel({
  watchlist,
  availableSymbols,
  opportunities,
  summary,
  activeSymbol,
  filter,
  isLoading,
  onAddSymbol,
  onRemoveSymbol,
  onSetActiveSymbol,
  onSetFilter,
  onClearFilter,
  onSelectOpportunity,
  onRefresh,
}: WatchlistPanelProps) {
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const handleAddSymbol = (symbol: MarketSymbol) => {
    onAddSymbol(symbol);
    setAddMenuOpen(false);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Watchlist</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Refresh"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Scanning symbols...
        </div>
      )}

      {/* Watchlist symbols */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Symbols</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {watchlist.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add symbols to your watchlist to scan for opportunities.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {watchlist.map((symbol) => {
                const count = summary.bySymbol[symbol] || 0;
                const isActive = symbol === activeSymbol;

                return (
                  <div key={symbol} className="flex items-center gap-1">
                    <Button
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => onSetActiveSymbol(symbol)}
                      className={cn(isActive && "bg-primary")}
                    >
                      {symbol}
                      {count > 0 && (
                        <Badge variant="secondary" className="ml-1">
                          {count}
                        </Badge>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onRemoveSymbol(symbol)}
                      aria-label={`Remove ${symbol}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add symbol dropdown */}
          <DropdownMenu open={addMenuOpen} onOpenChange={setAddMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="mt-2">
                <Plus className="h-4 w-4 mr-1" />
                Add Symbol
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {availableSymbols.map((symbol) => (
                <DropdownMenuItem
                  key={symbol}
                  onClick={() => handleAddSymbol(symbol)}
                >
                  {symbol}
                </DropdownMenuItem>
              ))}
              {availableSymbols.length === 0 && (
                <DropdownMenuItem disabled>
                  All symbols in watchlist
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </Card>

      {/* Summary statistics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-2xl font-bold">{summary.totalOpportunities}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green-400">
                {summary.longCount} Long
              </div>
            </div>
            <div>
              <div className="text-lg font-semibold text-red-400">
                {summary.shortCount} Short
              </div>
            </div>
          </div>
          {summary.bestOpportunity && (
            <div className="mt-2 text-sm text-center text-muted-foreground">
              Best: {summary.bestOpportunity.symbol} at {summary.bestOpportunity.confidence}%
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filter controls */}
      <div className="space-y-2">
        <div className="text-sm font-medium">Filter</div>
        <div className="flex gap-2">
          <Button
            variant={!filter.direction ? "default" : "outline"}
            size="sm"
            onClick={onClearFilter}
            className={cn(!filter.direction && "bg-primary")}
          >
            All
          </Button>
          <Button
            variant={filter.direction === "long" ? "default" : "outline"}
            size="sm"
            onClick={() => onSetFilter({ direction: "long" })}
            className={cn(filter.direction === "long" && "bg-primary")}
          >
            Long
          </Button>
          <Button
            variant={filter.direction === "short" ? "default" : "outline"}
            size="sm"
            onClick={() => onSetFilter({ direction: "short" })}
            className={cn(filter.direction === "short" && "bg-primary")}
          >
            Short
          </Button>
        </div>
      </div>

      {/* Opportunity list */}
      <div className="space-y-2">
        {opportunities.length === 0 ? (
          <Card>
            <CardContent className="py-4 text-center text-muted-foreground">
              {watchlist.length === 0
                ? "Add symbols to your watchlist to find opportunities."
                : "No opportunities found. Try adjusting your filters."}
            </CardContent>
          </Card>
        ) : (
          opportunities.map((opp) => (
            <Card
              key={opp.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onSelectOpportunity(opp)}
            >
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{opp.symbol}</span>
                    <Badge
                      className={cn(
                        opp.direction === "long"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      )}
                    >
                      {opp.direction === "long" ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {opp.direction.toUpperCase()}
                    </Badge>
                  </div>
                  <Badge variant="outline">{opp.confidence}%</Badge>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {opp.description}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {opp.higherTimeframe} → {opp.lowerTimeframe}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
