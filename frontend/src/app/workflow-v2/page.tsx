"use client";

/**
 * Workflow V2 - Chart-Centric Trading
 *
 * A fluid, discovery-first workflow that keeps the chart always visible.
 * Shows trade opportunities across all timeframes, not locked to a "style".
 *
 * Phases: DISCOVER → VALIDATE → SIZE → EXECUTE → MANAGE
 */

import { useState, useCallback } from "react";
import { WorkflowV2Layout } from "@/components/workflow-v2/WorkflowV2Layout";
import { DiscoveryPanel } from "@/components/workflow-v2/DiscoveryPanel";
import { ValidationPanel } from "@/components/workflow-v2/ValidationPanel";
import { SizingPanel } from "@/components/workflow-v2/SizingPanel";
import { ExecutionPanel } from "@/components/workflow-v2/ExecutionPanel";
import { ManagePanel } from "@/components/workflow-v2/ManagePanel";
import { useTradeDiscovery, type TradeOpportunity } from "@/hooks/use-trade-discovery";
import { useTradeValidation } from "@/hooks/use-trade-validation";
import { useTradeExecution } from "@/hooks/use-trade-execution";
import type { MarketSymbol, Timeframe } from "@/lib/chart-constants";

export type WorkflowPhase = "discover" | "validate" | "size" | "execute" | "manage";

export default function WorkflowV2Page() {
  const [symbol, setSymbol] = useState<MarketSymbol>("DJI");
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [phase, setPhase] = useState<WorkflowPhase>("discover");
  const [selectedOpportunity, setSelectedOpportunity] = useState<TradeOpportunity | null>(null);

  // Trade discovery - finds opportunities across all timeframes
  const discovery = useTradeDiscovery({ symbol });

  // Trade validation - checks if selected opportunity meets criteria
  const validation = useTradeValidation({
    opportunity: selectedOpportunity,
    enabled: phase === "validate",
  });

  // Trade execution - handles sizing and execution
  const execution = useTradeExecution({
    opportunity: selectedOpportunity,
    validation: validation.result,
    enabled: phase === "size" || phase === "execute",
  });

  // Handle opportunity selection
  const handleSelectOpportunity = useCallback((opportunity: TradeOpportunity) => {
    setSelectedOpportunity(opportunity);
    setPhase("validate");
  }, []);

  // Handle back to discovery
  const handleBackToDiscovery = useCallback(() => {
    setSelectedOpportunity(null);
    setPhase("discover");
  }, []);

  // Handle proceed to sizing
  const handleProceedToSize = useCallback(() => {
    setPhase("size");
  }, []);

  // Handle proceed to execute
  const handleProceedToExecute = useCallback(() => {
    setPhase("execute");
  }, []);

  // Handle trade execution complete
  const handleExecuteComplete = useCallback(() => {
    setPhase("manage");
  }, []);

  // Handle finish managing (back to discovery)
  const handleFinishManaging = useCallback(() => {
    setSelectedOpportunity(null);
    setPhase("discover");
  }, []);

  // Render the appropriate panel based on phase
  const renderSidePanel = () => {
    switch (phase) {
      case "discover":
        return (
          <DiscoveryPanel
            opportunities={discovery.opportunities}
            isLoading={discovery.isLoading}
            onSelectOpportunity={handleSelectOpportunity}
          />
        );
      case "validate":
        return (
          <ValidationPanel
            opportunity={selectedOpportunity!}
            validation={validation.result}
            isLoading={validation.isLoading}
            onBack={handleBackToDiscovery}
            onProceed={handleProceedToSize}
          />
        );
      case "size":
        return (
          <SizingPanel
            opportunity={selectedOpportunity!}
            sizing={execution.sizing}
            onUpdateSizing={execution.updateSizing}
            onBack={() => setPhase("validate")}
            onProceed={handleProceedToExecute}
          />
        );
      case "execute":
        return (
          <ExecutionPanel
            opportunity={selectedOpportunity!}
            sizing={execution.sizing}
            validation={validation.result}
            onBack={() => setPhase("size")}
            onExecute={execution.execute}
            onComplete={handleExecuteComplete}
            isExecuting={execution.isExecuting}
          />
        );
      case "manage":
        return (
          <ManagePanel
            opportunity={selectedOpportunity!}
            sizing={execution.sizing}
            onClose={handleFinishManaging}
          />
        );
    }
  };

  return (
    <WorkflowV2Layout
      symbol={symbol}
      onSymbolChange={setSymbol}
      timeframe={timeframe}
      onTimeframeChange={setTimeframe}
      phase={phase}
      opportunity={selectedOpportunity}
      discovery={discovery}
    >
      {renderSidePanel()}
    </WorkflowV2Layout>
  );
}
