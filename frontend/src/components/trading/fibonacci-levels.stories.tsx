import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FibonacciLevels, FibonacciLevel } from "./fibonacci-levels";

const meta: Meta<typeof FibonacciLevels> = {
  title: "Trading/FibonacciLevels",
  component: FibonacciLevels,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof FibonacciLevels>;

const standardRetracementLevels: FibonacciLevel[] = [
  { ratio: 0, price: 100.0, label: "0% (High)" },
  { ratio: 0.236, price: 88.2 },
  { ratio: 0.382, price: 80.9 },
  { ratio: 0.5, price: 75.0 },
  { ratio: 0.618, price: 69.1 },
  { ratio: 0.786, price: 60.7 },
  { ratio: 1, price: 50.0, label: "100% (Low)" },
];

export const BuySetup: Story = {
  args: {
    levels: standardRetracementLevels,
    highPrice: 100.0,
    lowPrice: 50.0,
    direction: "buy",
  },
};

export const SellSetup: Story = {
  args: {
    levels: standardRetracementLevels,
    highPrice: 100.0,
    lowPrice: 50.0,
    direction: "sell",
  },
};

export const WithCurrentPrice: Story = {
  args: {
    levels: standardRetracementLevels,
    highPrice: 100.0,
    lowPrice: 50.0,
    direction: "buy",
    currentPrice: 69.1,
  },
};

const forexLevels: FibonacciLevel[] = [
  { ratio: 0, price: 1.0915, label: "0% (High)" },
  { ratio: 0.236, price: 1.0879 },
  { ratio: 0.382, price: 1.0857 },
  { ratio: 0.5, price: 1.0839 },
  { ratio: 0.618, price: 1.0821 },
  { ratio: 0.786, price: 1.0796 },
  { ratio: 1, price: 1.0763, label: "100% (Low)" },
];

export const ForexPair: Story = {
  name: "Forex Pair (EURUSD)",
  args: {
    levels: forexLevels,
    highPrice: 1.0915,
    lowPrice: 1.0763,
    direction: "buy",
    currentPrice: 1.0821,
  },
};

const extensionLevels: FibonacciLevel[] = [
  { ratio: 0, price: 50.0, label: "0%" },
  { ratio: 0.618, price: 69.1 },
  { ratio: 1, price: 100.0, label: "100%" },
  { ratio: 1.272, price: 113.6 },
  { ratio: 1.618, price: 130.9 },
];

export const ExtensionLevels: Story = {
  args: {
    levels: extensionLevels,
    highPrice: 130.9,
    lowPrice: 50.0,
    direction: "buy",
  },
};
