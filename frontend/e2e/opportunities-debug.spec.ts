import { test, expect } from "@playwright/test";

/**
 * Debug test for opportunities panel - checking why single panel shows no opportunities
 * while multi-scan shows opportunities for DJI
 */
test.describe("Opportunities Debug", () => {
  test("Check single symbol opportunities for DJI", async ({ page }) => {
    // Enable console logging
    page.on("console", (msg) => {
      if (msg.type() === "log" || msg.type() === "warn" || msg.type() === "error") {
        console.log(`[Browser ${msg.type()}]: ${msg.text()}`);
      }
    });

    await page.goto("/workflow-v2");
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    // Wait for trends to load
    await page.waitForTimeout(5000);

    // Check what the discovery panel shows
    const discoveryPanel = page.locator('text=/No opportunities|Trade Opportunities|opportunities found|Waiting/').first();
    const panelText = await discoveryPanel.textContent().catch(() => "not found");
    console.log(`Discovery panel text: ${panelText}`);

    // Check for any errors displayed
    const errorText = page.locator('text=/error|Error|unavailable/i').first();
    const hasError = await errorText.isVisible().catch(() => false);
    if (hasError) {
      const errMsg = await errorText.textContent();
      console.log(`Error visible: ${errMsg}`);
    }

    // Check the stats in the header
    const stats = page.locator('text=/\\d+ active \\/ \\d+ opportunities/');
    const statsText = await stats.textContent().catch(() => "stats not found");
    console.log(`Stats: ${statsText}`);

    // Take screenshot
    await page.screenshot({ path: "test-results/single-panel-dji.png" });
  });

  test("Check API responses for trend alignment", async ({ page }) => {
    // Track API calls
    const apiCalls: { url: string; status: number; body?: string }[] = [];

    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("/api/trader/")) {
        const status = response.status();
        let body = "";
        try {
          body = await response.text();
          if (body.length > 500) body = body.substring(0, 500) + "...";
        } catch {
          body = "[could not read body]";
        }
        apiCalls.push({ url, status, body });
      }
    });

    await page.goto("/workflow-v2");
    await page.waitForLoadState("networkidle", { timeout: 30000 });
    await page.waitForTimeout(5000);

    console.log("\n=== API Calls Made ===");
    for (const call of apiCalls) {
      console.log(`${call.status} ${call.url}`);
      if (call.status !== 200) {
        console.log(`  Body: ${call.body}`);
      }
    }

    // Check specifically for market-data and indicator calls
    const marketDataCalls = apiCalls.filter((c) => c.url.includes("market-data"));
    const indicatorCalls = apiCalls.filter((c) =>
      c.url.includes("indicators") || c.url.includes("pivot")
    );
    const workflowCalls = apiCalls.filter((c) => c.url.includes("workflow"));

    console.log(`\nMarket data calls: ${marketDataCalls.length}`);
    console.log(`Indicator calls: ${indicatorCalls.length}`);
    console.log(`Workflow calls: ${workflowCalls.length}`);

    // Check for failed calls
    const failedCalls = apiCalls.filter((c) => c.status >= 400);
    if (failedCalls.length > 0) {
      console.log(`\n=== FAILED CALLS ===`);
      for (const call of failedCalls) {
        console.log(`${call.status} ${call.url}`);
        console.log(`  ${call.body}`);
      }
    }
  });

  test("Check trend data being received", async ({ page }) => {
    // Inject script to capture trend data
    await page.addInitScript(() => {
      // @ts-ignore
      window.__trendDebug = [];
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        const url = args[0]?.toString() || "";
        if (url.includes("workflow") || url.includes("market-data") || url.includes("pivot")) {
          try {
            const clone = response.clone();
            const data = await clone.json();
            // @ts-ignore
            window.__trendDebug.push({ url, data });
          } catch {
            // ignore
          }
        }
        return response;
      };
    });

    await page.goto("/workflow-v2");
    await page.waitForLoadState("networkidle", { timeout: 30000 });
    await page.waitForTimeout(5000);

    // Get the captured data
    const debugData = await page.evaluate(() => {
      // @ts-ignore
      return window.__trendDebug || [];
    });

    console.log("\n=== Trend Debug Data ===");
    for (const item of debugData) {
      console.log(`URL: ${item.url}`);
      console.log(`Data: ${JSON.stringify(item.data, null, 2).substring(0, 1000)}`);
      console.log("---");
    }
  });

  test("Direct API test - workflow opportunities endpoint", async ({ page }) => {
    // Test the workflow opportunities endpoint directly
    const response = await page.request.get(
      "/api/trader/workflow/opportunities?symbol=DJI&timeframe_pairs=1D-4H,4H-1H,1H-15m"
    );

    console.log(`Workflow opportunities status: ${response.status()}`);

    if (response.ok()) {
      const data = await response.json();
      console.log(`Response: ${JSON.stringify(data, null, 2)}`);
    } else {
      const text = await response.text();
      console.log(`Error: ${text}`);
    }
  });

  test("Direct API test - market data for multiple timeframes", async ({ page }) => {
    const timeframes = ["1D", "4H", "1H", "15m"];

    for (const tf of timeframes) {
      const response = await page.request.get(
        `/api/trader/market-data?symbol=DJI&timeframe=${tf}&periods=100`
      );

      console.log(`Market data ${tf}: ${response.status()}`);

      if (response.ok()) {
        const data = await response.json();
        console.log(`  Success: ${data.success}, Provider: ${data.provider}, Points: ${data.data?.length}`);
      } else {
        const text = await response.text();
        console.log(`  Error: ${text.substring(0, 200)}`);
      }
    }
  });
});
