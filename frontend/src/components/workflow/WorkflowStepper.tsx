"use client";

import { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useWorkflowState, WORKFLOW_STEPS } from "@/hooks/use-workflow-state";
import { StepIndicator, StepIndicatorWithPhases } from "./StepIndicator";
import { StepNavigation } from "./StepNavigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Step content components (placeholders for now)
import { MarketTimeframeSelector } from "@/components/trading/tools/MarketTimeframeSelector";
import { TrendDecisionPanel } from "@/components/trading/tools/TrendDecisionPanel";
import { FibonacciSetupTool } from "@/components/trading/tools/FibonacciSetupTool";
import { PatternScannerTool } from "@/components/trading/tools/PatternScannerTool";
import { EntrySignalTool } from "@/components/trading/tools/EntrySignalTool";
import { PositionSizingTool } from "@/components/trading/tools/PositionSizingTool";
import { PreTradeChecklist } from "@/components/trading/tools/PreTradeChecklist";
import { TradeManagementPanel } from "@/components/trading/tools/TradeManagementPanel";

type WorkflowStepperProps = {
  showPhases?: boolean;
  className?: string;
};

export function WorkflowStepper({ showPhases = false, className }: WorkflowStepperProps) {
  const {
    state,
    setState,
    resetWorkflow,
    goToStep,
    nextStep,
    prevStep,
    updateChecklist,
    addTradeLogEntry,
    getStepValidation,
    getCurrentStepInfo,
  } = useWorkflowState();

  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Memoize the onChange handler to prevent infinite re-renders
  // This is critical - without memoization, components with onChange in useEffect deps will loop
  const handleStateChange = useCallback((updates: Parameters<typeof setState>[0]) => {
    setState(updates);
  }, [setState]);

  const currentStepInfo = getCurrentStepInfo();
  const currentValidation = getStepValidation(state.currentStep);

  // Check if we can proceed to next step
  const canGoNext = useMemo(() => {
    if (state.currentStep >= WORKFLOW_STEPS.length) return false;
    return currentValidation.valid;
  }, [state.currentStep, currentValidation.valid]);

  const canGoBack = state.currentStep > 1;

  const handleNext = useCallback(() => {
    if (!canGoNext) return;
    setIsTransitioning(true);
    const success = nextStep();
    setTimeout(() => setIsTransitioning(false), 300);
    return success;
  }, [canGoNext, nextStep]);

  const handleBack = useCallback(() => {
    if (!canGoBack) return;
    setIsTransitioning(true);
    const success = prevStep();
    setTimeout(() => setIsTransitioning(false), 300);
    return success;
  }, [canGoBack, prevStep]);

  const handleStepClick = useCallback((step: number) => {
    if (step === state.currentStep) return;
    setIsTransitioning(true);
    goToStep(step);
    setTimeout(() => setIsTransitioning(false), 300);
  }, [state.currentStep, goToStep]);

  const handleReset = useCallback(() => {
    setShowResetDialog(true);
  }, []);

  const confirmReset = useCallback(() => {
    resetWorkflow();
    setShowResetDialog(false);
  }, [resetWorkflow]);

  // Render the current step's content
  const renderStepContent = () => {
    const commonProps = {
      workflowMode: true,
      onComplete: handleNext,
    };

    switch (state.currentStep) {
      case 1:
        return (
          <MarketTimeframeSelector
            {...commonProps}
            symbol={state.symbol}
            higherTimeframe={state.higherTimeframe}
            lowerTimeframe={state.lowerTimeframe}
            tradingStyle={state.tradingStyle}
            dataSource={state.dataSource}
            onChange={handleStateChange}
          />
        );

      case 2:
        return (
          <TrendDecisionPanel
            {...commonProps}
            symbol={state.symbol}
            higherTimeframe={state.higherTimeframe}
            lowerTimeframe={state.lowerTimeframe}
            higherTrend={state.higherTrend}
            lowerTrend={state.lowerTrend}
            tradeDirection={state.tradeDirection}
            trendConfidence={state.trendConfidence}
            onChange={handleStateChange}
          />
        );

      case 3:
        return (
          <FibonacciSetupTool
            {...commonProps}
            symbol={state.symbol}
            timeframe={state.lowerTimeframe}
            pivots={state.pivots}
            fibTool={state.fibTool}
            fibLevels={state.fibLevels}
            selectedLevelIndex={state.selectedLevelIndex}
            tradeDirection={state.tradeDirection}
            dataSource={state.dataSource}
            onChange={handleStateChange}
          />
        );

      case 4:
        return (
          <PatternScannerTool
            {...commonProps}
            symbol={state.symbol}
            timeframe={state.lowerTimeframe}
            fibLevels={state.fibLevels}
            tradeDirection={state.tradeDirection}
            detectedPatterns={state.detectedPatterns}
            detectedSignals={state.detectedSignals}
            scanCompleted={state.scanCompleted}
            onChange={handleStateChange}
          />
        );

      case 5:
        return (
          <EntrySignalTool
            {...commonProps}
            symbol={state.symbol}
            timeframe={state.lowerTimeframe}
            fibLevels={state.fibLevels}
            tradeDirection={state.tradeDirection}
            selectedLevel={state.selectedLevel}
            signalBar={state.signalBar}
            entryConfirmed={state.entryConfirmed}
            detectedSignals={state.detectedSignals}
            onChange={handleStateChange}
          />
        );

      case 6:
        return (
          <PositionSizingTool
            {...commonProps}
            symbol={state.symbol}
            tradeDirection={state.tradeDirection}
            selectedLevel={state.selectedLevel}
            fibLevels={state.fibLevels}
            entryPrice={state.entryPrice}
            stopLoss={state.stopLoss}
            targets={state.targets}
            positionSize={state.positionSize}
            riskRewardRatio={state.riskRewardRatio}
            riskAmount={state.riskAmount}
            onChange={handleStateChange}
          />
        );

      case 7:
        return (
          <PreTradeChecklist
            {...commonProps}
            checklistItems={state.checklistItems}
            goNoGo={state.goNoGo}
            onUpdateChecklist={updateChecklist}
            // Summary data for display
            symbol={state.symbol}
            tradeDirection={state.tradeDirection}
            entryPrice={state.entryPrice}
            stopLoss={state.stopLoss}
            targets={state.targets}
            positionSize={state.positionSize}
            riskRewardRatio={state.riskRewardRatio}
          />
        );

      case 8:
        return (
          <TradeManagementPanel
            {...commonProps}
            symbol={state.symbol}
            timeframe={state.lowerTimeframe}
            tradeDirection={state.tradeDirection}
            entryPrice={state.entryPrice}
            stopLoss={state.stopLoss}
            targets={state.targets}
            positionSize={state.positionSize}
            tradeStatus={state.tradeStatus}
            currentPnL={state.currentPnL}
            breakEvenPrice={state.breakEvenPrice}
            freeTradeActive={state.freeTradeActive}
            trailingEnabled={state.trailingEnabled}
            trailingStopPrice={state.trailingStopPrice}
            tradeLog={state.tradeLog}
            onAddLogEntry={addTradeLogEntry}
            onChange={handleStateChange}
          />
        );

      default:
        return (
          <div className="text-center py-12 text-muted-foreground">
            Step {state.currentStep} content not implemented
          </div>
        );
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Step Indicator */}
      <div className="border-b border-border bg-card px-6 py-4">
        {showPhases ? (
          <StepIndicatorWithPhases
            currentStep={state.currentStep}
            completedSteps={state.completedSteps}
            onStepClick={handleStepClick}
          />
        ) : (
          <StepIndicator
            currentStep={state.currentStep}
            completedSteps={state.completedSteps}
            onStepClick={handleStepClick}
          />
        )}
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-auto">
        <div className="container max-w-4xl mx-auto py-6 px-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-semibold">
                  {state.currentStep}
                </div>
                <div>
                  <CardTitle>{currentStepInfo.title}</CardTitle>
                  <CardDescription>
                    {getStepDescription(state.currentStep)}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "transition-opacity duration-200",
                  isTransitioning ? "opacity-50" : "opacity-100"
                )}
              >
                {renderStepContent()}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Step Navigation */}
      <StepNavigation
        currentStep={state.currentStep}
        canGoNext={canGoNext}
        canGoBack={canGoBack}
        validationMessage={currentValidation.reason}
        onNext={handleNext}
        onBack={handleBack}
        onReset={handleReset}
        isLoading={isTransitioning}
        nextLabel={state.currentStep === 7 && state.goNoGo === "GO" ? "Execute Trade" : undefined}
      />

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all your progress and start from Step 1. Any unsaved trade
              information will be lost. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReset}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset Workflow
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Helper function for step descriptions
function getStepDescription(step: number): string {
  switch (step) {
    case 1:
      return "Choose your market symbol and timeframes for analysis";
    case 2:
      return "Verify trend alignment across timeframes for trade direction";
    case 3:
      return "Identify pivots and calculate Fibonacci levels";
    case 4:
      return "Scan for harmonic patterns and signal bars at key levels";
    case 5:
      return "Confirm entry signal at selected Fibonacci level";
    case 6:
      return "Calculate position size and risk parameters";
    case 7:
      return "Review all conditions before executing the trade";
    case 8:
      return "Monitor and manage your active position";
    default:
      return "";
  }
}
