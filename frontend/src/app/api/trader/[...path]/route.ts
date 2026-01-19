/**
 * Proxy API route for the Trader Backend.
 * Forwards requests to the Python FastAPI backend.
 */

import { NextRequest, NextResponse } from "next/server";
import http from "http";

// Backend configuration - use explicit IPv4 to avoid resolution issues on Windows
const BACKEND_HOST = process.env.TRADER_BACKEND_HOST || "127.0.0.1";
const BACKEND_PORT = parseInt(process.env.TRADER_BACKEND_PORT || "8000", 10);

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  return proxyRequest(request, context, "GET");
}

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  return proxyRequest(request, context, "POST");
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  return proxyRequest(request, context, "PUT");
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  return proxyRequest(request, context, "DELETE");
}

/**
 * Make HTTP request using Node.js http module for reliable IPv4 connections
 */
function makeHttpRequest(
  method: string,
  path: string,
  body?: string
): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const options: http.RequestOptions = {
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(body ? { "Content-Length": Buffer.byteLength(body) } : {}),
      },
      // Explicitly use IPv4
      family: 4,
    };

    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode || 200, data: jsonData });
        } catch {
          resolve({ status: res.statusCode || 200, data: { raw: data } });
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    // Set timeout
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

async function proxyRequest(
  request: NextRequest,
  context: RouteContext,
  method: string
): Promise<NextResponse> {
  try {
    const { path } = await context.params;
    const targetPath = "/" + path.join("/");

    // Forward query parameters
    const searchParams = request.nextUrl.searchParams.toString();
    const queryString = searchParams ? `?${searchParams}` : "";
    const fullPath = `${targetPath}${queryString}`;

    // Get request body for POST/PUT requests
    let body: string | undefined;
    if (method === "POST" || method === "PUT") {
      body = await request.text();
    }

    // Make the request using Node.js http module
    const { status, data } = await makeHttpRequest(method, fullPath, body);

    // Return the response with the same status
    return NextResponse.json(data, { status });
  } catch (error) {
    // Log detailed error information
    console.error("Backend proxy error:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      code: (error as NodeJS.ErrnoException).code,
    });

    // Check if it's a connection error
    const errCode = (error as NodeJS.ErrnoException).code;
    const isConnectionError =
      errCode === "ECONNREFUSED" ||
      errCode === "ENOTFOUND" ||
      errCode === "ETIMEDOUT" ||
      errCode === "ECONNRESET" ||
      (error instanceof Error && error.message.includes("connect"));

    if (isConnectionError) {
      return NextResponse.json(
        {
          error: "Backend unavailable",
          message:
            "Could not connect to the trading backend. Please ensure it is running.",
          debug: {
            host: BACKEND_HOST,
            port: BACKEND_PORT,
            errorCode: errCode,
            errorMessage: error instanceof Error ? error.message : String(error),
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: "Proxy error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
