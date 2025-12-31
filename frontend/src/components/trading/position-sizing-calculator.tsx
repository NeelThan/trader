"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PriceInput } from "./price-input";
import { PositionSizeResult } from "./position-size-result";
import { RiskRewardDisplay } from "./risk-reward-display";
import { usePositionSizing } from "@/hooks/use-position-sizing";
import { usePositionSizingAPI, type PositionSizingResult } from "@/hooks/use-position-sizing-api";

/**
 * Collapsible help guide explaining how trade parameters work.
 */
function TradeParametersGuide({
  isOpen,
  onToggle,
  currency,
  riskCapital,
}: {
  isOpen: boolean;
  onToggle: () => void;
  currency: string;
  riskCapital: number;
}) {
  return (
    <div className="rounded-lg border bg-blue-500/5 border-blue-500/20">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 text-left text-sm"
      >
        <span className="text-blue-400 font-medium">How does this work?</span>
        <span className="text-muted-foreground">{isOpen ? "Hide" : "Show"}</span>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-3 text-sm">
          <div className="space-y-2 text-muted-foreground">
            <p>
              <strong className="text-foreground">Entry Price:</strong> The price you plan to buy or sell at.
            </p>
            <p>
              <strong className="text-foreground">Stop Loss:</strong> Your exit price if the trade goes against you.
              This defines your maximum loss per share.
            </p>
            <p>
              <strong className="text-foreground">Target Price:</strong> Where you plan to take profit.
              Used to calculate your reward-to-risk ratio.
            </p>
          </div>

          <div className="p-3 rounded bg-muted/50 space-y-2">
            <div className="font-medium text-foreground">Example Calculation</div>
            <div className="font-mono text-xs space-y-1">
              <div>Entry: {currency}100.00 | Stop: {currency}98.00 | Target: {currency}106.00</div>
              <div>Risk per share: {currency}100 - {currency}98 = <span className="text-red-400">{currency}2.00</span></div>
              <div>Reward per share: {currency}106 - {currency}100 = <span className="text-green-400">{currency}6.00</span></div>
            </div>
            <div className="pt-2 border-t border-border/50 font-mono text-xs space-y-1">
              <div>With {currency}{riskCapital.toFixed(0)} risk capital:</div>
              <div>Position Size = {currency}{riskCapital.toFixed(0)} ÷ {currency}2.00 = <span className="text-blue-400">{(riskCapital / 2).toFixed(0)} shares</span></div>
              <div>If wrong: {(riskCapital / 2).toFixed(0)} × {currency}2 = <span className="text-red-400">-{currency}{riskCapital.toFixed(0)}</span> (your defined risk)</div>
              <div>If right: {(riskCapital / 2).toFixed(0)} × {currency}6 = <span className="text-green-400">+{currency}{(riskCapital * 3).toFixed(0)}</span></div>
              <div>R:R = {currency}6 ÷ {currency}2 = <span className="text-emerald-400">3:1</span></div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            The calculator ensures you risk exactly your defined amount regardless of how far your stop is from entry.
          </p>
        </div>
      )}
    </div>
  );
}

export type PositionSizingCalculatorProps = {
  /** Pre-fill entry price from external source (e.g., chart) */
  defaultEntryPrice?: number;
  /** Pre-fill stop loss from external source */
  defaultStopLoss?: number;
  /** Pre-fill target from external source */
  defaultTarget?: number;
  /** Currency symbol for display */
  currency?: string;
  /** Called when calculation changes */
  onCalculationChange?: (calculation: PositionSizingResult | null) => void;
  /** Additional class names */
  className?: string;
};

/**
 * Full position sizing calculator with account settings and trade parameters.
 * Uses the backend API for calculations.
 * Persists settings to localStorage for reuse across sessions.
 */
export function PositionSizingCalculator({
  defaultEntryPrice,
  defaultStopLoss,
  defaultTarget,
  currency = "$",
  onCalculationChange,
  className,
}: PositionSizingCalculatorProps) {
  const { settings, setSettings, resetSettings, getRiskCapital } = usePositionSizing();
  const { result: calculation, isLoading, error, isBackendAvailable, calculate } = usePositionSizingAPI();

  // Local state for trade inputs
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLossPrice, setStopLossPrice] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [hasMounted, setHasMounted] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Track mount state to avoid hydration mismatch.
  // This is intentional - we need to detect client-side mounting to prevent
  // hydration errors when reading from localStorage.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional mount detection
    setHasMounted(true);
  }, []);

  // Initialize from defaults or saved settings.
  // This syncs external storage (localStorage) with React state - a valid use case for effects.
  useEffect(() => {
    if (!hasMounted) return;

    /* eslint-disable react-hooks/set-state-in-effect -- Syncing external storage with state */
    if (defaultEntryPrice && defaultEntryPrice > 0) {
      setEntryPrice(defaultEntryPrice.toString());
    } else if (settings.defaultEntryPrice > 0) {
      setEntryPrice(settings.defaultEntryPrice.toString());
    }

    if (defaultStopLoss && defaultStopLoss > 0) {
      setStopLossPrice(defaultStopLoss.toString());
    } else if (settings.defaultStopLossPrice > 0) {
      setStopLossPrice(settings.defaultStopLossPrice.toString());
    }

    if (defaultTarget && defaultTarget > 0) {
      setTargetPrice(defaultTarget.toString());
    } else if (settings.defaultTargetPrice > 0) {
      setTargetPrice(settings.defaultTargetPrice.toString());
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [hasMounted, defaultEntryPrice, defaultStopLoss, defaultTarget, settings]);

  // Calculate position size using backend API
  const performCalculation = useCallback(async () => {
    const entry = parseFloat(entryPrice) || 0;
    const stop = parseFloat(stopLossPrice) || 0;
    const target = parseFloat(targetPrice) || 0;
    const risk = getRiskCapital();

    if (entry > 0 && stop > 0 && risk > 0) {
      await calculate({
        entryPrice: entry,
        stopLoss: stop,
        targets: target > 0 ? [target] : [],
        riskCapital: risk,
        accountBalance: settings.accountBalance,
      });
    }
  }, [entryPrice, stopLossPrice, targetPrice, settings.accountBalance, getRiskCapital, calculate]);

  // Auto-calculate when inputs change
  useEffect(() => {
    const entry = parseFloat(entryPrice) || 0;
    const stop = parseFloat(stopLossPrice) || 0;
    const risk = getRiskCapital();

    if (entry > 0 && stop > 0 && risk > 0 && entry !== stop) {
      performCalculation();
    }
  }, [entryPrice, stopLossPrice, targetPrice, performCalculation, getRiskCapital]);

  // Notify parent of calculation changes
  useEffect(() => {
    onCalculationChange?.(calculation);
  }, [calculation, onCalculationChange]);

  // Save current trade parameters as defaults
  const saveAsDefaults = () => {
    setSettings({
      defaultEntryPrice: parseFloat(entryPrice) || 0,
      defaultStopLossPrice: parseFloat(stopLossPrice) || 0,
      defaultTargetPrice: parseFloat(targetPrice) || 0,
    });
  };

  // Clear trade parameters
  const clearTrade = () => {
    setEntryPrice("");
    setStopLossPrice("");
    setTargetPrice("");
  };

  if (!hasMounted) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Position Sizing Calculator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Backend Status Warning */}
      {!isBackendAvailable && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm mb-4">
          <div className="flex items-center gap-2 text-amber-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Backend unavailable - calculations may not work
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Inputs */}
        <div className="space-y-6">
          {/* Account Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Account Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm">Account Balance</Label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-muted-foreground">{currency}</span>
                  <Input
                    type="number"
                    value={settings.accountBalance}
                    onChange={(e) => setSettings({ accountBalance: parseFloat(e.target.value) || 0 })}
                    className="font-mono"
                    min={0}
                    step={100}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Risk Mode</Label>
                <div className="flex gap-2">
                  <Button
                    variant={settings.usePercentageRisk ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSettings({ usePercentageRisk: true })}
                  >
                    % of Account
                  </Button>
                  <Button
                    variant={!settings.usePercentageRisk ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSettings({ usePercentageRisk: false })}
                  >
                    Fixed Amount
                  </Button>
                </div>
              </div>

              {settings.usePercentageRisk ? (
                <div>
                  <Label className="text-sm">Risk Per Trade (%)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      value={settings.riskPercentage}
                      onChange={(e) => setSettings({ riskPercentage: parseFloat(e.target.value) || 0 })}
                      className="font-mono"
                      min={0.1}
                      max={100}
                      step={0.1}
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    = {currency}{getRiskCapital().toFixed(2)} per trade
                  </div>
                </div>
              ) : (
                <div>
                  <Label className="text-sm">Risk Capital Per Trade</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-muted-foreground">{currency}</span>
                    <Input
                      type="number"
                      value={settings.riskCapital}
                      onChange={(e) => setSettings({ riskCapital: parseFloat(e.target.value) || 0 })}
                      className="font-mono"
                      min={0}
                      step={10}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    = {((settings.riskCapital / settings.accountBalance) * 100).toFixed(2)}% of account
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trade Parameters */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Trade Parameters</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={clearTrade}>
                    Clear
                  </Button>
                  <Button variant="outline" size="sm" onClick={saveAsDefaults}>
                    Save as Default
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <PriceInput
                label="Entry Price"
                value={entryPrice}
                onChange={setEntryPrice}
                placeholder="0.00"
                precision={5}
              />
              <PriceInput
                label="Stop Loss Price"
                value={stopLossPrice}
                onChange={setStopLossPrice}
                placeholder="0.00"
                precision={5}
              />
              <PriceInput
                label="Target Price"
                value={targetPrice}
                onChange={setTargetPrice}
                placeholder="0.00"
                precision={5}
              />

              {/* Quick Stop Suggestions */}
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground mb-2">Quick Stop Loss (% below entry)</div>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 5].map((percent) => {
                    const entry = parseFloat(entryPrice) || 0;
                    const suggestedStop = entry * (1 - percent / 100);
                    return (
                      <Button
                        key={percent}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        disabled={!entry}
                        onClick={() => setStopLossPrice(suggestedStop.toFixed(5))}
                      >
                        -{percent}%
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Target Suggestions */}
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground mb-2">Quick Target by R:R Ratio</div>
                <div className="flex flex-wrap gap-2">
                  {[1, 1.5, 2, 3, 4].map((ratio) => {
                    const entry = parseFloat(entryPrice) || 0;
                    const stop = parseFloat(stopLossPrice) || 0;
                    const riskDistance = Math.abs(entry - stop);
                    // For long trades (stop below entry), target is above entry
                    // For short trades (stop above entry), target is below entry
                    const isLong = stop < entry;
                    const suggestedTarget = isLong
                      ? entry + riskDistance * ratio
                      : entry - riskDistance * ratio;
                    return (
                      <Button
                        key={ratio}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        disabled={!entry || !stop || entry === stop}
                        onClick={() => setTargetPrice(suggestedTarget.toFixed(5))}
                      >
                        {ratio}:1
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <div className="text-xs text-muted-foreground mb-2">Quick Target by % Profit</div>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 5, 10].map((percent) => {
                    const entry = parseFloat(entryPrice) || 0;
                    const stop = parseFloat(stopLossPrice) || 0;
                    // For long trades (stop below entry), target is above entry
                    // For short trades (stop above entry), target is below entry
                    const isLong = stop < entry;
                    const suggestedTarget = isLong
                      ? entry * (1 + percent / 100)
                      : entry * (1 - percent / 100);
                    return (
                      <Button
                        key={percent}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        disabled={!entry}
                        onClick={() => setTargetPrice(suggestedTarget.toFixed(5))}
                      >
                        +{percent}%
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Help Guide */}
              <div className="pt-2">
                <TradeParametersGuide
                  isOpen={showGuide}
                  onToggle={() => setShowGuide(!showGuide)}
                  currency={currency}
                  riskCapital={getRiskCapital()}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Results */}
        <div className="space-y-6">
          {/* Loading State */}
          {isLoading && (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Calculating...
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <Card>
              <CardContent className="py-8 text-center">
                <div className="text-red-400 text-sm">{error}</div>
              </CardContent>
            </Card>
          )}

          {/* Position Size Result */}
          {calculation && !isLoading ? (
            <>
              <PositionSizeResult
                positionSize={calculation.positionSize}
                riskAmount={calculation.riskAmount}
                distanceToStop={calculation.distanceToStop}
                entryPrice={parseFloat(entryPrice) || 0}
                currency={currency}
              />
              <RiskRewardDisplay
                riskRewardRatio={calculation.riskRewardRatio}
                potentialProfit={calculation.potentialProfit}
                potentialLoss={calculation.potentialLoss}
                isValidTrade={calculation.isValid}
                recommendation={
                  calculation.recommendation === "excellent"
                    ? "Excellent R:R - Strong setup"
                    : calculation.recommendation === "good"
                    ? "Good setup - Acceptable R:R"
                    : calculation.recommendation === "marginal"
                    ? "Marginal trade - Consider 2:1+ R:R"
                    : "R:R below 1:1 - Risk exceeds potential reward"
                }
                accountRiskPercentage={calculation.accountRiskPercentage}
                currency={currency}
              />
            </>
          ) : !isLoading && !error ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-muted-foreground">
                  Enter entry and stop loss prices to calculate position size
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Reset Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={resetSettings}
            className="w-full text-muted-foreground"
          >
            Reset All Settings to Default
          </Button>
        </div>
      </div>
    </div>
  );
}
