"use client";

import { Button } from "@/components/ui/button";

type ChartToolbarProps = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
};

export function ChartToolbar({
  onZoomIn,
  onZoomOut,
  onResetView,
}: ChartToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-card/50 border backdrop-blur-sm">
      <span className="text-sm text-muted-foreground mr-1">Zoom:</span>
      <Button
        variant="outline"
        size="sm"
        onClick={onZoomIn}
        title="Zoom In (or use mouse wheel)"
      >
        +
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onZoomOut}
        title="Zoom Out (or use mouse wheel)"
      >
        −
      </Button>
      <div className="w-px h-5 bg-border mx-1" />
      <Button
        variant="outline"
        size="sm"
        onClick={onResetView}
        title="Reset to default view"
      >
        Reset View
      </Button>
      <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
        Tip: Scroll to zoom, drag to pan
      </span>
    </div>
  );
}
