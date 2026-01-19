import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

// Create a singleton instance
const yahooFinance = new YahooFinance();

// Valid Yahoo Finance intervals
type YahooInterval = "1m" | "2m" | "5m" | "15m" | "30m" | "60m" | "90m" | "1h" | "1d" | "5d" | "1wk" | "1mo" | "3mo";

// Result type from yahoo-finance2 chart method
type TradingPeriod = { start: Date; end: Date };
type ChartResultArray = {
  meta: {
    currency?: string;
    symbol?: string;
    exchangeName?: string;
    fullExchangeName?: string;
    regularMarketPrice?: number;
    regularMarketTime?: Date;
    regularMarketDayHigh?: number;
    regularMarketDayLow?: number;
    regularMarketVolume?: number;
    previousClose?: number;
    // Market state info
    marketState?: string; // "REGULAR", "PRE", "POST", "CLOSED", "PREPRE", "POSTPOST"
    tradingPeriods?:
      | { pre?: TradingPeriod[][]; regular?: TradingPeriod[][]; post?: TradingPeriod[][] }
      | TradingPeriod[][];
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
  "3m": "1m", // Yahoo doesn't have 3m, use 1m
  "5m": "5m",
  "15m": "15m",
  "1H": "1h",
  "4H": "1h", // Yahoo doesn't have 4h, we'll need to aggregate
  "1D": "1d",
  "1W": "1wk",
  "1M": "1mo",
};

// Get the time span for each timeframe (in milliseconds)
function getTimeframeSpan(timeframe: string): number {
  switch (timeframe) {
    case "1m":
      return 7 * 24 * 60 * 60 * 1000; // 7 days (Yahoo limits 1m data)
    case "3m":
      return 7 * 24 * 60 * 60 * 1000; // 7 days (uses 1m data)
    case "5m":
      return 60 * 24 * 60 * 60 * 1000; // 60 days
    case "15m":
      return 21 * 24 * 60 * 60 * 1000; // 3 weeks
    case "1H":
      return 60 * 24 * 60 * 60 * 1000; // 2 months
    case "4H":
      return 60 * 24 * 60 * 60 * 1000; // 2 months
    case "1D":
      return 365 * 24 * 60 * 60 * 1000; // 1 year
    case "1W":
      return 3 * 365 * 24 * 60 * 60 * 1000; // 3 years
    case "1M":
      return 10 * 365 * 24 * 60 * 60 * 1000; // 10 years
    default:
      return 90 * 24 * 60 * 60 * 1000;
  }
}

// Calculate periods based on timeframe, optionally ending at a specific date
function getPeriodDates(timeframe: string, endDate?: Date): { period1: Date; period2: Date } {
  const period2 = endDate || new Date();
  const span = getTimeframeSpan(timeframe);
  const period1 = new Date(period2.getTime() - span);

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
  const before = searchParams.get("before"); // ISO date string to load data before

  try {
    const yahooSymbol = SYMBOL_MAP[symbol];
    if (!yahooSymbol) {
      return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
    }

    const interval = (INTERVAL_MAP[timeframe] || "1d") as YahooInterval;
    const endDate = before ? new Date(before) : undefined;
    const { period1, period2 } = getPeriodDates(timeframe, endDate);

    const result: ChartResultArray = await yahooFinance.chart(yahooSymbol, {
      period1,
      period2,
      interval,
    });

    if (!result.quotes || result.quotes.length === 0) {
      // Provide context about why data might be unavailable
      const marketState = result.meta?.marketState || "UNKNOWN";
      const isIntraday = ["1m", "15m", "1H", "4H"].includes(timeframe);

      let message = "No data available";
      if (isIntraday && marketState === "CLOSED") {
        message = "No intraday data available - market is closed. Try a daily or weekly timeframe.";
      } else if (isIntraday) {
        message = "No intraday data available for this period. Intraday data is limited to recent trading sessions.";
      }

      return NextResponse.json(
        {
          error: message,
          market: {
            state: marketState,
            stateDisplay: marketState === "CLOSED" ? "Market Closed" : marketState,
          }
        },
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
    const formattedData = quotes.map((q) => {
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

    // Deduplicate by time (keep first occurrence) and ensure ascending order
    const seenTimes = new Set<string | number>();
    const data = formattedData
      .filter((d) => {
        const key = String(d.time);
        if (seenTimes.has(key)) return false;
        seenTimes.add(key);
        return true;
      })
      .sort((a, b) => {
        // Sort ascending by time
        if (typeof a.time === "number" && typeof b.time === "number") {
          return a.time - b.time;
        }
        return String(a.time).localeCompare(String(b.time));
      });

    // Parse market state for user-friendly display
    const marketState = result.meta?.marketState || "UNKNOWN";
    const marketStateDisplay = {
      REGULAR: "Market Open",
      PRE: "Pre-Market",
      POST: "After Hours",
      CLOSED: "Market Closed",
      PREPRE: "Pre-Market (Early)",
      POSTPOST: "After Hours (Late)",
      UNKNOWN: "Unknown",
    }[marketState] || marketState;

    // Get trading periods if available
    const tradingPeriods = result.meta?.tradingPeriods;
    let nextOpen: string | null = null;
    let nextClose: string | null = null;

    // tradingPeriods can be either an object with pre/regular/post or a flat array
    if (tradingPeriods) {
      if ("regular" in tradingPeriods && tradingPeriods.regular?.[0]?.[0]) {
        const regularPeriod = tradingPeriods.regular[0][0];
        nextOpen = regularPeriod.start?.toISOString() || null;
        nextClose = regularPeriod.end?.toISOString() || null;
      } else if (Array.isArray(tradingPeriods) && tradingPeriods[0]?.[0]) {
        const period = tradingPeriods[0][0];
        nextOpen = period.start?.toISOString() || null;
        nextClose = period.end?.toISOString() || null;
      }
    }

    return NextResponse.json({
      symbol,
      timeframe,
      data,
      meta: {
        currency: result.meta?.currency,
        exchangeName: result.meta?.exchangeName,
        fullExchangeName: result.meta?.fullExchangeName,
        regularMarketPrice: result.meta?.regularMarketPrice,
        regularMarketTime: result.meta?.regularMarketTime?.toISOString(),
        previousClose: result.meta?.previousClose,
        regularMarketDayHigh: result.meta?.regularMarketDayHigh,
        regularMarketDayLow: result.meta?.regularMarketDayLow,
        regularMarketVolume: result.meta?.regularMarketVolume,
      },
      market: {
        state: marketState,
        stateDisplay: marketStateDisplay,
        isOpen: marketState === "REGULAR",
        isPreMarket: marketState === "PRE" || marketState === "PREPRE",
        isAfterHours: marketState === "POST" || marketState === "POSTPOST",
        isClosed: marketState === "CLOSED",
        ...(nextOpen && { nextOpen }),
        ...(nextClose && { nextClose }),
      },
    });
  } catch (error) {
    console.error("Yahoo Finance API error:", error);

    // Check for rate limiting
    if (error instanceof Error && error.message.includes("Too Many Requests")) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please wait before refreshing.",
          code: "RATE_LIMIT"
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch market data" },
      { status: 500 }
    );
  }
}
