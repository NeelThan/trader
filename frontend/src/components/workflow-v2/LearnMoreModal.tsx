/**
 * Learn More Modal Component
 *
 * Educational modal for detailed explanations with visual diagrams.
 * Provides in-depth learning content for trading concepts.
 */

"use client";

import { useCallback, useEffect } from "react";
import { X, BookOpen, Lightbulb, Calculator, Link2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Topic categories for styling and filtering
 */
export type TopicCategory =
  | "fibonacci"
  | "trend"
  | "indicator"
  | "risk"
  | "validation";

/**
 * Diagram type for visual aids
 */
export type DiagramType =
  | "fibonacci-retracement"
  | "fibonacci-extension"
  | "swing-patterns"
  | "trend-structure"
  | "rsi-zones"
  | "macd-signals"
  | "position-sizing";

/**
 * Educational topic structure
 */
export type EducationalTopic = {
  /** Unique topic identifier */
  id: string;
  /** Display title */
  title: string;
  /** Category for styling */
  category: TopicCategory;
  /** Brief description (1-2 sentences) */
  brief: string;
  /** Detailed explanation */
  detailed: string;
  /** Key learning points */
  keyPoints?: string[];
  /** Formula if applicable */
  formula?: string;
  /** Worked example */
  example?: {
    scenario: string;
    calculation: string;
    result: string;
  };
  /** Related topic IDs */
  relatedTopics?: string[];
  /** Visual diagram */
  diagram?: {
    type: DiagramType;
    alt: string;
  };
};

export type LearnMoreModalProps = {
  /** Topic to display */
  topic: EducationalTopic;
  /** Whether modal is open */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Navigate to related topic */
  onNavigateTopic?: (topicId: string) => void;
};

/**
 * Category color configuration
 */
const CATEGORY_COLORS: Record<TopicCategory, string> = {
  fibonacci: "bg-blue-500/20 text-blue-400",
  trend: "bg-green-500/20 text-green-400",
  indicator: "bg-purple-500/20 text-purple-400",
  risk: "bg-amber-500/20 text-amber-400",
  validation: "bg-cyan-500/20 text-cyan-400",
};

/**
 * Diagram SVG components for visual learning
 */
function FibonacciRetracementDiagram() {
  return (
    <svg
      role="img"
      aria-label="Fibonacci retracement levels diagram"
      viewBox="0 0 400 200"
      className="w-full h-auto"
    >
      {/* Price axis */}
      <line x1="50" y1="20" x2="50" y2="180" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      {/* Time axis */}
      <line x1="50" y1="180" x2="380" y2="180" stroke="currentColor" strokeWidth="1" opacity="0.3" />

      {/* Uptrend swing */}
      <path
        d="M 60 160 L 120 40 L 180 100 L 240 60"
        fill="none"
        stroke="#22c55e"
        strokeWidth="2"
      />

      {/* Fib levels */}
      <line x1="120" y1="40" x2="380" y2="40" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4" />
      <text x="385" y="44" fill="#3b82f6" fontSize="10">0%</text>

      <line x1="120" y1="86" x2="380" y2="86" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4" />
      <text x="385" y="90" fill="#3b82f6" fontSize="10">38.2%</text>

      <line x1="120" y1="100" x2="380" y2="100" stroke="#eab308" strokeWidth="1" strokeDasharray="4" />
      <text x="385" y="104" fill="#eab308" fontSize="10">50%</text>

      <line x1="120" y1="114" x2="380" y2="114" stroke="#f97316" strokeWidth="1" strokeDasharray="4" />
      <text x="385" y="118" fill="#f97316" fontSize="10">61.8%</text>

      <line x1="120" y1="160" x2="380" y2="160" stroke="#ef4444" strokeWidth="1" strokeDasharray="4" />
      <text x="385" y="164" fill="#ef4444" fontSize="10">100%</text>

      {/* Labels */}
      <text x="60" y="170" fill="currentColor" fontSize="10" opacity="0.7">Swing Low</text>
      <text x="110" y="32" fill="currentColor" fontSize="10" opacity="0.7">Swing High</text>
      <text x="170" y="115" fill="#22c55e" fontSize="10">Entry Zone</text>
    </svg>
  );
}

function FibonacciExtensionDiagram() {
  return (
    <svg
      role="img"
      aria-label="Fibonacci extension levels diagram"
      viewBox="0 0 400 200"
      className="w-full h-auto"
    >
      {/* Original swing */}
      <path
        d="M 60 160 L 140 60 L 200 100"
        fill="none"
        stroke="#22c55e"
        strokeWidth="2"
      />

      {/* Extension projection */}
      <path
        d="M 200 100 L 300 20"
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeDasharray="4"
      />

      {/* Extension levels */}
      <line x1="140" y1="60" x2="380" y2="60" stroke="#6b7280" strokeWidth="1" strokeDasharray="2" />
      <text x="385" y="64" fill="#6b7280" fontSize="10">100%</text>

      <line x1="200" y1="37" x2="380" y2="37" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4" />
      <text x="385" y="41" fill="#3b82f6" fontSize="10">127.2%</text>

      <line x1="260" y1="20" x2="380" y2="20" stroke="#22c55e" strokeWidth="1" strokeDasharray="4" />
      <text x="385" y="24" fill="#22c55e" fontSize="10">161.8%</text>

      {/* Labels */}
      <text x="50" y="170" fill="currentColor" fontSize="10" opacity="0.7">A</text>
      <text x="135" y="52" fill="currentColor" fontSize="10" opacity="0.7">B</text>
      <text x="195" y="115" fill="currentColor" fontSize="10" opacity="0.7">C</text>
      <text x="250" y="100" fill="#3b82f6" fontSize="10">Targets</text>
    </svg>
  );
}

function SwingPatternsDiagram() {
  return (
    <svg
      role="img"
      aria-label="Swing patterns diagram showing HH, HL, LH, LL"
      viewBox="0 0 400 200"
      className="w-full h-auto"
    >
      {/* Uptrend: HH and HL */}
      <path
        d="M 30 160 L 60 80 L 90 120 L 120 40 L 150 90"
        fill="none"
        stroke="#22c55e"
        strokeWidth="2"
      />
      <circle cx="60" cy="80" r="4" fill="#22c55e" />
      <text x="55" y="72" fill="#22c55e" fontSize="9">H</text>
      <circle cx="90" cy="120" r="4" fill="#22c55e" />
      <text x="85" y="135" fill="#22c55e" fontSize="9">HL</text>
      <circle cx="120" cy="40" r="4" fill="#22c55e" />
      <text x="115" y="32" fill="#22c55e" fontSize="9">HH</text>

      {/* Downtrend: LH and LL */}
      <path
        d="M 230 40 L 260 100 L 290 70 L 320 140 L 350 110"
        fill="none"
        stroke="#ef4444"
        strokeWidth="2"
      />
      <circle cx="260" cy="100" r="4" fill="#ef4444" />
      <text x="255" y="115" fill="#ef4444" fontSize="9">L</text>
      <circle cx="290" cy="70" r="4" fill="#ef4444" />
      <text x="285" y="62" fill="#ef4444" fontSize="9">LH</text>
      <circle cx="320" cy="140" r="4" fill="#ef4444" />
      <text x="315" y="155" fill="#ef4444" fontSize="9">LL</text>

      {/* Labels */}
      <text x="70" y="180" fill="#22c55e" fontSize="11">Uptrend</text>
      <text x="265" y="180" fill="#ef4444" fontSize="11">Downtrend</text>
    </svg>
  );
}

function TrendStructureDiagram() {
  return (
    <svg
      role="img"
      aria-label="Trend structure diagram"
      viewBox="0 0 400 200"
      className="w-full h-auto"
    >
      {/* Uptrend channel */}
      <line x1="40" y1="180" x2="180" y2="60" stroke="#22c55e" strokeWidth="1" strokeDasharray="4" />
      <line x1="40" y1="140" x2="180" y2="20" stroke="#22c55e" strokeWidth="1" strokeDasharray="4" />

      {/* Price within channel */}
      <path
        d="M 50 170 L 80 100 L 110 140 L 140 70 L 170 110"
        fill="none"
        stroke="#22c55e"
        strokeWidth="2"
      />

      {/* Downtrend channel */}
      <line x1="220" y1="20" x2="360" y2="140" stroke="#ef4444" strokeWidth="1" strokeDasharray="4" />
      <line x1="220" y1="60" x2="360" y2="180" stroke="#ef4444" strokeWidth="1" strokeDasharray="4" />

      {/* Price within channel */}
      <path
        d="M 230 30 L 260 90 L 290 60 L 320 120 L 350 90"
        fill="none"
        stroke="#ef4444"
        strokeWidth="2"
      />

      {/* Labels */}
      <text x="80" y="195" fill="#22c55e" fontSize="11">Bullish Trend</text>
      <text x="260" y="195" fill="#ef4444" fontSize="11">Bearish Trend</text>
    </svg>
  );
}

function RSIZonesDiagram() {
  return (
    <svg
      role="img"
      aria-label="RSI zones diagram showing overbought and oversold areas"
      viewBox="0 0 400 200"
      className="w-full h-auto"
    >
      {/* Overbought zone */}
      <rect x="50" y="20" width="330" height="40" fill="#ef4444" fillOpacity="0.2" />
      <text x="200" y="45" fill="#ef4444" fontSize="10" textAnchor="middle">Overbought (70-100)</text>

      {/* Neutral zone */}
      <rect x="50" y="60" width="330" height="80" fill="#6b7280" fillOpacity="0.1" />
      <text x="200" y="105" fill="#6b7280" fontSize="10" textAnchor="middle">Neutral (30-70)</text>

      {/* Oversold zone */}
      <rect x="50" y="140" width="330" height="40" fill="#22c55e" fillOpacity="0.2" />
      <text x="200" y="165" fill="#22c55e" fontSize="10" textAnchor="middle">Oversold (0-30)</text>

      {/* RSI line */}
      <path
        d="M 60 80 L 100 50 L 140 90 L 180 30 L 220 100 L 260 150 L 300 120 L 340 70"
        fill="none"
        stroke="#a855f7"
        strokeWidth="2"
      />

      {/* Level lines */}
      <line x1="50" y1="60" x2="380" y2="60" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="50" y1="140" x2="380" y2="140" stroke="currentColor" strokeWidth="1" opacity="0.3" />

      <text x="385" y="64" fill="currentColor" fontSize="9" opacity="0.5">70</text>
      <text x="385" y="144" fill="currentColor" fontSize="9" opacity="0.5">30</text>
    </svg>
  );
}

function MACDSignalsDiagram() {
  return (
    <svg
      role="img"
      aria-label="MACD signals diagram showing crossovers"
      viewBox="0 0 400 200"
      className="w-full h-auto"
    >
      {/* Zero line */}
      <line x1="50" y1="100" x2="380" y2="100" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <text x="385" y="104" fill="currentColor" fontSize="9" opacity="0.5">0</text>

      {/* MACD line */}
      <path
        d="M 60 130 L 100 110 L 140 80 L 180 60 L 220 90 L 260 120 L 300 140 L 340 110"
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
      />

      {/* Signal line */}
      <path
        d="M 60 120 L 100 115 L 140 95 L 180 75 L 220 85 L 260 110 L 300 130 L 340 120"
        fill="none"
        stroke="#f97316"
        strokeWidth="2"
      />

      {/* Bullish crossover */}
      <circle cx="140" cy="85" r="6" fill="none" stroke="#22c55e" strokeWidth="2" />
      <text x="130" y="70" fill="#22c55e" fontSize="9">Bullish</text>

      {/* Bearish crossover */}
      <circle cx="260" cy="115" r="6" fill="none" stroke="#ef4444" strokeWidth="2" />
      <text x="250" y="145" fill="#ef4444" fontSize="9">Bearish</text>

      {/* Legend */}
      <line x1="60" y1="180" x2="80" y2="180" stroke="#3b82f6" strokeWidth="2" />
      <text x="85" y="184" fill="#3b82f6" fontSize="9">MACD</text>
      <line x1="140" y1="180" x2="160" y2="180" stroke="#f97316" strokeWidth="2" />
      <text x="165" y="184" fill="#f97316" fontSize="9">Signal</text>
    </svg>
  );
}

function PositionSizingDiagram() {
  return (
    <svg
      role="img"
      aria-label="Position sizing calculation diagram"
      viewBox="0 0 400 200"
      className="w-full h-auto"
    >
      {/* Account box */}
      <rect x="30" y="30" width="100" height="60" rx="8" fill="#3b82f6" fillOpacity="0.2" stroke="#3b82f6" strokeWidth="1" />
      <text x="80" y="55" fill="#3b82f6" fontSize="10" textAnchor="middle">Account</text>
      <text x="80" y="75" fill="#3b82f6" fontSize="12" textAnchor="middle">$10,000</text>

      {/* Arrow */}
      <path d="M 135 60 L 165 60" stroke="currentColor" strokeWidth="1" markerEnd="url(#arrow)" />
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
          <path d="M0,0 L0,6 L9,3 z" fill="currentColor" />
        </marker>
      </defs>

      {/* Risk box */}
      <rect x="170" y="30" width="80" height="60" rx="8" fill="#eab308" fillOpacity="0.2" stroke="#eab308" strokeWidth="1" />
      <text x="210" y="55" fill="#eab308" fontSize="10" textAnchor="middle">Risk 1%</text>
      <text x="210" y="75" fill="#eab308" fontSize="12" textAnchor="middle">$100</text>

      {/* Arrow */}
      <path d="M 255 60 L 285 60" stroke="currentColor" strokeWidth="1" markerEnd="url(#arrow)" />

      {/* Position box */}
      <rect x="290" y="30" width="80" height="60" rx="8" fill="#22c55e" fillOpacity="0.2" stroke="#22c55e" strokeWidth="1" />
      <text x="330" y="55" fill="#22c55e" fontSize="10" textAnchor="middle">Position</text>
      <text x="330" y="75" fill="#22c55e" fontSize="12" textAnchor="middle">10 units</text>

      {/* Formula */}
      <rect x="100" y="120" width="200" height="50" rx="8" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" strokeOpacity="0.2" />
      <text x="200" y="145" fill="currentColor" fontSize="11" textAnchor="middle">Position = Risk / Stop Distance</text>
      <text x="200" y="160" fill="currentColor" fontSize="10" textAnchor="middle" opacity="0.7">$100 / $10 = 10 units</text>
    </svg>
  );
}

/**
 * Diagram component selector
 */
function DiagramRenderer({ type, alt }: { type: DiagramType; alt: string }) {
  switch (type) {
    case "fibonacci-retracement":
      return <FibonacciRetracementDiagram />;
    case "fibonacci-extension":
      return <FibonacciExtensionDiagram />;
    case "swing-patterns":
      return <SwingPatternsDiagram />;
    case "trend-structure":
      return <TrendStructureDiagram />;
    case "rsi-zones":
      return <RSIZonesDiagram />;
    case "macd-signals":
      return <MACDSignalsDiagram />;
    case "position-sizing":
      return <PositionSizingDiagram />;
    default:
      return null;
  }
}

export function LearnMoreModal({
  topic,
  open,
  onClose,
  onNavigateTopic,
}: LearnMoreModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <DialogTitle className="text-xl">{topic.title}</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Badge className={cn("w-fit", CATEGORY_COLORS[topic.category])}>
            {topic.category}
          </Badge>
          <DialogDescription className="sr-only">
            Educational content about {topic.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Brief description */}
          <p className="text-muted-foreground text-lg">{topic.brief}</p>

          {/* Visual diagram */}
          {topic.diagram && (
            <Card>
              <CardContent className="pt-4">
                <DiagramRenderer
                  type={topic.diagram.type}
                  alt={topic.diagram.alt}
                />
              </CardContent>
            </Card>
          )}

          {/* Detailed explanation */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Explanation
            </h3>
            <p className="text-muted-foreground">{topic.detailed}</p>
          </div>

          {/* Key points */}
          {topic.keyPoints && topic.keyPoints.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                Key Points
              </h3>
              <ul className="space-y-1">
                {topic.keyPoints.map((point, index) => (
                  <li
                    key={index}
                    className="text-muted-foreground flex items-start gap-2"
                  >
                    <span className="text-primary">•</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Formula */}
          {topic.formula && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-blue-500" />
                Formula
              </h3>
              <Card>
                <CardContent className="py-3">
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    {topic.formula}
                  </code>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Example */}
          {topic.example && (
            <div>
              <h3 className="font-semibold mb-2">Example</h3>
              <Card>
                <CardContent className="py-3 space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Scenario:{" "}
                    </span>
                    <span className="text-sm">{topic.example.scenario}</span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Calculation:{" "}
                    </span>
                    <span className="text-sm font-mono">
                      {topic.example.calculation}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Result:{" "}
                    </span>
                    <span className="text-sm font-semibold text-green-400">
                      {topic.example.result}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Related topics */}
          {topic.relatedTopics && topic.relatedTopics.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Related Topics
              </h3>
              <div className="flex flex-wrap gap-2">
                {topic.relatedTopics.map((relatedId) => (
                  <Button
                    key={relatedId}
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigateTopic?.(relatedId)}
                    aria-label={relatedId}
                  >
                    {relatedId}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
