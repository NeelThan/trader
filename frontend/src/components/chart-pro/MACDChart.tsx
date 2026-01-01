"use client";

/**
 * MACD Histogram Chart Component
 *
 * Simple SVG-based MACD histogram visualization showing the last 50 bars.
 * Uses chart colors to indicate positive (up) and negative (down) values.
 */

export type MACDChartProps = {
  macdData: { histogram: (number | null)[] } | null;
  chartColors: { up: string; down: string };
};

export function MACDChart({ macdData, chartColors }: MACDChartProps) {
  if (!macdData || !macdData.histogram) return null;

  // Get last 50 histogram values
  const histogramValues = macdData.histogram.slice(-50).map((v) => v ?? 0);

  if (histogramValues.length === 0) return null;

  const maxAbs = Math.max(...histogramValues.map(Math.abs), 0.0001);
  const height = 100;
  const width = 100;
  const barWidth = width / histogramValues.length;

  return (
    <div className="mt-4">
      <div className="text-xs text-muted-foreground mb-2">
        MACD Histogram (last 50 bars)
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[100px] border border-border rounded"
        preserveAspectRatio="none"
      >
        {/* Zero line */}
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="currentColor"
          strokeOpacity="0.3"
          strokeWidth="0.5"
        />

        {/* Histogram bars */}
        {histogramValues.map((value, i) => {
          const normalizedValue = (value / maxAbs) * (height / 2 - 5);
          const barHeight = Math.abs(normalizedValue);
          const y = value >= 0 ? height / 2 - barHeight : height / 2;

          return (
            <rect
              key={i}
              x={i * barWidth}
              y={y}
              width={barWidth - 0.5}
              height={barHeight}
              fill={value >= 0 ? chartColors.up : chartColors.down}
              opacity={0.8}
            />
          );
        })}
      </svg>
    </div>
  );
}
