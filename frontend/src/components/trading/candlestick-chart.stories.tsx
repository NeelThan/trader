import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LineStyle } from "lightweight-charts";
import { CandlestickChart, OHLCData, PriceLine } from "./candlestick-chart";

const meta: Meta<typeof CandlestickChart> = {
  title: "Trading/CandlestickChart",
  component: CandlestickChart,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  argTypes: {
    theme: {
      control: "radio",
      options: ["light", "dark"],
    },
    height: {
      control: { type: "range", min: 200, max: 600, step: 50 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof CandlestickChart>;

// Generate sample OHLC data
function generateSampleData(days: number = 60): OHLCData[] {
  const data: OHLCData[] = [];
  let basePrice = 100;
  const baseTime = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;

  for (let i = 0; i < days; i++) {
    const volatility = 2 + Math.random() * 3;
    const trend = Math.random() > 0.5 ? 1 : -1;

    const open = basePrice;
    const change = (Math.random() - 0.5) * volatility + trend * 0.2;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;

    data.push({
      time: (baseTime + i * 24 * 60 * 60) as OHLCData["time"],
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
    });

    basePrice = close;
  }

  return data;
}

// Sample data with a clear swing for Fibonacci demonstration
const fibonacciDemoData: OHLCData[] = [
  { time: "2024-01-01", open: 100, high: 102, low: 99, close: 101 },
  { time: "2024-01-02", open: 101, high: 104, low: 100, close: 103 },
  { time: "2024-01-03", open: 103, high: 108, low: 102, close: 107 },
  { time: "2024-01-04", open: 107, high: 112, low: 106, close: 111 },
  { time: "2024-01-05", open: 111, high: 118, low: 110, close: 117 },
  { time: "2024-01-08", open: 117, high: 125, low: 116, close: 124 },
  { time: "2024-01-09", open: 124, high: 130, low: 122, close: 128 },
  { time: "2024-01-10", open: 128, high: 135, low: 127, close: 134 },
  { time: "2024-01-11", open: 134, high: 140, low: 132, close: 138 },
  { time: "2024-01-12", open: 138, high: 145, low: 136, close: 144 },
  { time: "2024-01-15", open: 144, high: 150, low: 142, close: 148 },
  { time: "2024-01-16", open: 148, high: 150, low: 140, close: 142 },
  { time: "2024-01-17", open: 142, high: 144, low: 135, close: 136 },
  { time: "2024-01-18", open: 136, high: 138, low: 130, close: 132 },
  { time: "2024-01-19", open: 132, high: 135, low: 128, close: 130 },
  { time: "2024-01-22", open: 130, high: 132, low: 125, close: 127 },
  { time: "2024-01-23", open: 127, high: 130, low: 124, close: 128 },
  { time: "2024-01-24", open: 128, high: 133, low: 126, close: 131 },
  { time: "2024-01-25", open: 131, high: 136, low: 129, close: 134 },
  { time: "2024-01-26", open: 134, high: 140, low: 132, close: 138 },
] as OHLCData[];

// Calculate Fibonacci levels from high/low
const high = 150;
const low = 100;
const range = high - low;

const fibonacciLevels: PriceLine[] = [
  { price: high, color: "#888888", title: "0% (High)" },
  { price: high - range * 0.236, color: "#9ca3af", title: "23.6%" },
  { price: high - range * 0.382, color: "#f59e0b", title: "38.2%" },
  { price: high - range * 0.5, color: "#8b5cf6", title: "50%" },
  { price: high - range * 0.618, color: "#22c55e", title: "61.8%" },
  { price: high - range * 0.786, color: "#ef4444", title: "78.6%" },
  { price: low, color: "#888888", title: "100% (Low)" },
];

const sampleData = generateSampleData(60);

export const Default: Story = {
  args: {
    data: sampleData,
    height: 400,
    theme: "dark",
  },
};

export const LightTheme: Story = {
  args: {
    data: sampleData,
    height: 400,
    theme: "light",
  },
};

export const WithFibonacciLevels: Story = {
  name: "With Fibonacci Retracement",
  args: {
    data: fibonacciDemoData,
    priceLines: fibonacciLevels,
    height: 450,
    theme: "dark",
  },
};

export const CustomColors: Story = {
  args: {
    data: sampleData,
    height: 400,
    theme: "dark",
    upColor: "#00ff88",
    downColor: "#ff4466",
  },
};

export const WithSupportResistance: Story = {
  name: "With Support/Resistance Lines",
  args: {
    data: sampleData,
    height: 400,
    theme: "dark",
    priceLines: [
      {
        price: Math.max(...sampleData.map((d) => d.high)) * 0.98,
        color: "#ef4444",
        title: "Resistance",
        lineStyle: LineStyle.Solid,
      },
      {
        price: Math.min(...sampleData.map((d) => d.low)) * 1.02,
        color: "#22c55e",
        title: "Support",
        lineStyle: LineStyle.Solid,
      },
    ],
  },
};

export const CompactHeight: Story = {
  args: {
    data: sampleData,
    height: 250,
    theme: "dark",
  },
};
