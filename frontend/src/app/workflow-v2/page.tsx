"use client";

/**
 * Workflow V2 - Chart-Centric Trading
 *
 * A fluid, discovery-first workflow that keeps the chart always visible.
 * Shows trade opportunities across all timeframes, not locked to a "style".
 *
 * Phases: DISCOVER → VALIDATE → SIZE → EXECUTE → MANAGE
 *
 * State is persisted to localStorage so users don't lose progress on refresh.
 */

import { useCallback, useEffect } from "react";
import { WorkflowV2Layout } from "@/components/workflow-v2/WorkflowV2Layout";
import { DiscoveryPanel } from "@/components/workflow-v2/DiscoveryPanel";
import { ValidationPanel } from "@/components/workflow-v2/ValidationPanel";
import { SizingPanel } from "@/components/workflow-v2/SizingPanel";
import { ExecutionPanel } from "@/components/workflow-v2/ExecutionPanel";
import { ManagePanel } from "@/components/workflow-v2/ManagePanel";
import { useTradeDiscovery } from "@/hooks/use-trade-discovery";
import { useTradeValidation } from "@/hooks/use-trade-validation";
import { useTradeExecution } from "@/hooks/use-trade-execution";
import { useWorkflowV2State } from "@/hooks/use-workflow-v2-state";

export type WorkflowPhase = "discover" | "validate" | "size" | "execute" | "manage";

export default function WorkflowV2Page() {
  // Persisted workflow state
  const workflow = useWorkflowV2State();

  // Trade discovery - finds opportunities across all timeframes
  const discovery = useTradeDiscovery({ symbol: workflow.symbol });

  // Trade validation - checks if selected opportunity meets criteria
  const validation = useTradeValidation({
    opportunity: workflow.opportunity,
    enabled: workflow.phase === "validate",
  });

  // Trade execution - handles sizing and execution
  const execution = useTradeExecution({
    opportunity: workflow.opportunity,
    validation: validation.result,
    enabled: workflow.phase === "size" || workflow.phase === "execute",
    // Pass persisted account settings
    initialAccountSettings: workflow.accountSettings,
    initialSizingOverrides: workflow.sizingOverrides,
  });

  // Sync account settings changes back to persisted state
  useEffect(() => {
    if (execution.sizing.accountBalance !== workflow.accountSettings.accountBalance ||
        execution.sizing.riskPercentage !== workflow.accountSettings.riskPercentage) {
      workflow.setAccountSettings({
        accountBalance: execution.sizing.accountBalance,
        riskPercentage: execution.sizing.riskPercentage,
      });
    }
  }, [execution.sizing.accountBalance, execution.sizing.riskPercentage, workflow]);

  // Sync sizing overrides (user modifications to entry/stop/targets) back to persisted state
  useEffect(() => {
    const overridesChanged =
      execution.tradeOverrides.entryPrice !== workflow.sizingOverrides.entryPrice ||
      execution.tradeOverrides.stopLoss !== workflow.sizingOverrides.stopLoss ||
      JSON.stringify(execution.tradeOverrides.targets) !== JSON.stringify(workflow.sizingOverrides.targets);

    if (overridesChanged) {
      workflow.setSizingOverrides(execution.tradeOverrides);
    }
  }, [execution.tradeOverrides, workflow]);

  // Handle execution complete - store journal entry ID
  const handleExecuteComplete = useCallback(() => {
    workflow.startManaging(execution.journalEntryId);
  }, [workflow, execution.journalEntryId]);

  // Render the appropriate panel based on phase
  const renderSidePanel = () => {
    // Show loading state while restoring
    if (workflow.isRestoring) {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <p className="text-muted-foreground">Restoring session...</p>
        </div>
      );
    }

    switch (workflow.phase) {
      case "discover":
        return (
          <DiscoveryPanel
            opportunities={discovery.opportunities}
            isLoading={discovery.isLoading}
            hasError={discovery.hasError}
            errors={discovery.errors}
            onRefresh={discovery.refresh}
            onSelectOpportunity={workflow.selectOpportunity}
            symbol={workflow.symbol}
          />
        );
      case "validate":
        return (
          <ValidationPanel
            opportunity={workflow.opportunity!}
            validation={validation.result}
            isLoading={validation.isLoading}
            onBack={workflow.backToDiscovery}
            onProceed={workflow.proceedToSize}
          />
        );
      case "size":
        return (
          <SizingPanel
            opportunity={workflow.opportunity!}
            sizing={execution.sizing}
            validation={validation.result}
            capturedValidation={execution.capturedValidation}
            hasCapturedSuggestions={execution.hasCapturedSuggestions}
            onUpdateSizing={execution.updateSizing}
            onRestoreSuggested={execution.restoreSuggested}
            onBack={() => workflow.setPhase("validate")}
            onProceed={workflow.proceedToExecute}
          />
        );
      case "execute":
        return (
          <ExecutionPanel
            opportunity={workflow.opportunity!}
            sizing={execution.sizing}
            validation={validation.result}
            onBack={() => workflow.setPhase("size")}
            onExecute={execution.execute}
            onComplete={handleExecuteComplete}
            isExecuting={execution.isExecuting}
          />
        );
      case "manage":
        return (
          <ManagePanel
            opportunity={workflow.opportunity!}
            sizing={execution.sizing}
            journalEntryId={workflow.journalEntryId}
            onClose={workflow.finishManaging}
          />
        );
    }
  };

  return (
    <WorkflowV2Layout
      symbol={workflow.symbol}
      onSymbolChange={workflow.setSymbol}
      timeframe={workflow.timeframe}
      onTimeframeChange={workflow.setTimeframe}
      phase={workflow.phase}
      opportunity={workflow.opportunity}
      discovery={discovery}
    >
      {renderSidePanel()}
    </WorkflowV2Layout>
  );
}
