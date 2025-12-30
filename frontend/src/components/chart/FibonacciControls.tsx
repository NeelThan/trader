"use client";

import { Button } from "@/components/ui/button";
import { FibonacciVisibility } from "@/lib/chart-constants";

type FibonacciControlsProps = {
  visibility: FibonacciVisibility;
  onToggle: (type: keyof FibonacciVisibility) => void;
  onToggleAll: () => void;
};

export function FibonacciControls({
  visibility,
  onToggle,
  onToggleAll,
}: FibonacciControlsProps) {
  const anyVisible = Object.values(visibility).some(Boolean);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground mr-2">Fibonacci:</span>
      <Button
        variant={anyVisible ? "default" : "outline"}
        size="sm"
        onClick={onToggleAll}
      >
        {anyVisible ? "Hide All" : "Show All"}
      </Button>
      <div className="w-px h-6 bg-border mx-2" />
      <Button
        variant={visibility.retracement ? "default" : "outline"}
        size="sm"
        onClick={() => onToggle("retracement")}
        className={visibility.retracement ? "bg-gray-600 hover:bg-gray-700" : ""}
      >
        Retracement
      </Button>
      <Button
        variant={visibility.extension ? "default" : "outline"}
        size="sm"
        onClick={() => onToggle("extension")}
        className={visibility.extension ? "bg-blue-600 hover:bg-blue-700" : ""}
      >
        Extension
      </Button>
      <Button
        variant={visibility.expansion ? "default" : "outline"}
        size="sm"
        onClick={() => onToggle("expansion")}
        className={visibility.expansion ? "bg-pink-600 hover:bg-pink-700" : ""}
      >
        Expansion
      </Button>
      <Button
        variant={visibility.projection ? "default" : "outline"}
        size="sm"
        onClick={() => onToggle("projection")}
        className={visibility.projection ? "bg-teal-600 hover:bg-teal-700" : ""}
      >
        Projection
      </Button>
    </div>
  );
}
