"use client";

import { MarketStatus, MARKET_STATUS_STYLES } from "@/lib/chart-constants";

type MarketStatusBadgeProps = {
  status: MarketStatus;
};

export function MarketStatusBadge({ status }: MarketStatusBadgeProps) {
  const styles = status.isOpen
    ? MARKET_STATUS_STYLES.open
    : status.isPreMarket || status.isAfterHours
    ? MARKET_STATUS_STYLES.premarket
    : MARKET_STATUS_STYLES.closed;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${styles.badge}`}
    >
      <span className={`w-2 h-2 rounded-full ${styles.dot}`} />
      {status.stateDisplay}
    </span>
  );
}
