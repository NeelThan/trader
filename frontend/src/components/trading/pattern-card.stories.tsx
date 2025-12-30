import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PatternCard } from "./pattern-card";
import { Button } from "@/components/ui/button";

const meta: Meta<typeof PatternCard> = {
  title: "Trading/PatternCard",
  component: PatternCard,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    pattern: {
      control: "select",
      options: ["gartley", "bat", "butterfly", "crab", "shark", "cypher"],
    },
    direction: {
      control: "radio",
      options: ["buy", "sell"],
    },
    signalType: {
      control: "select",
      options: [undefined, "type1", "type2", "type3"],
    },
    status: {
      control: "select",
      options: ["forming", "complete", "triggered", "expired"],
    },
    strength: {
      control: { type: "range", min: 0, max: 1, step: 0.05 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof PatternCard>;

export const GartleyForming: Story = {
  name: "Gartley Pattern (Forming)",
  args: {
    pattern: "gartley",
    symbol: "EURUSD",
    timeframe: "H4",
    direction: "buy",
    signalType: "type1",
    status: "forming",
    completionLevel: 0.618,
    strength: 0.85,
  },
};

export const BatComplete: Story = {
  name: "Bat Pattern (Complete)",
  args: {
    pattern: "bat",
    symbol: "GBPUSD",
    timeframe: "D1",
    direction: "sell",
    signalType: "type2",
    status: "complete",
    completionLevel: 0.886,
    entryPrice: 1.2650,
    stopLoss: 1.2720,
    takeProfit: 1.2480,
    strength: 0.92,
  },
};

export const ButterflyTriggered: Story = {
  name: "Butterfly Pattern (Triggered)",
  args: {
    pattern: "butterfly",
    symbol: "XAUUSD",
    timeframe: "H1",
    direction: "buy",
    status: "triggered",
    completionLevel: 0.786,
    entryPrice: 2015.50,
    stopLoss: 2008.25,
    takeProfit: 2035.75,
    strength: 0.78,
  },
};

export const CrabExpired: Story = {
  name: "Crab Pattern (Expired)",
  args: {
    pattern: "crab",
    symbol: "USDJPY",
    timeframe: "M15",
    direction: "sell",
    signalType: "type3",
    status: "expired",
    completionLevel: 1.618,
  },
};

export const WithCustomContent: Story = {
  render: () => (
    <PatternCard
      pattern="cypher"
      symbol="BTCUSD"
      timeframe="H4"
      direction="buy"
      signalType="type1"
      status="complete"
      entryPrice={42500}
      stopLoss={41800}
      takeProfit={44200}
      strength={0.88}
      className="w-[400px]"
    >
      <div className="mt-4 pt-4 border-t">
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 bg-buy hover:bg-buy/90">
            Take Trade
          </Button>
          <Button size="sm" variant="outline" className="flex-1">
            Dismiss
          </Button>
        </div>
      </div>
    </PatternCard>
  ),
};

export const AllPatternTypes: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      <PatternCard
        pattern="gartley"
        symbol="EURUSD"
        timeframe="H4"
        direction="buy"
        status="complete"
        className="w-[300px]"
      />
      <PatternCard
        pattern="bat"
        symbol="GBPUSD"
        timeframe="H1"
        direction="sell"
        status="forming"
        className="w-[300px]"
      />
      <PatternCard
        pattern="butterfly"
        symbol="AUDUSD"
        timeframe="D1"
        direction="buy"
        status="triggered"
        className="w-[300px]"
      />
      <PatternCard
        pattern="crab"
        symbol="USDJPY"
        timeframe="M30"
        direction="sell"
        status="expired"
        className="w-[300px]"
      />
      <PatternCard
        pattern="shark"
        symbol="NZDUSD"
        timeframe="H4"
        direction="buy"
        status="complete"
        className="w-[300px]"
      />
      <PatternCard
        pattern="cypher"
        symbol="USDCAD"
        timeframe="H1"
        direction="sell"
        status="forming"
        className="w-[300px]"
      />
    </div>
  ),
};
