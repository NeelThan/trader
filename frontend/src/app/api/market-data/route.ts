import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

// Create a singleton instance
const yahooFinance = new YahooFinance();

// Valid Yahoo Finance intervals
type YahooInterval = "1m" | "2m" | "5m" | "15m" | "30m" | "60m" | "90m" | "1h" | "1d" | "5d" | "1wk" | "1mo" | "3mo";

// Result type from yahoo-finance2 chart method
type ChartResultArray = {
  meta: {
    currency?: string;
    symbol?: string;
    exchangeName?: string;
    regularMarketPrice?: number;
  };
  quotes: Array<{
    date: Date;
    high: number | null;
    low: number | null;
    open: number | null;
    close: number | null;
    volume: number | null;
  }>;
};

// Map our symbols to Yahoo Finance symbols
const SYMBOL_MAP: Record<string, string> = {
  DJI: "^DJI",
  SPX: "^GSPC",
  NDX: "^NDX",
  BTCUSD: "BTC-USD",
  EURUSD: "EURUSD=X",
  GOLD: "GC=F",
};

// Map our timeframes to Yahoo Finance intervals
const INTERVAL_MAP: Record<string, string> = {
  "1m": "1m",
  "15m": "15m",
  "1H": "1h",
  "4H": "1h", // Yahoo doesn't have 4h, we'll need to aggregate
  "1D": "1d",
  "1W": "1wk",
  "1M": "1mo",
};

// Calculate periods based on timeframe
function getPeriodDates(timeframe: string): { period1: Date; period2: Date } {
  const now = new Date();
  const period2 = now;
  let period1: Date;

  switch (timeframe) {
    case "1m":
      // 4 hours of 1-minute data
      period1 = new Date(now.getTime() - 4 * 60 * 60 * 1000);
      break;
    case "15m":
      // 2 days of 15-minute data
      period1 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      break;
    case "1H":
      // 1 week of hourly data
      period1 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "4H":
      // 3 weeks of 4-hour data (fetched as hourly then aggregated)
      period1 = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
      break;
    case "1D":
      // 90 days of daily data
      period1 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "1W":
      // 1 year of weekly data
      period1 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case "1M":
      // 5 years of monthly data
      period1 = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      period1 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  }

  return { period1, period2 };
}

// Quote type for internal use
type Quote = {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

// Aggregate hourly data to 4-hour bars
function aggregateTo4Hour(data: Quote[]): Quote[] {
  const result: Quote[] = [];

  for (let i = 0; i < data.length; i += 4) {
    const chunk = data.slice(i, i + 4);
    if (chunk.length === 0) continue;

    result.push({
      date: chunk[0].date,
      open: chunk[0].open,
      high: Math.max(...chunk.map((c) => c.high)),
      low: Math.min(...chunk.map((c) => c.low)),
      close: chunk[chunk.length - 1].close,
      volume: chunk.reduce((sum, c) => sum + (c.volume ?? 0), 0),
    });
  }

  return result;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get("symbol") || "DJI";
  const timeframe = searchParams.get("timeframe") || "1D";

  try {
    const yahooSymbol = SYMBOL_MAP[symbol];
    if (!yahooSymbol) {
      return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
    }

    const interval = (INTERVAL_MAP[timeframe] || "1d") as YahooInterval;
    const { period1, period2 } = getPeriodDates(timeframe);

    const result: ChartResultArray = await yahooFinance.chart(yahooSymbol, {
      period1,
      period2,
      interval,
    });

    if (!result.quotes || result.quotes.length === 0) {
      return NextResponse.json(
        { error: "No data available" },
        { status: 404 }
      );
    }

    // Transform data to our format
    let quotes: Quote[] = result.quotes
      .filter(
        (q) =>
          q.open !== null &&
          q.high !== null &&
          q.low !== null &&
          q.close !== null
      )
      .map((q) => ({
        date: q.date,
        open: q.open as number,
        high: q.high as number,
        low: q.low as number,
        close: q.close as number,
        volume: q.volume,
      }));

    // Aggregate to 4-hour if needed
    if (timeframe === "4H") {
      quotes = aggregateTo4Hour(quotes);
    }

    // Format time based on timeframe
    const data = quotes.map((q) => {
      let time: string | number;
      if (timeframe === "1D" || timeframe === "1W" || timeframe === "1M") {
        // Use date string for daily and above
        time = q.date.toISOString().split("T")[0];
      } else {
        // Use Unix timestamp for intraday
        time = Math.floor(q.date.getTime() / 1000);
      }

      return {
        time,
        open: Number(q.open.toFixed(2)),
        high: Number(q.high.toFixed(2)),
        low: Number(q.low.toFixed(2)),
        close: Number(q.close.toFixed(2)),
      };
    });

    return NextResponse.json({
      symbol,
      timeframe,
      data,
      meta: {
        currency: result.meta?.currency,
        exchangeName: result.meta?.exchangeName,
        regularMarketPrice: result.meta?.regularMarketPrice,
      },
    });
  } catch (error) {
    console.error("Yahoo Finance API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch market data" },
      { status: 500 }
    );
  }
}
