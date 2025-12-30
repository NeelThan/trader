"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  useHarmonicPatterns,
  type ValidatedPattern,
} from "@/hooks/use-harmonic-patterns";
import type { PatternType } from "@/lib/api";

function formatPrice(price: number): string {
  if (price >= 10000) return price.toFixed(0);
  if (price >= 100) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

const PATTERN_COLORS: Record<string, string> = {
  gartley: "text-emerald-400",
  butterfly: "text-purple-400",
  bat: "text-orange-400",
  crab: "text-cyan-400",
};

const PATTERN_BG: Record<string, string> = {
  gartley: "bg-emerald-500/10 border-emerald-500/30",
  butterfly: "bg-purple-500/10 border-purple-500/30",
  bat: "bg-orange-500/10 border-orange-500/30",
  crab: "bg-cyan-500/10 border-cyan-500/30",
};

// Example valid patterns from backend tests
const EXAMPLE_PATTERNS = {
  gartley: { x: "100", a: "50", b: "80.9", c: "61.8", d: "60.7", label: "Bullish Gartley" },
  butterfly: { x: "100", a: "50", b: "89.3", c: "65", d: "36.4", label: "Bullish Butterfly" },
  bat: { x: "100", a: "50", b: "75", c: "59.55", d: "55.7", label: "Bullish Bat" },
  crab: { x: "100", a: "50", b: "75", c: "59.55", d: "19.1", label: "Bullish Crab" },
};

function PatternResultCard({ pattern }: { pattern: ValidatedPattern }) {
  const isBullish = pattern.direction === "buy";
  const colorClass = PATTERN_COLORS[pattern.pattern_type] || "text-gray-400";
  const bgClass = PATTERN_BG[pattern.pattern_type] || "bg-gray-500/10 border-gray-500/30";

  return (
    <div className={`p-3 rounded-lg border ${bgClass}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`font-semibold capitalize ${colorClass}`}>
          {pattern.pattern_type} Pattern
        </span>
        <span className={`text-xs font-medium ${isBullish ? "text-green-400" : "text-red-400"}`}>
          {isBullish ? "BULLISH" : "BEARISH"}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2 text-sm">
        <div className="text-center">
          <span className="text-muted-foreground block text-xs">X</span>
          <span className="font-mono text-blue-400">{formatPrice(pattern.x)}</span>
        </div>
        <div className="text-center">
          <span className="text-muted-foreground block text-xs">A</span>
          <span className="font-mono text-blue-400">{formatPrice(pattern.a)}</span>
        </div>
        <div className="text-center">
          <span className="text-muted-foreground block text-xs">B</span>
          <span className="font-mono text-blue-400">{formatPrice(pattern.b)}</span>
        </div>
        <div className="text-center">
          <span className="text-muted-foreground block text-xs">C</span>
          <span className="font-mono text-blue-400">{formatPrice(pattern.c)}</span>
        </div>
        <div className="text-center">
          <span className="text-muted-foreground block text-xs">D</span>
          <span className="font-mono text-blue-400">{formatPrice(pattern.d)}</span>
        </div>
      </div>
    </div>
  );
}

type HarmonicPatternPanelProps = {
  enabled?: boolean;
  defaultX?: number;
  defaultA?: number;
  defaultB?: number;
  defaultC?: number;
};

export function HarmonicPatternPanel({
  enabled = true,
  defaultX = 0,
  defaultA = 0,
  defaultB = 0,
  defaultC = 0,
}: HarmonicPatternPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [x, setX] = useState(defaultX.toString());
  const [a, setA] = useState(defaultA.toString());
  const [b, setB] = useState(defaultB.toString());
  const [c, setC] = useState(defaultC.toString());
  const [d, setD] = useState("");
  const [selectedPatternType, setSelectedPatternType] = useState<PatternType>("gartley");
  const [lastValidation, setLastValidation] = useState<"success" | "no_pattern" | null>(null);

  const {
    patterns,
    reversalZone,
    isLoading,
    error,
    validatePattern,
    calculateReversalZone,
    clearPatterns,
  } = useHarmonicPatterns();

  const handleValidate = async () => {
    const xVal = parseFloat(x) || 0;
    const aVal = parseFloat(a) || 0;
    const bVal = parseFloat(b) || 0;
    const cVal = parseFloat(c) || 0;
    const dVal = parseFloat(d) || 0;

    if (xVal && aVal && bVal && cVal && dVal) {
      const result = await validatePattern({ x: xVal, a: aVal, b: bVal, c: cVal, d: dVal });
      setLastValidation(result ? "success" : "no_pattern");
    }
  };

  const loadExample = (patternKey: keyof typeof EXAMPLE_PATTERNS) => {
    const example = EXAMPLE_PATTERNS[patternKey];
    setX(example.x);
    setA(example.a);
    setB(example.b);
    setC(example.c);
    setD(example.d);
    setLastValidation(null);
  };

  const handleCalculateReversal = async () => {
    const xVal = parseFloat(x) || 0;
    const aVal = parseFloat(a) || 0;
    const bVal = parseFloat(b) || 0;
    const cVal = parseFloat(c) || 0;

    if (xVal && aVal && bVal && cVal) {
      await calculateReversalZone(xVal, aVal, bVal, cVal, selectedPatternType);
    }
  };

  if (!enabled) {
    return null;
  }

  return (
    <Card className="border-amber-500/30 border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-amber-400">
            Harmonic Patterns
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Collapse" : "Expand"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Validate XABCD harmonic patterns (Gartley, Butterfly, Bat, Crab)
        </p>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* XABCD Point Inputs */}
          <div className="grid grid-cols-5 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">X</Label>
              <Input
                type="number"
                value={x}
                onChange={(e) => setX(e.target.value)}
                className="h-8 text-sm font-mono"
                placeholder="0.00"
                step="0.01"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">A</Label>
              <Input
                type="number"
                value={a}
                onChange={(e) => setA(e.target.value)}
                className="h-8 text-sm font-mono"
                placeholder="0.00"
                step="0.01"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">B</Label>
              <Input
                type="number"
                value={b}
                onChange={(e) => setB(e.target.value)}
                className="h-8 text-sm font-mono"
                placeholder="0.00"
                step="0.01"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">C</Label>
              <Input
                type="number"
                value={c}
                onChange={(e) => setC(e.target.value)}
                className="h-8 text-sm font-mono"
                placeholder="0.00"
                step="0.01"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">D</Label>
              <Input
                type="number"
                value={d}
                onChange={(e) => setD(e.target.value)}
                className="h-8 text-sm font-mono"
                placeholder="0.00"
                step="0.01"
              />
            </div>
          </div>

          {/* Example Buttons */}
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-muted-foreground mr-1">Load example:</span>
            {(Object.keys(EXAMPLE_PATTERNS) as Array<keyof typeof EXAMPLE_PATTERNS>).map((key) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                onClick={() => loadExample(key)}
                className={`text-xs h-6 capitalize ${PATTERN_COLORS[key]}`}
              >
                {key}
              </Button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleValidate}
              disabled={isLoading || !x || !a || !b || !c || !d}
              className="flex-1"
            >
              {isLoading ? "Validating..." : "Validate Pattern"}
            </Button>
            {patterns.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { clearPatterns(); setLastValidation(null); }}
              >
                Clear
              </Button>
            )}
          </div>

          {/* Reversal Zone Calculator */}
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Calculate D Point</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Enter X, A, B, C to predict where D should be for a pattern
            </p>
            <div className="flex items-center gap-2">
              <select
                value={selectedPatternType}
                onChange={(e) => setSelectedPatternType(e.target.value as PatternType)}
                className="h-8 rounded border bg-background px-2 text-sm"
              >
                <option value="gartley">Gartley</option>
                <option value="butterfly">Butterfly</option>
                <option value="bat">Bat</option>
                <option value="crab">Crab</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCalculateReversal}
                disabled={isLoading || !x || !a || !b || !c}
                className="flex-1"
              >
                Calculate D
              </Button>
            </div>
            {reversalZone && (
              <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm capitalize">
                    {reversalZone.pattern_type} D Level:
                  </span>
                  <span className="font-mono text-blue-400 font-medium">
                    {formatPrice(reversalZone.d_level)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Direction: {reversalZone.direction === "buy" ? "Bullish" : "Bearish"}
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="p-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* No Pattern Detected Feedback */}
          {lastValidation === "no_pattern" && !error && (
            <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm">
              <div className="font-medium">No valid pattern detected</div>
              <div className="text-xs text-muted-foreground mt-1">
                The XABCD points do not match any harmonic pattern ratios.
                Try loading an example pattern to see valid inputs.
              </div>
            </div>
          )}

          {/* Validated Patterns */}
          {patterns.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Validated Patterns</span>
              {patterns.map((pattern) => (
                <PatternResultCard key={pattern.id} pattern={pattern} />
              ))}
            </div>
          )}

          {/* Pattern Guide */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="font-medium">Pattern Ratios:</div>
            <div className="grid grid-cols-2 gap-x-4">
              <div><span className="text-emerald-400">Gartley:</span> D at 78.6% XA</div>
              <div><span className="text-purple-400">Butterfly:</span> D at 127-162% XA</div>
              <div><span className="text-orange-400">Bat:</span> D at 88.6% XA</div>
              <div><span className="text-cyan-400">Crab:</span> D at 161.8% XA</div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
