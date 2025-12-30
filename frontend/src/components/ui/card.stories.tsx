import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from "./card";
import { Button } from "./button";
import { Badge } from "./badge";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content can contain any elements.</p>
      </CardContent>
      <CardFooter>
        <Button>Action</Button>
      </CardFooter>
    </Card>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Pattern Detected</CardTitle>
        <CardDescription>Gartley pattern on EURUSD</CardDescription>
        <CardAction>
          <Badge variant="secondary">Active</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-sm">Pattern completion at 78.6% retracement level.</p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm">View Details</Button>
        <Button size="sm" variant="outline">Dismiss</Button>
      </CardFooter>
    </Card>
  ),
};

export const FibonacciLevels: Story = {
  name: "Fibonacci Levels Card",
  render: () => (
    <Card className="w-[300px]">
      <CardHeader>
        <CardTitle>Retracement Levels</CardTitle>
        <CardDescription>BUY Setup: 100.00 - 50.00</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 font-mono text-sm">
          <div className="flex justify-between">
            <span className="text-fibonacci-382">38.2%</span>
            <span>80.90</span>
          </div>
          <div className="flex justify-between">
            <span className="text-fibonacci-500">50.0%</span>
            <span>75.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-fibonacci-618">61.8%</span>
            <span>69.10</span>
          </div>
          <div className="flex justify-between">
            <span className="text-fibonacci-786">78.6%</span>
            <span>60.70</span>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
};

export const SignalCard: Story = {
  name: "Trading Signal Card",
  render: () => (
    <Card className="w-[320px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>BUY Signal</span>
          <Badge className="bg-buy text-buy-foreground border-transparent">
            Type 1
          </Badge>
        </CardTitle>
        <CardDescription>Strong rejection at 61.8% level</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Entry</span>
            <p className="font-mono font-medium">69.10</p>
          </div>
          <div>
            <span className="text-muted-foreground">Strength</span>
            <p className="font-mono font-medium">0.85</p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full bg-buy hover:bg-buy/90">
          Take Trade
        </Button>
      </CardFooter>
    </Card>
  ),
};
