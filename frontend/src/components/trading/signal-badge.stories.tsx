import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SignalBadge } from "./signal-badge";

const meta: Meta<typeof SignalBadge> = {
  title: "Trading/SignalBadge",
  component: SignalBadge,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    direction: {
      control: "radio",
      options: ["buy", "sell"],
    },
    type: {
      control: "select",
      options: [undefined, "type1", "type2", "type3"],
    },
    strength: {
      control: { type: "range", min: 0, max: 1, step: 0.05 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof SignalBadge>;

export const Buy: Story = {
  args: {
    direction: "buy",
  },
};

export const Sell: Story = {
  args: {
    direction: "sell",
  },
};

export const BuyWithType: Story = {
  name: "Buy with Signal Type",
  args: {
    direction: "buy",
    type: "type1",
  },
};

export const SellWithType: Story = {
  name: "Sell with Signal Type",
  args: {
    direction: "sell",
    type: "type2",
  },
};

export const WithStrength: Story = {
  args: {
    direction: "buy",
    type: "type1",
    strength: 0.85,
  },
};

export const AllVariations: Story = {
  name: "All Signal Variations",
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <SignalBadge direction="buy" />
        <SignalBadge direction="sell" />
      </div>
      <div className="flex flex-wrap gap-4">
        <SignalBadge direction="buy" type="type1" />
        <SignalBadge direction="buy" type="type2" />
        <SignalBadge direction="buy" type="type3" />
      </div>
      <div className="flex flex-wrap gap-4">
        <SignalBadge direction="sell" type="type1" />
        <SignalBadge direction="sell" type="type2" />
        <SignalBadge direction="sell" type="type3" />
      </div>
      <div className="flex flex-wrap gap-4">
        <SignalBadge direction="buy" type="type1" strength={0.95} />
        <SignalBadge direction="buy" type="type2" strength={0.72} />
        <SignalBadge direction="sell" type="type1" strength={0.88} />
      </div>
    </div>
  ),
};
