import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState, useCallback, useMemo } from "react";
import { TradeManagementPanel } from "./TradeManagementPanel";
import { MarketDataProvider } from "@/contexts/MarketDataContext";
import type { TradeStatus, TradeLogEntry } from "@/hooks/use-workflow-state";

const meta: Meta<typeof TradeManagementPanel> = {
  title: "Trading/Tools/TradeManagementPanel",
  component: TradeManagementPanel,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    backgrounds: { default: "dark" },
  },
  decorators: [
    (Story) => (
      <MarketDataProvider>
        <div className="max-w-2xl mx-auto p-6 bg-background">
          <Story />
        </div>
      </MarketDataProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TradeManagementPanel>;

// Interactive wrapper
function InteractiveTradeManagement({
  initialStatus = "pending" as TradeStatus,
  initialPnL = 0,
  direction = "GO_LONG" as const,
}: {
  initialStatus?: TradeStatus;
  initialPnL?: number;
  direction?: "GO_LONG" | "GO_SHORT";
}) {
  const [state, setState] = useState<{
    tradeStatus: TradeStatus;
    currentPnL: number;
    breakEvenPrice: number;
    freeTradeActive: boolean;
    trailingEnabled: boolean;
    trailingStopPrice: number | null;
  }>({
    tradeStatus: initialStatus,
    currentPnL: initialPnL,
    breakEvenPrice: 5000,
    freeTradeActive: false,
    trailingEnabled: false,
    trailingStopPrice: null,
  });

  const [tradeLog, setTradeLog] = useState<TradeLogEntry[]>([]);

  const handleAddLogEntry = useCallback((entry: Omit<TradeLogEntry, "timestamp">) => {
    setTradeLog((prev) => [
      ...prev,
      { ...entry, timestamp: new Date().toISOString() },
    ]);
  }, []);

  const handleChange = useCallback((updates: Partial<typeof state>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Memoize targets to prevent unnecessary re-renders
  const targets = useMemo(
    () => (direction === "GO_LONG" ? [5100, 5200, 5300] : [4900, 4800, 4700]),
    [direction]
  );

  const stopLoss = direction === "GO_LONG" ? 4950 : 5050;

  return (
    <TradeManagementPanel
      symbol="SPX"
      timeframe="1D"
      tradeDirection={direction}
      entryPrice={5000}
      stopLoss={stopLoss}
      targets={targets}
      positionSize={10}
      tradeStatus={state.tradeStatus}
      currentPnL={state.currentPnL}
      breakEvenPrice={state.breakEvenPrice}
      freeTradeActive={state.freeTradeActive}
      trailingEnabled={state.trailingEnabled}
      trailingStopPrice={state.trailingStopPrice}
      tradeLog={tradeLog}
      onAddLogEntry={handleAddLogEntry}
      onChange={handleChange}
      workflowMode
      onComplete={() => console.log("Trade completed!")}
    />
  );
}

export const PendingTrade: Story = {
  name: "Pending - Ready to Activate",
  render: () => <InteractiveTradeManagement initialStatus="pending" />,
};

export const ActiveTrade: Story = {
  name: "Active Trade - In Profit",
  render: () => <InteractiveTradeManagement initialStatus="active" initialPnL={250} />,
};

export const ActiveTradeInLoss: Story = {
  name: "Active Trade - In Loss",
  render: () => <InteractiveTradeManagement initialStatus="active" initialPnL={-150} />,
};

// Static targets array to avoid re-renders
const LONG_TARGETS = [5100, 5200, 5300];
const BREAKEVEN_LOG: TradeLogEntry[] = [
  {
    action: "entry",
    price: 5000,
    note: "Entered LONG position",
    timestamp: "2024-01-01T10:00:00.000Z",
  },
  {
    action: "stop_moved",
    price: 5000,
    note: "Stop moved to breakeven - FREE TRADE",
    timestamp: "2024-01-01T10:30:00.000Z",
  },
];

export const AtBreakeven: Story = {
  name: "At Breakeven - Free Trade",
  render: () => (
    <TradeManagementPanel
      symbol="SPX"
      timeframe="1D"
      tradeDirection="GO_LONG"
      entryPrice={5000}
      stopLoss={4950}
      targets={LONG_TARGETS}
      positionSize={10}
      tradeStatus="at_breakeven"
      currentPnL={500}
      breakEvenPrice={5000}
      freeTradeActive={true}
      trailingEnabled={false}
      trailingStopPrice={null}
      tradeLog={BREAKEVEN_LOG}
      onAddLogEntry={() => {}}
      onChange={() => {}}
      workflowMode
      onComplete={() => console.log("Trade completed!")}
    />
  ),
};

const TRAILING_LOG: TradeLogEntry[] = [
  {
    action: "entry",
    price: 5000,
    note: "Entered LONG position",
    timestamp: "2024-01-01T08:00:00.000Z",
  },
  {
    action: "stop_moved",
    price: 5000,
    note: "Stop moved to breakeven - FREE TRADE",
    timestamp: "2024-01-01T09:00:00.000Z",
  },
  {
    action: "stop_moved",
    price: 5025,
    note: "Trailing stop enabled",
    timestamp: "2024-01-01T09:30:00.000Z",
  },
];

const CLOSED_WIN_LOG: TradeLogEntry[] = [
  {
    action: "entry",
    price: 5000,
    note: "Entered LONG position",
    timestamp: "2024-01-01T10:00:00.000Z",
  },
  {
    action: "stop_moved",
    price: 5000,
    note: "Stop moved to breakeven",
    timestamp: "2024-01-01T11:30:00.000Z",
  },
  {
    action: "target_hit",
    price: 5100,
    note: "Target 1 reached",
    timestamp: "2024-01-01T12:00:00.000Z",
  },
  {
    action: "exit",
    price: 5100,
    note: "Manual exit at T1",
    timestamp: "2024-01-01T12:00:00.000Z",
  },
];

const CLOSED_LOSS_LOG: TradeLogEntry[] = [
  {
    action: "entry",
    price: 5000,
    note: "Entered LONG position",
    timestamp: "2024-01-01T10:00:00.000Z",
  },
  {
    action: "exit",
    price: 4950,
    note: "Stop loss hit",
    timestamp: "2024-01-01T11:00:00.000Z",
  },
];

const SINGLE_TARGET = [5100];

export const TrailingStop: Story = {
  name: "Trailing Stop Active",
  render: () => (
    <TradeManagementPanel
      symbol="SPX"
      timeframe="1D"
      tradeDirection="GO_LONG"
      entryPrice={5000}
      stopLoss={4950}
      targets={LONG_TARGETS}
      positionSize={10}
      tradeStatus="trailing"
      currentPnL={750}
      breakEvenPrice={5000}
      freeTradeActive={true}
      trailingEnabled={true}
      trailingStopPrice={5025}
      tradeLog={TRAILING_LOG}
      onAddLogEntry={() => {}}
      onChange={() => {}}
      workflowMode
      onComplete={() => console.log("Trade completed!")}
    />
  ),
};

export const ClosedTradeWin: Story = {
  name: "Closed Trade - Winner",
  render: () => (
    <TradeManagementPanel
      symbol="SPX"
      timeframe="1D"
      tradeDirection="GO_LONG"
      entryPrice={5000}
      stopLoss={4950}
      targets={LONG_TARGETS}
      positionSize={10}
      tradeStatus="closed"
      currentPnL={1000}
      breakEvenPrice={5000}
      freeTradeActive={true}
      trailingEnabled={false}
      trailingStopPrice={null}
      tradeLog={CLOSED_WIN_LOG}
      onAddLogEntry={() => {}}
      onChange={() => {}}
      workflowMode
      onComplete={() => console.log("Start new trade!")}
    />
  ),
};

export const ClosedTradeLoss: Story = {
  name: "Closed Trade - Loser",
  render: () => (
    <TradeManagementPanel
      symbol="SPX"
      timeframe="1D"
      tradeDirection="GO_LONG"
      entryPrice={5000}
      stopLoss={4950}
      targets={LONG_TARGETS}
      positionSize={10}
      tradeStatus="closed"
      currentPnL={-500}
      breakEvenPrice={5000}
      freeTradeActive={false}
      trailingEnabled={false}
      trailingStopPrice={null}
      tradeLog={CLOSED_LOSS_LOG}
      onAddLogEntry={() => {}}
      onChange={() => {}}
      workflowMode
      onComplete={() => console.log("Start new trade!")}
    />
  ),
};

export const ShortPosition: Story = {
  name: "Short Position",
  render: () => <InteractiveTradeManagement direction="GO_SHORT" initialStatus="active" initialPnL={200} />,
};

const EMPTY_LOG: TradeLogEntry[] = [];

export const Compact: Story = {
  name: "Compact Display",
  render: () => (
    <TradeManagementPanel
      symbol="SPX"
      timeframe="1D"
      tradeDirection="GO_LONG"
      entryPrice={5000}
      stopLoss={4950}
      targets={SINGLE_TARGET}
      positionSize={10}
      tradeStatus="active"
      currentPnL={350}
      breakEvenPrice={5000}
      freeTradeActive={false}
      trailingEnabled={false}
      trailingStopPrice={null}
      tradeLog={EMPTY_LOG}
      onAddLogEntry={() => {}}
      onChange={() => {}}
      compact
    />
  ),
};
