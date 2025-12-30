/**
 * Proxy API route for the Trader Backend.
 * Forwards requests to the Python FastAPI backend.
 */

import { NextRequest, NextResponse } from "next/server";

// Backend URL - configurable via environment variable
const BACKEND_URL = process.env.TRADER_BACKEND_URL || "http://localhost:8000";

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

async function proxyRequest(
  request: NextRequest,
  context: RouteContext,
  method: string
): Promise<NextResponse> {
  try {
    const { path } = await context.params;
    const targetPath = "/" + path.join("/");
    const targetUrl = `${BACKEND_URL}${targetPath}`;

    // Get request body for POST/PUT requests
    let body: string | undefined;
    if (method === "POST" || method === "PUT") {
      body = await request.text();
    }

    // Forward the request to the backend
    const backendResponse = await fetch(targetUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body,
    });

    // Get response data
    const data = await backendResponse.json();

    // Return the response with the same status
    return NextResponse.json(data, {
      status: backendResponse.status,
    });
  } catch (error) {
    console.error("Backend proxy error:", error);

    // Check if it's a connection error
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return NextResponse.json(
        {
          error: "Backend unavailable",
          message:
            "Could not connect to the trading backend. Please ensure it is running.",
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
