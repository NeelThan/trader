"use client";

import { cn } from "@/lib/utils";

type CalculationStep = {
  label: string;
  value: string | number;
  highlight?: boolean;
};

type CalculationDisplayProps = {
  title?: string;
  formula: string;
  steps?: CalculationStep[];
  result: {
    label: string;
    value: string | number;
    unit?: string;
  };
  className?: string;
};

export function CalculationDisplay({
  title,
  formula,
  steps = [],
  result,
  className,
}: CalculationDisplayProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/50 p-4 space-y-3",
        className
      )}
    >
      {title && (
        <div className="text-sm font-medium text-foreground">{title}</div>
      )}

      {/* Formula */}
      <div className="font-mono text-xs text-muted-foreground bg-background/50 rounded px-2 py-1">
        {formula}
      </div>

      {/* Steps */}
      {steps.length > 0 && (
        <div className="space-y-1">
          {steps.map((step, index) => (
            <div
              key={index}
              className={cn(
                "flex justify-between text-sm",
                step.highlight && "font-medium text-primary"
              )}
            >
              <span className="text-muted-foreground">{step.label}</span>
              <span className={step.highlight ? "text-primary" : ""}>
                {step.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Result */}
      <div className="flex justify-between items-center pt-2 border-t border-border">
        <span className="text-sm font-medium">{result.label}</span>
        <span className="text-lg font-bold text-primary">
          {result.value}
          {result.unit && (
            <span className="text-sm font-normal text-muted-foreground ml-1">
              {result.unit}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

type SimpleCalculationProps = {
  label: string;
  formula: string;
  value: string | number;
  unit?: string;
  className?: string;
};

export function SimpleCalculation({
  label,
  formula,
  value,
  unit,
  className,
}: SimpleCalculationProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 text-sm",
        className
      )}
    >
      <div className="flex flex-col">
        <span className="font-medium">{label}</span>
        <span className="text-xs text-muted-foreground font-mono">
          {formula}
        </span>
      </div>
      <div className="font-semibold">
        {value}
        {unit && (
          <span className="text-xs font-normal text-muted-foreground ml-1">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
