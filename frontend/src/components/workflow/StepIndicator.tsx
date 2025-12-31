"use client";

import { cn } from "@/lib/utils";
import { WORKFLOW_STEPS } from "@/hooks/use-workflow-state";

type StepIndicatorProps = {
  currentStep: number;
  completedSteps: number[];
  onStepClick?: (step: number) => void;
  compact?: boolean;
};

export function StepIndicator({
  currentStep,
  completedSteps,
  onStepClick,
  compact = false,
}: StepIndicatorProps) {
  const getStepStatus = (stepNumber: number) => {
    if (completedSteps.includes(stepNumber)) return "completed";
    if (stepNumber === currentStep) return "current";
    if (stepNumber < currentStep) return "previous";
    return "upcoming";
  };

  const canNavigateTo = (stepNumber: number) => {
    // Can always go back to completed steps or current step
    return stepNumber <= currentStep || completedSteps.includes(stepNumber);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {WORKFLOW_STEPS.map((step, index) => {
          const status = getStepStatus(step.number);
          const isClickable = canNavigateTo(step.number) && onStepClick;

          return (
            <button
              key={step.number}
              onClick={() => isClickable && onStepClick?.(step.number)}
              disabled={!isClickable}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                status === "completed" && "bg-green-500",
                status === "current" && "bg-blue-500 ring-2 ring-blue-500/30",
                status === "previous" && "bg-gray-400",
                status === "upcoming" && "bg-gray-600",
                isClickable && "cursor-pointer hover:scale-125"
              )}
              title={`${step.number}. ${step.title}`}
            />
          );
        })}
        <span className="text-xs text-muted-foreground ml-2">
          Step {currentStep} of {WORKFLOW_STEPS.length}
        </span>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Step indicators */}
      <div className="flex items-center justify-between mb-2">
        {WORKFLOW_STEPS.map((step, index) => {
          const status = getStepStatus(step.number);
          const isClickable = canNavigateTo(step.number) && onStepClick;
          const isLast = index === WORKFLOW_STEPS.length - 1;

          return (
            <div
              key={step.number}
              className={cn("flex items-center", !isLast && "flex-1")}
            >
              {/* Step circle */}
              <button
                onClick={() => isClickable && onStepClick?.(step.number)}
                disabled={!isClickable}
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium transition-all",
                  status === "completed" && "bg-green-500 text-white",
                  status === "current" && "bg-blue-500 text-white ring-4 ring-blue-500/30",
                  status === "previous" && "bg-gray-500 text-white",
                  status === "upcoming" && "bg-gray-700 text-gray-400 border border-gray-600",
                  isClickable && "cursor-pointer hover:scale-110"
                )}
                title={step.title}
              >
                {status === "completed" ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.number
                )}
              </button>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2",
                    completedSteps.includes(step.number) ? "bg-green-500" : "bg-gray-600"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step labels */}
      <div className="flex items-center justify-between">
        {WORKFLOW_STEPS.map((step, index) => {
          const status = getStepStatus(step.number);
          const isLast = index === WORKFLOW_STEPS.length - 1;

          return (
            <div
              key={step.number}
              className={cn(
                "text-center",
                !isLast && "flex-1"
              )}
            >
              <span
                className={cn(
                  "text-xs",
                  status === "current" && "text-blue-400 font-medium",
                  status === "completed" && "text-green-400",
                  status === "previous" && "text-gray-400",
                  status === "upcoming" && "text-gray-500"
                )}
              >
                {step.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Phase grouping for visual organization
type PhaseInfo = {
  name: string;
  steps: number[];
  color: string;
};

const PHASES: PhaseInfo[] = [
  { name: "Analysis", steps: [1, 2], color: "text-blue-400" },
  { name: "Setup", steps: [3, 4], color: "text-purple-400" },
  { name: "Entry", steps: [5], color: "text-amber-400" },
  { name: "Risk", steps: [6], color: "text-orange-400" },
  { name: "Execute", steps: [7, 8], color: "text-green-400" },
];

export function StepIndicatorWithPhases({
  currentStep,
  completedSteps,
  onStepClick,
}: StepIndicatorProps) {
  const getCurrentPhase = () => {
    return PHASES.find(phase => phase.steps.includes(currentStep)) || PHASES[0];
  };

  const getStepStatus = (stepNumber: number) => {
    if (completedSteps.includes(stepNumber)) return "completed";
    if (stepNumber === currentStep) return "current";
    if (stepNumber < currentStep) return "previous";
    return "upcoming";
  };

  const canNavigateTo = (stepNumber: number) => {
    return stepNumber <= currentStep || completedSteps.includes(stepNumber);
  };

  const currentPhase = getCurrentPhase();

  return (
    <div className="space-y-4">
      {/* Phase indicator */}
      <div className="flex items-center justify-center gap-2">
        {PHASES.map((phase, index) => {
          const isActive = phase === currentPhase;
          const isComplete = phase.steps.every(s => completedSteps.includes(s));

          return (
            <div key={phase.name} className="flex items-center">
              <div
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-all",
                  isComplete && "bg-green-500/20 text-green-400",
                  isActive && !isComplete && "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50",
                  !isActive && !isComplete && "bg-gray-800 text-gray-500"
                )}
              >
                {phase.name}
              </div>
              {index < PHASES.length - 1 && (
                <div className={cn(
                  "w-4 h-px mx-1",
                  isComplete ? "bg-green-500" : "bg-gray-700"
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* Detailed steps */}
      <div className="flex items-center gap-1 justify-center">
        {WORKFLOW_STEPS.map((step) => {
          const status = getStepStatus(step.number);
          const isClickable = canNavigateTo(step.number) && onStepClick;
          const phase = PHASES.find(p => p.steps.includes(step.number));

          return (
            <button
              key={step.number}
              onClick={() => isClickable && onStepClick?.(step.number)}
              disabled={!isClickable}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-1 rounded transition-all",
                status === "current" && "bg-blue-500/10",
                isClickable && "cursor-pointer hover:bg-white/5"
              )}
              title={step.title}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                  status === "completed" && "bg-green-500 text-white",
                  status === "current" && "bg-blue-500 text-white",
                  status === "previous" && "bg-gray-600 text-white",
                  status === "upcoming" && "bg-gray-800 text-gray-500 border border-gray-700"
                )}
              >
                {status === "completed" ? "✓" : step.number}
              </div>
              <span className={cn(
                "text-[10px]",
                status === "current" && phase?.color,
                status !== "current" && "text-gray-500"
              )}>
                {step.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Current step title */}
      <div className="text-center">
        <span className="text-sm text-muted-foreground">Step {currentStep}:</span>
        <span className="text-sm text-foreground ml-2">
          {WORKFLOW_STEPS.find(s => s.number === currentStep)?.title}
        </span>
      </div>
    </div>
  );
}
