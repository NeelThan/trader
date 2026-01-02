"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type InfoTooltipProps = {
  content: string | React.ReactNode;
  title?: string;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
  iconClassName?: string;
};

export function InfoTooltip({
  content,
  title,
  side = "top",
  className,
  iconClassName,
}: InfoTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center rounded-full",
            "w-4 h-4 text-xs font-medium",
            "bg-muted text-muted-foreground",
            "hover:bg-primary/20 hover:text-primary",
            "transition-colors cursor-help",
            iconClassName
          )}
          aria-label="More information"
        >
          ?
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        className={cn("max-w-xs p-3 text-sm", className)}
      >
        {title && (
          <div className="font-semibold mb-1 text-foreground">{title}</div>
        )}
        <div className="text-muted-foreground">
          {typeof content === "string" ? <p>{content}</p> : content}
        </div>
      </PopoverContent>
    </Popover>
  );
}

type InfoLabelProps = {
  label: string;
  tooltip: string;
  tooltipTitle?: string;
  className?: string;
};

export function InfoLabel({
  label,
  tooltip,
  tooltipTitle,
  className,
}: InfoLabelProps) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span>{label}</span>
      <InfoTooltip content={tooltip} title={tooltipTitle} />
    </span>
  );
}
