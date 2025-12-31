import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { FibonacciSetupTool } from "./FibonacciSetupTool";
import type { FibonacciTool, FibonacciLevel, PivotPoint } from "@/hooks/use-workflow-state";

const meta: Meta<typeof FibonacciSetupTool> = {
  title: "Trading/Tools/FibonacciSetupTool",
  component: FibonacciSetupTool,
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
type Story = StoryObj<typeof FibonacciSetupTool>;

// Interactive wrapper
function InteractiveFibSetup({
  initialPivots = [] as PivotPoint[],
  initialTool = "retracement" as FibonacciTool,
  initialLevels = [] as FibonacciLevel[],
  workflowMode = false,
}: {
  initialPivots?: PivotPoint[];
  initialTool?: FibonacciTool;
  initialLevels?: FibonacciLevel[];
  workflowMode?: boolean;
}) {
  const [state, setState] = useState({
    pivots: initialPivots,
    fibTool: initialTool,
    fibLevels: initialLevels,
    selectedLevelIndex: null as number | null,
  });

  return (
    <FibonacciSetupTool
      symbol="SPX"
      timeframe="1D"
      pivots={state.pivots}
      fibTool={state.fibTool}
      fibLevels={state.fibLevels}
      selectedLevelIndex={state.selectedLevelIndex}
      tradeDirection="GO_LONG"
      onChange={(updates) => setState((prev) => ({ ...prev, ...updates }))}
      workflowMode={workflowMode}
      onComplete={() => console.log("Complete clicked!")}
    />
  );
}

export const Default: Story = {
  name: "Initial State - No Pivots",
  render: () => <InteractiveFibSetup />,
};

export const WithPivots: Story = {
  name: "With Detected Pivots",
  render: () => (
    <InteractiveFibSetup
      initialPivots={[
        { index: 10, price: 5100, type: "high" },
        { index: 25, price: 4900, type: "low" },
      ]}
    />
  ),
};

export const ThreePivots: Story = {
  name: "With Three Pivots (Projection Ready)",
  render: () => (
    <InteractiveFibSetup
      initialPivots={[
        { index: 10, price: 5100, type: "high" },
        { index: 25, price: 4900, type: "low" },
        { index: 40, price: 5050, type: "high" },
      ]}
      initialTool="projection"
    />
  ),
};

export const RetracementCalculated: Story = {
  name: "Retracement Levels Calculated",
  render: () => (
    <InteractiveFibSetup
      initialPivots={[
        { index: 10, price: 5100, type: "high" },
        { index: 25, price: 4900, type: "low" },
      ]}
      initialTool="retracement"
      initialLevels={[
        { ratio: 0.382, price: 4976.4, label: "38.2%" },
        { ratio: 0.5, price: 5000, label: "50.0%" },
        { ratio: 0.618, price: 5023.6, label: "61.8%" },
        { ratio: 0.786, price: 5057.2, label: "78.6%" },
      ]}
    />
  ),
};

export const ExtensionCalculated: Story = {
  name: "Extension Levels Calculated",
  render: () => (
    <InteractiveFibSetup
      initialPivots={[
        { index: 10, price: 4900, type: "low" },
        { index: 25, price: 5100, type: "high" },
      ]}
      initialTool="extension"
      initialLevels={[
        { ratio: 1.272, price: 5154.4, label: "127.2%" },
        { ratio: 1.618, price: 5223.6, label: "161.8%" },
        { ratio: 2.618, price: 5423.6, label: "261.8%" },
      ]}
    />
  ),
};

export const ProjectionCalculated: Story = {
  name: "Projection Levels Calculated",
  render: () => (
    <InteractiveFibSetup
      initialPivots={[
        { index: 10, price: 5100, type: "high" },
        { index: 25, price: 4900, type: "low" },
        { index: 40, price: 5050, type: "high" },
      ]}
      initialTool="projection"
      initialLevels={[
        { ratio: 0.618, price: 5173.6, label: "61.8%" },
        { ratio: 0.786, price: 5207.2, label: "78.6%" },
        { ratio: 1.0, price: 5250, label: "100.0%" },
        { ratio: 1.272, price: 5304.4, label: "127.2%" },
        { ratio: 1.618, price: 5373.6, label: "161.8%" },
      ]}
    />
  ),
};

export const ExpansionCalculated: Story = {
  name: "Expansion Levels Calculated",
  render: () => (
    <InteractiveFibSetup
      initialPivots={[
        { index: 10, price: 4900, type: "low" },
        { index: 25, price: 5100, type: "high" },
      ]}
      initialTool="expansion"
      initialLevels={[
        { ratio: 0.382, price: 5176.4, label: "38.2%" },
        { ratio: 0.5, price: 5200, label: "50.0%" },
        { ratio: 0.618, price: 5223.6, label: "61.8%" },
        { ratio: 1.0, price: 5300, label: "100.0%" },
        { ratio: 1.618, price: 5423.6, label: "161.8%" },
      ]}
    />
  ),
};

export const WorkflowMode: Story = {
  name: "Workflow Mode (with Continue)",
  render: () => (
    <InteractiveFibSetup
      workflowMode
      initialPivots={[
        { index: 10, price: 5100, type: "high" },
        { index: 25, price: 4900, type: "low" },
      ]}
      initialTool="retracement"
      initialLevels={[
        { ratio: 0.382, price: 4976.4, label: "38.2%" },
        { ratio: 0.5, price: 5000, label: "50.0%" },
        { ratio: 0.618, price: 5023.6, label: "61.8%" },
        { ratio: 0.786, price: 5057.2, label: "78.6%" },
      ]}
    />
  ),
};

export const Compact: Story = {
  name: "Compact Display",
  render: () => (
    <FibonacciSetupTool
      symbol="SPX"
      timeframe="1D"
      pivots={[
        { index: 10, price: 5100, type: "high" },
        { index: 25, price: 4900, type: "low" },
      ]}
      fibTool="retracement"
      fibLevels={[
        { ratio: 0.382, price: 4976.4, label: "38.2%" },
        { ratio: 0.5, price: 5000, label: "50.0%" },
        { ratio: 0.618, price: 5023.6, label: "61.8%" },
      ]}
      selectedLevelIndex={1}
      tradeDirection="GO_LONG"
      onChange={() => {}}
      compact
    />
  ),
};

function AllToolTypesWrapper() {
  const [tool, setTool] = useState<FibonacciTool>("retracement");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {(["retracement", "extension", "projection", "expansion"] as FibonacciTool[]).map((t) => (
          <button
            key={t}
            onClick={() => setTool(t)}
            className={`px-3 py-1 rounded text-sm ${
              tool === t ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <FibonacciSetupTool
        symbol="SPX"
        timeframe="1D"
        pivots={[
          { index: 10, price: 5100, type: "high" },
          { index: 25, price: 4900, type: "low" },
          { index: 40, price: 5050, type: "high" },
        ]}
        fibTool={tool}
        fibLevels={[]}
        selectedLevelIndex={null}
        tradeDirection="GO_LONG"
        onChange={() => {}}
      />
    </div>
  );
}

export const AllToolTypes: Story = {
  name: "All Fibonacci Tool Types",
  render: () => <AllToolTypesWrapper />,
};
