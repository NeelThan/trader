import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { PositionSizingTool } from "./PositionSizingTool";
import type { FibonacciLevel } from "@/hooks/use-workflow-state";

const meta: Meta<typeof PositionSizingTool> = {
  title: "Trading/Tools/PositionSizingTool",
  component: PositionSizingTool,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    backgrounds: { default: "dark" },
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl mx-auto p-6 bg-background">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PositionSizingTool>;

// Interactive wrapper for state management
function InteractivePositionSizing({
  initialEntry = 0,
  initialStopLoss = 0,
  initialTargets = [] as number[],
  fibLevels = [] as FibonacciLevel[],
  workflowMode = false,
}: {
  initialEntry?: number;
  initialStopLoss?: number;
  initialTargets?: number[];
  fibLevels?: FibonacciLevel[];
  workflowMode?: boolean;
}) {
  const [state, setState] = useState({
    entryPrice: initialEntry,
    stopLoss: initialStopLoss,
    targets: initialTargets,
    positionSize: 0,
    riskRewardRatio: 0,
    riskAmount: 0,
  });

  return (
    <PositionSizingTool
      symbol="SPX"
      tradeDirection="GO_LONG"
      selectedLevel={5000}
      fibLevels={fibLevels}
      entryPrice={state.entryPrice}
      stopLoss={state.stopLoss}
      targets={state.targets}
      positionSize={state.positionSize}
      riskRewardRatio={state.riskRewardRatio}
      riskAmount={state.riskAmount}
      onChange={(updates) => setState((prev) => ({ ...prev, ...updates }))}
      workflowMode={workflowMode}
      onComplete={() => console.log("Complete clicked!")}
    />
  );
}

export const Default: Story = {
  render: () => <InteractivePositionSizing />,
};

export const WithPrefilledData: Story = {
  name: "With Prefilled Entry/Stop",
  render: () => (
    <InteractivePositionSizing
      initialEntry={5000}
      initialStopLoss={4950}
      initialTargets={[5100, 5200]}
    />
  ),
};

export const WithFibLevels: Story = {
  name: "With Fibonacci Levels",
  render: () => (
    <InteractivePositionSizing
      initialEntry={5000}
      fibLevels={[
        { ratio: 0.382, price: 4962, label: "38.2%" },
        { ratio: 0.5, price: 4950, label: "50.0%" },
        { ratio: 0.618, price: 4938, label: "61.8%" },
        { ratio: 1.272, price: 5136, label: "127.2%" },
        { ratio: 1.618, price: 5209, label: "161.8%" },
      ]}
    />
  ),
};

function ShortPositionWrapper() {
  const [state, setState] = useState({
    entryPrice: 5000,
    stopLoss: 5050,
    targets: [4900, 4800],
    positionSize: 0,
    riskRewardRatio: 0,
    riskAmount: 0,
  });

  return (
    <PositionSizingTool
      symbol="SPX"
      tradeDirection="GO_SHORT"
      selectedLevel={5000}
      fibLevels={[]}
      entryPrice={state.entryPrice}
      stopLoss={state.stopLoss}
      targets={state.targets}
      positionSize={state.positionSize}
      riskRewardRatio={state.riskRewardRatio}
      riskAmount={state.riskAmount}
      onChange={(updates) => setState((prev) => ({ ...prev, ...updates }))}
    />
  );
}

export const ShortPosition: Story = {
  name: "Short Position Setup",
  render: () => <ShortPositionWrapper />,
};

export const WorkflowMode: Story = {
  name: "Workflow Mode (with Continue Button)",
  render: () => <InteractivePositionSizing workflowMode />,
};

export const Compact: Story = {
  name: "Compact Display",
  render: () => (
    <PositionSizingTool
      symbol="BTCUSD"
      tradeDirection="GO_LONG"
      selectedLevel={45000}
      fibLevels={[]}
      entryPrice={45000}
      stopLoss={44000}
      targets={[47000]}
      positionSize={2}
      riskRewardRatio={2.0}
      riskAmount={500}
      onChange={() => {}}
      compact
    />
  ),
};

function GoodRiskRewardWrapper() {
  const [state, setState] = useState({
    entryPrice: 5000,
    stopLoss: 4950,
    targets: [5100],
    positionSize: 10,
    riskRewardRatio: 2.0,
    riskAmount: 500,
  });

  return (
    <PositionSizingTool
      symbol="SPX"
      tradeDirection="GO_LONG"
      selectedLevel={5000}
      fibLevels={[]}
      entryPrice={state.entryPrice}
      stopLoss={state.stopLoss}
      targets={state.targets}
      positionSize={state.positionSize}
      riskRewardRatio={state.riskRewardRatio}
      riskAmount={state.riskAmount}
      onChange={(updates) => setState((prev) => ({ ...prev, ...updates }))}
    />
  );
}

export const GoodRiskReward: Story = {
  name: "Good R:R (2:1+)",
  render: () => <GoodRiskRewardWrapper />,
};

function PoorRiskRewardWrapper() {
  const [state, setState] = useState({
    entryPrice: 5000,
    stopLoss: 4900,
    targets: [5050],
    positionSize: 5,
    riskRewardRatio: 0.5,
    riskAmount: 500,
  });

  return (
    <PositionSizingTool
      symbol="SPX"
      tradeDirection="GO_LONG"
      selectedLevel={5000}
      fibLevels={[]}
      entryPrice={state.entryPrice}
      stopLoss={state.stopLoss}
      targets={state.targets}
      positionSize={state.positionSize}
      riskRewardRatio={state.riskRewardRatio}
      riskAmount={state.riskAmount}
      onChange={(updates) => setState((prev) => ({ ...prev, ...updates }))}
    />
  );
}

export const PoorRiskReward: Story = {
  name: "Poor R:R (Below 1:1)",
  render: () => <PoorRiskRewardWrapper />,
};
