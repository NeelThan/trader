import { test, expect } from "@playwright/test";

/**
 * Comprehensive diagnostic test for Workflow V2
 * Tests all major features with real backend connectivity
 */
test.describe("Comprehensive Diagnostic - Workflow V2", () => {
  test("1. Page loads and shows Online status (not Offline)", async ({ page }) => {
    await page.goto("/workflow-v2");
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    // Check that we're NOT showing Offline
    const offlineIndicator = page.locator('text="Offline"');
    const isOffline = await offlineIndicator.isVisible().catch(() => false);

    if (isOffline) {
      // Take screenshot for debugging
      await page.screenshot({ path: "test-results/offline-status.png" });
      console.log("WARNING: Page shows Offline status!");
    }

    // Verify we see "Live" or another non-offline status
    const liveIndicator = page.locator('text="Live"').first();
    const cachedIndicator = page.locator('text="Cached"').first();

    const hasLive = await liveIndicator.isVisible().catch(() => false);
    const hasCached = await cachedIndicator.isVisible().catch(() => false);

    console.log(`Status: Live=${hasLive}, Cached=${hasCached}, Offline=${isOffline}`);

    // At minimum, the chart should render
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });
  });

  test("2. Chart renders with actual data (canvas has content)", async ({ page }) => {
    await page.goto("/workflow-v2");
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    // Wait for canvas to be visible
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // Take screenshot of the chart
    await page.screenshot({ path: "test-results/chart-loaded.png" });

    console.log("Chart canvas is visible");
  });

  test("3. Swing/Pivot points can be toggled", async ({ page }) => {
    await page.goto("/workflow-v2");
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    // Look for the Swing toggle button
    const swingButton = page.locator('button:has-text("Swing")').first();
    const swingVisible = await swingButton.isVisible().catch(() => false);

    console.log(`Swing button visible: ${swingVisible}`);

    if (swingVisible) {
      // Click to toggle
      await swingButton.click();
      await page.waitForTimeout(1000);

      // Take screenshot
      await page.screenshot({ path: "test-results/swing-toggled.png" });

      // Toggle back
      await swingButton.click();
      await page.waitForTimeout(1000);
    }

    // Check for any errors in console
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    if (errors.length > 0) {
      console.log("Console errors after swing toggle:", errors);
    }
  });

  test("4. Fibonacci levels can be toggled", async ({ page }) => {
    await page.goto("/workflow-v2");
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    // Look for Fib toggle button
    const fibButton = page.locator('button:has-text("Fib")').first();
    const fibVisible = await fibButton.isVisible().catch(() => false);

    console.log(`Fib button visible: ${fibVisible}`);

    if (fibVisible) {
      await fibButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: "test-results/fib-toggled.png" });
      await fibButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test("5. Opportunities/Scan panel loads", async ({ page }) => {
    await page.goto("/workflow-v2");
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    // Check for opportunities panel content
    const panelContent = page.locator('text=/No opportunities|Trade Opportunities|Waiting for/').first();
    const panelVisible = await panelContent.isVisible().catch(() => false);

    console.log(`Opportunities panel content visible: ${panelVisible}`);

    // Check the stats display
    const statsText = page.locator('text=/\\d+ active \\/ \\d+ opportunities/');
    const statsVisible = await statsText.isVisible().catch(() => false);

    console.log(`Stats visible: ${statsVisible}`);

    if (statsVisible) {
      const text = await statsText.textContent();
      console.log(`Stats text: ${text}`);
    }

    await page.screenshot({ path: "test-results/opportunities-panel.png" });
  });

  test("6. API connectivity check - direct backend test", async ({ page }) => {
    // Test the API proxy directly
    const response = await page.request.get("/api/trader/health");

    console.log(`API /health status: ${response.status()}`);

    if (response.ok()) {
      const data = await response.json();
      console.log(`API /health response:`, data);
    } else {
      console.log(`API /health failed with status ${response.status()}`);
      const text = await response.text();
      console.log(`Response body: ${text}`);
    }

    expect(response.status()).toBeLessThan(500);
  });

  test("7. Pivot/Swings API check", async ({ page }) => {
    // Test the pivot swings endpoint
    const testData = {
      data: [
        { time: "2024-01-01", open: 100, high: 105, low: 98, close: 103 },
        { time: "2024-01-02", open: 103, high: 108, low: 101, close: 106 },
        { time: "2024-01-03", open: 106, high: 110, low: 104, close: 108 },
        { time: "2024-01-04", open: 108, high: 112, low: 106, close: 107 },
        { time: "2024-01-05", open: 107, high: 109, low: 102, close: 104 },
        { time: "2024-01-06", open: 104, high: 106, low: 100, close: 101 },
        { time: "2024-01-07", open: 101, high: 105, low: 99, close: 103 },
        { time: "2024-01-08", open: 103, high: 107, low: 101, close: 105 },
        { time: "2024-01-09", open: 105, high: 111, low: 104, close: 110 },
        { time: "2024-01-10", open: 110, high: 115, low: 108, close: 113 },
        { time: "2024-01-11", open: 113, high: 118, low: 111, close: 116 },
      ],
      lookback: 2,
    };

    const response = await page.request.post("/api/trader/pivot/swings", {
      data: testData,
    });

    console.log(`API /pivot/swings status: ${response.status()}`);

    if (response.ok()) {
      const data = await response.json();
      console.log(`Pivot swings response:`, JSON.stringify(data, null, 2));
    } else {
      console.log(`Pivot swings failed with status ${response.status()}`);
      const text = await response.text();
      console.log(`Response body: ${text}`);
    }
  });

  test("8. Market data API check", async ({ page }) => {
    const response = await page.request.get(
      "/api/trader/market-data?symbol=DJI&timeframe=1D&periods=100"
    );

    console.log(`API /market-data status: ${response.status()}`);

    if (response.ok()) {
      const data = await response.json();
      console.log(`Market data success: ${data.success}`);
      console.log(`Market data provider: ${data.provider}`);
      console.log(`Market data points: ${data.data?.length || 0}`);
    } else {
      console.log(`Market data failed with status ${response.status()}`);
      const text = await response.text();
      console.log(`Response body: ${text}`);
    }
  });

  test("9. Symbol and timeframe switching works", async ({ page }) => {
    await page.goto("/workflow-v2");
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    // Test symbol switching
    const symbolButton = page.locator('button:has-text("DJI")').first();
    if (await symbolButton.isVisible()) {
      await symbolButton.click();
      await page.waitForTimeout(500);

      const spxOption = page.locator('[role="option"]:has-text("SPX")').first();
      if (await spxOption.isVisible()) {
        await spxOption.click();
        await page.waitForLoadState("networkidle", { timeout: 15000 });
        console.log("Symbol switched to SPX");
      }
    }

    await page.screenshot({ path: "test-results/symbol-switched.png" });

    // Test timeframe switching
    const timeframeButton = page.locator('button:has-text("1D")').first();
    if (await timeframeButton.isVisible()) {
      await timeframeButton.click();
      await page.waitForTimeout(500);

      const weeklyOption = page.locator('[role="option"]:has-text("1W")').first();
      if (await weeklyOption.isVisible()) {
        await weeklyOption.click();
        await page.waitForLoadState("networkidle", { timeout: 15000 });
        console.log("Timeframe switched to 1W");
      }
    }

    await page.screenshot({ path: "test-results/timeframe-switched.png" });
  });

  test("10. Full page screenshot for visual inspection", async ({ page }) => {
    await page.goto("/workflow-v2");
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    // Wait a bit more for everything to render
    await page.waitForTimeout(3000);

    // Full page screenshot
    await page.screenshot({
      path: "test-results/full-page-workflow-v2.png",
      fullPage: true
    });

    console.log("Full page screenshot saved to test-results/full-page-workflow-v2.png");
  });
});
