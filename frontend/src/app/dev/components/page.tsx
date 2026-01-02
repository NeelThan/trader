"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

// UI Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Trading Components
import { SignalBadge } from "@/components/trading/signal-badge";
import { DirectionToggle } from "@/components/trading/direction-toggle";
import { FibonacciLevels } from "@/components/trading/fibonacci-levels";
import { PatternCard } from "@/components/trading/pattern-card";
import { PriceInput } from "@/components/trading/price-input";
import { Direction } from "@/components/trading/types";

// Chart Components
import { MarketStatusBadge } from "@/components/chart/MarketStatusBadge";
import { ChartToolbar } from "@/components/chart/ChartToolbar";

// Workflow Components
import { StepIndicator } from "@/components/workflow/StepIndicator";
import { PositionSizingTool } from "@/components/trading/tools/PositionSizingTool";
import { FibonacciSetupTool } from "@/components/trading/tools/FibonacciSetupTool";
import { TradeManagementPanel } from "@/components/trading/tools/TradeManagementPanel";

// Only show this page in development
if (process.env.NODE_ENV === "production") {
  notFound();
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold border-b pb-2">{title}</h2>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

function ComponentDemo({ name, description, children }: { name: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-lg border bg-card/50 space-y-3">
      <div>
        <h3 className="font-mono text-sm font-semibold text-primary">{name}</h3>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {children}
      </div>
    </div>
  );
}

export default function ComponentsPage() {
  const [direction, setDirection] = useState<Direction>("buy");
  const [priceValue, setPriceValue] = useState("42350.50");

  return (
    <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-5xl mx-auto p-6 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">Component Library</h1>
                <Badge variant="outline" className="text-xs">DEV ONLY</Badge>
              </div>
              <p className="text-muted-foreground">
                All available components in the design system
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/chart">
                <Button variant="outline" size="sm">Chart</Button>
              </Link>
              <Link href="/settings">
                <Button variant="outline" size="sm">Settings</Button>
              </Link>
              <ThemeToggle />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl">12</CardTitle>
                <CardDescription>UI Components</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl">6</CardTitle>
                <CardDescription>Trading Components</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl">11</CardTitle>
                <CardDescription>Chart Components</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl text-primary">10</CardTitle>
                <CardDescription>Workflow Components</CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* UI Components */}
          <Section title="UI Components">
            <ComponentDemo name="Button" description="Primary action component with variants">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
              <Button disabled>Disabled</Button>
            </ComponentDemo>

            <ComponentDemo name="Button Sizes">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon">+</Button>
            </ComponentDemo>

            <ComponentDemo name="Badge" description="Status indicators and labels">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </ComponentDemo>

            <ComponentDemo name="Input" description="Text input field">
              <Input placeholder="Enter text..." className="max-w-xs" />
              <Input type="number" placeholder="0.00" className="max-w-[120px]" />
              <Input disabled placeholder="Disabled" className="max-w-xs" />
            </ComponentDemo>

            <ComponentDemo name="Label" description="Form field labels">
              <div className="space-y-2">
                <Label htmlFor="demo-input">Email Address</Label>
                <Input id="demo-input" placeholder="you@example.com" className="max-w-xs" />
              </div>
            </ComponentDemo>

            <ComponentDemo name="Spinner" description="Loading indicator">
              <Spinner size="sm" />
              <Spinner size="md" />
              <Spinner size="lg" />
            </ComponentDemo>

            <ComponentDemo name="ThemeToggle" description="Dark/light mode toggle">
              <ThemeToggle />
            </ComponentDemo>

            <ComponentDemo name="Tooltip" description="Contextual information on hover">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline">Hover me</Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This is a tooltip</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </ComponentDemo>

            <ComponentDemo name="Card" description="Container for grouped content">
              <Card className="w-full max-w-sm">
                <CardHeader>
                  <CardTitle>Card Title</CardTitle>
                  <CardDescription>Card description goes here</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Card content area</p>
                </CardContent>
                <CardFooter>
                  <Button size="sm">Action</Button>
                </CardFooter>
              </Card>
            </ComponentDemo>
          </Section>

          {/* Trading Components */}
          <Section title="Trading Components">
            <ComponentDemo name="SignalBadge" description="Trading signal indicator">
              <SignalBadge direction="buy" />
              <SignalBadge direction="sell" />
              <SignalBadge direction="buy" type="type1" />
              <SignalBadge direction="sell" type="type2" />
              <SignalBadge direction="buy" type="type1" strength={0.85} />
              <SignalBadge direction="sell" type="type2" strength={0.62} />
            </ComponentDemo>

            <ComponentDemo name="DirectionToggle" description="Buy/Sell direction selector">
              <DirectionToggle value={direction} onChange={setDirection} size="sm" />
              <DirectionToggle value={direction} onChange={setDirection} size="default" />
              <DirectionToggle value={direction} onChange={setDirection} size="lg" />
              <DirectionToggle value={direction} onChange={setDirection} disabled />
            </ComponentDemo>

            <ComponentDemo name="PriceInput" description="Numeric price input with formatting">
              <PriceInput
                value={priceValue}
                onChange={setPriceValue}
                label="Entry Price"
                placeholder="0.00"
              />
            </ComponentDemo>

            <ComponentDemo name="FibonacciLevels" description="Fibonacci level display">
              <FibonacciLevels
                highPrice={45000}
                lowPrice={40000}
                direction="buy"
                levels={[
                  { ratio: 0.236, price: 41180 },
                  { ratio: 0.382, price: 41910 },
                  { ratio: 0.5, price: 42500 },
                  { ratio: 0.618, price: 43090 },
                  { ratio: 0.786, price: 43930 },
                ]}
              />
            </ComponentDemo>

            <ComponentDemo name="PatternCard" description="Harmonic pattern display">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <PatternCard
                  pattern="gartley"
                  symbol="BTCUSD"
                  timeframe="1D"
                  direction="buy"
                  status="complete"
                  entryPrice={42350}
                  stopLoss={41800}
                  takeProfit={44200}
                  strength={0.87}
                />
                <PatternCard
                  pattern="butterfly"
                  symbol="SPX"
                  timeframe="4H"
                  direction="sell"
                  status="forming"
                  completionLevel={0.786}
                  strength={0.72}
                />
              </div>
            </ComponentDemo>
          </Section>

          {/* Chart Components */}
          <Section title="Chart Components">
            <ComponentDemo name="MarketStatusBadge" description="Market open/closed indicator">
              <MarketStatusBadge status={{ state: "open", stateDisplay: "Market Open", isOpen: true, isPreMarket: false, isAfterHours: false, isClosed: false }} />
              <MarketStatusBadge status={{ state: "premarket", stateDisplay: "Pre-Market", isOpen: false, isPreMarket: true, isAfterHours: false, isClosed: false }} />
              <MarketStatusBadge status={{ state: "afterhours", stateDisplay: "After Hours", isOpen: false, isPreMarket: false, isAfterHours: true, isClosed: false }} />
              <MarketStatusBadge status={{ state: "closed", stateDisplay: "Market Closed", isOpen: false, isPreMarket: false, isAfterHours: false, isClosed: true }} />
            </ComponentDemo>

            <ComponentDemo name="ChartToolbar" description="Zoom and pan controls">
              <ChartToolbar
                onZoomIn={() => console.log("Zoom in")}
                onZoomOut={() => console.log("Zoom out")}
                onResetView={() => console.log("Reset view")}
              />
            </ComponentDemo>
          </Section>

          {/* Workflow Components */}
          <Section title="Workflow Components">
            <ComponentDemo name="StepIndicator" description="8-step workflow progress indicator">
              <div className="w-full">
                <StepIndicator currentStep={3} completedSteps={[1, 2]} />
              </div>
            </ComponentDemo>

            <ComponentDemo name="StepIndicator (Further Progress)" description="Shows more completed steps">
              <div className="w-full">
                <StepIndicator currentStep={6} completedSteps={[1, 2, 3, 4, 5]} />
              </div>
            </ComponentDemo>

            <ComponentDemo name="PositionSizingTool (Compact)" description="Position size calculator in compact mode">
              <PositionSizingTool
                symbol="SPX"
                tradeDirection="GO_LONG"
                selectedLevel={5000}
                fibLevels={[]}
                entryPrice={5000}
                stopLoss={4950}
                targets={[5100]}
                positionSize={10}
                riskRewardRatio={2.0}
                riskAmount={500}
                onChange={() => {}}
                compact
              />
            </ComponentDemo>

            <ComponentDemo name="FibonacciSetupTool (Compact)" description="Fibonacci level setup in compact mode">
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
            </ComponentDemo>

            <ComponentDemo name="TradeManagementPanel (Compact)" description="Trade management in compact mode">
              <TradeManagementPanel
                symbol="SPX"
                timeframe="1D"
                tradeDirection="GO_LONG"
                entryPrice={5000}
                stopLoss={4950}
                targets={[5100]}
                positionSize={10}
                tradeStatus="active"
                currentPnL={350}
                breakEvenPrice={5000}
                freeTradeActive={false}
                trailingEnabled={false}
                trailingStopPrice={null}
                tradeLog={[]}
                onAddLogEntry={() => {}}
                onChange={() => {}}
                compact
              />
            </ComponentDemo>

            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <p className="text-sm">
                <strong>Full Workflow:</strong> See the complete 8-step trading workflow at{" "}
                <Link href="/workflow" className="text-primary underline">/workflow</Link>.
                Each tool can also be used standalone.
              </p>
            </div>
          </Section>

          {/* Additional Info */}
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="text-sm">
              <strong>Note:</strong> This page is only visible in development mode.
              For interactive component exploration with different states and props,
              run <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">npm run storybook</code>
            </p>
          </div>

          {/* Component Index */}
          <Section title="Component Index">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">UI Components</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>Button</code></li>
                    <li><code>Badge</code></li>
                    <li><code>Card</code></li>
                    <li><code>Input</code></li>
                    <li><code>Label</code></li>
                    <li><code>Spinner</code></li>
                    <li><code>Table</code></li>
                    <li><code>Tooltip</code></li>
                    <li><code>Select</code></li>
                    <li><code>DropdownMenu</code></li>
                    <li><code>ThemeToggle</code></li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Trading Components</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>SignalBadge</code></li>
                    <li><code>DirectionToggle</code></li>
                    <li><code>FibonacciLevels</code></li>
                    <li><code>PatternCard</code></li>
                    <li><code>PriceInput</code></li>
                    <li><code>CandlestickChart</code></li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Chart Components</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>ChartToolbar</code></li>
                    <li><code>ChartHeader</code></li>
                    <li><code>ChartControls</code></li>
                    <li><code>MarketSelector</code></li>
                    <li><code>MarketStatusBadge</code></li>
                    <li><code>DataSourceSelector</code></li>
                    <li><code>FibonacciControls</code></li>
                    <li><code>FibonacciLevelsPanel</code></li>
                    <li><code>PivotPointsPanel</code></li>
                    <li><code>PriceSummary</code></li>
                    <li><code>RefreshStatus</code></li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-primary">Workflow Components</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>WorkflowStepper</code></li>
                    <li><code>StepIndicator</code></li>
                    <li><code>StepNavigation</code></li>
                    <li><code>MarketTimeframeSelector</code></li>
                    <li><code>TrendDecisionPanel</code></li>
                    <li><code>FibonacciSetupTool</code></li>
                    <li><code>PatternScannerTool</code></li>
                    <li><code>EntrySignalTool</code></li>
                    <li><code>PositionSizingTool</code></li>
                    <li><code>PreTradeChecklist</code></li>
                    <li><code>TradeManagementPanel</code></li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </Section>
        </div>
    </div>
  );
}
