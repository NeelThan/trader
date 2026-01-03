/**
 * Trade Log Component
 *
 * Reusable component for displaying a chronological log of trade actions.
 * Used in ManagePanel and can be used in journal/trade review screens.
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPriceSimple } from "@/lib/format-utils";

/**
 * Trade log entry action types
 */
export type TradeLogAction =
  | "entry"
  | "exit"
  | "stop_moved"
  | "target_hit"
  | "note";

/**
 * Trade log entry
 */
export type TradeLogEntry = {
  action: TradeLogAction;
  price: number;
  note: string;
  timestamp: string;
};

export type TradeLogProps = {
  /** List of log entries to display */
  entries: TradeLogEntry[];
  /** Optional title (default: "Trade Log") */
  title?: string;
  /** Optional max height for scrolling */
  maxHeight?: string;
  /** Whether to show the card wrapper (default: true) */
  showCard?: boolean;
  /** Empty state message */
  emptyMessage?: string;
};

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString();
}

/**
 * Get border color based on action type
 */
function getActionBorderColor(action: TradeLogAction): string {
  switch (action) {
    case "entry":
      return "border-green-400";
    case "exit":
      return "border-red-400";
    case "target_hit":
      return "border-blue-400";
    case "stop_moved":
      return "border-amber-400";
    case "note":
    default:
      return "border-muted";
  }
}

/**
 * Trade log entry row component
 */
function TradeLogEntryRow({ entry }: { entry: TradeLogEntry }) {
  return (
    <div
      className={`text-sm border-l-2 ${getActionBorderColor(entry.action)} pl-2 py-1`}
    >
      <div className="font-medium">{entry.note}</div>
      <div className="text-xs text-muted-foreground">
        @ {formatPriceSimple(entry.price)} - {formatTimestamp(entry.timestamp)}
      </div>
    </div>
  );
}

/**
 * Trade log entries list (without card wrapper)
 */
export function TradeLogList({
  entries,
  maxHeight = "10rem",
  emptyMessage = "No entries yet",
}: Pick<TradeLogProps, "entries" | "maxHeight" | "emptyMessage">) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2 overflow-y-auto" style={{ maxHeight }}>
      {entries.map((entry, index) => (
        <TradeLogEntryRow key={index} entry={entry} />
      ))}
    </div>
  );
}

/**
 * Trade log with card wrapper
 */
export function TradeLog({
  entries,
  title = "Trade Log",
  maxHeight = "10rem",
  showCard = true,
  emptyMessage = "No entries yet",
}: TradeLogProps) {
  const content = (
    <TradeLogList
      entries={entries}
      maxHeight={maxHeight}
      emptyMessage={emptyMessage}
    />
  );

  if (!showCard) {
    return content;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
