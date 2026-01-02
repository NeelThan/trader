"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PositionSizingCalculator } from "@/components/trading";

export default function PositionSizingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Position Sizing Calculator</h1>
            <p className="text-muted-foreground">
              Calculate optimal position size based on your risk parameters
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/chart">
              <Button variant="outline" size="sm">
                Chart
              </Button>
            </Link>
            <Link href="/trend-analysis">
              <Button variant="outline" size="sm">
                Trend Analysis
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="outline" size="sm">
                Settings
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>

          {/* Calculator */}
          <PositionSizingCalculator />

          {/* Help Section */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg bg-card border">
              <h3 className="font-semibold mb-2">Position Sizing Formula</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <code className="bg-muted px-1 rounded">Position Size = Risk Capital / Distance to Stop</code>
                </p>
                <p>
                  This ensures you risk exactly the amount you specify regardless of
                  how far your stop loss is from entry.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-card border">
              <h3 className="font-semibold mb-2">Risk Management Guidelines</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>- Never risk more than 1-2% of account per trade</li>
                <li>- Aim for minimum 2:1 reward-to-risk ratio</li>
                <li>- Place stop beyond significant support/resistance</li>
                <li>- Consider correlation when taking multiple positions</li>
              </ul>
            </div>
          </div>

        {/* Info */}
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <p className="text-sm text-muted-foreground">
            Your account settings and trade parameters are saved automatically.
            The next time you open this page, your settings will be restored.
          </p>
        </div>
      </div>
    </div>
  );
}
