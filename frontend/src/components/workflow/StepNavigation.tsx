"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { WORKFLOW_STEPS } from "@/hooks/use-workflow-state";

type StepNavigationProps = {
  currentStep: number;
  canGoNext: boolean;
  canGoBack: boolean;
  validationMessage?: string;
  onNext: () => void;
  onBack: () => void;
  onReset?: () => void;
  isLoading?: boolean;
  nextLabel?: string;
  backLabel?: string;
};

export function StepNavigation({
  currentStep,
  canGoNext,
  canGoBack,
  validationMessage,
  onNext,
  onBack,
  onReset,
  isLoading = false,
  nextLabel,
  backLabel,
}: StepNavigationProps) {
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === WORKFLOW_STEPS.length;

  const getNextLabel = () => {
    if (nextLabel) return nextLabel;
    if (isLastStep) return "Complete";
    return "Next";
  };

  const getBackLabel = () => {
    if (backLabel) return backLabel;
    return "Back";
  };

  return (
    <div className="border-t border-border bg-card/50 px-6 py-4">
      {/* Validation message */}
      {validationMessage && !canGoNext && (
        <div className="mb-3 flex items-center gap-2 text-sm text-amber-400">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>{validationMessage}</span>
        </div>
      )}

      {/* Navigation controls */}
      <div className="flex items-center justify-between">
        {/* Left side: Back button */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={!canGoBack || isFirstStep || isLoading}
            className="gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {getBackLabel()}
          </Button>

          {onReset && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              disabled={isLoading}
              className="text-muted-foreground hover:text-destructive"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Reset
            </Button>
          )}
        </div>

        {/* Center: Step counter */}
        <div className="text-sm text-muted-foreground">
          Step {currentStep} of {WORKFLOW_STEPS.length}
        </div>

        {/* Right side: Next button */}
        <Button
          onClick={onNext}
          disabled={!canGoNext || isLoading}
          className={cn(
            "gap-2",
            isLastStep && canGoNext && "bg-green-600 hover:bg-green-700"
          )}
        >
          {isLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Processing...
            </>
          ) : (
            <>
              {getNextLabel()}
              {!isLastStep && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
              {isLastStep && canGoNext && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Compact variant for mobile or embedded use
export function StepNavigationCompact({
  currentStep,
  canGoNext,
  canGoBack,
  onNext,
  onBack,
  isLoading = false,
}: Pick<StepNavigationProps, "currentStep" | "canGoNext" | "canGoBack" | "onNext" | "onBack" | "isLoading">) {
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === WORKFLOW_STEPS.length;

  return (
    <div className="flex items-center justify-between gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        disabled={!canGoBack || isFirstStep || isLoading}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </Button>

      <span className="text-sm text-muted-foreground">
        {currentStep}/{WORKFLOW_STEPS.length}
      </span>

      <Button
        variant="ghost"
        size="icon"
        onClick={onNext}
        disabled={!canGoNext || isLoading}
        className={cn(isLastStep && canGoNext && "text-green-500")}
      >
        {isLastStep ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </Button>
    </div>
  );
}
