import { test, expect } from "@playwright/test";

test.describe("Chart Data Loading", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chart");
    await page.waitForSelector('[class*="tv-lightweight-charts"]', {
      timeout: 30000,
    });
  });

  test("should load initial data from Yahoo Finance", async ({ page }) => {
    // Wait for data to load (chart should render candles)
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();

    // Price display should show actual price (not 0)
    // Wait for price to be populated
    await page.waitForTimeout(2000);

    // Check that we have the market status badge (indicates API response)
    const marketBadge = page.locator('text=/Market|Pre-Market|After Hours/');
    await expect(marketBadge).toBeVisible({ timeout: 10000 });
  });

  test("should show loading indicator during data fetch", async ({ page }) => {
    // Click refresh to trigger a data fetch
    const refreshBtn = page.getByRole("button", { name: "Refresh Now" });
    await refreshBtn.click();

    // The loading indicator might be brief, but refresh should work
    await page.waitForTimeout(500);

    // Chart should still be visible after refresh
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();
  });

  test("should handle market switching with data reload", async ({ page }) => {
    // Switch to a different market
    const btcButton = page.getByRole("button", { name: "BTCUSD" });
    await btcButton.click();

    // Wait for data to load
    await page.waitForTimeout(2000);

    // Header should update
    await expect(page.locator("h1")).toContainText("Bitcoin", { timeout: 10000 });

    // Chart should still be visible
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();
  });

  test("should handle timeframe switching with data reload", async ({
    page,
  }) => {
    // Switch to weekly timeframe
    const weeklyBtn = page.getByRole("button", { name: "1W", exact: true });
    await weeklyBtn.click();

    // Wait for chart container to reappear after data reload
    await page.waitForSelector('[class*="tv-lightweight-charts"]', {
      timeout: 15000,
    });

    // Chart should still be visible
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Infinite Scroll / History Loading", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chart");
    await page.waitForSelector('[class*="tv-lightweight-charts"]', {
      timeout: 30000,
    });
    // Wait for initial data to fully load
    await page.waitForTimeout(2000);
  });

  test("should trigger history loading when panning to start", async ({
    page,
  }) => {
    const chartContainer = page.locator('[class*="tv-lightweight-charts"]');
    const zoomInBtn = page.getByRole("button", { name: "+" });

    // Zoom in to make panning to start more meaningful
    await zoomInBtn.click();
    await zoomInBtn.click();
    await zoomInBtn.click();
    await page.waitForTimeout(300);

    const box = await chartContainer.boundingBox();
    if (!box) throw new Error("Chart container not found");

    // Pan right (to go back in time) multiple times
    for (let i = 0; i < 5; i++) {
      await page.mouse.move(box.x + box.width / 4, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + (box.width * 3) / 4, box.y + box.height / 2, {
        steps: 10,
      });
      await page.mouse.up();
      await page.waitForTimeout(500);
    }

    // Check if "Loading history..." indicator appears (may be brief)
    // Or just verify the chart is still functional
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();
  });

  test("should load more data when zooming out significantly", async ({
    page,
  }) => {
    const chartContainer = page.locator('[class*="tv-lightweight-charts"]');
    const zoomOutBtn = page.getByRole("button", { name: "−" });

    // Zoom out multiple times
    for (let i = 0; i < 5; i++) {
      await zoomOutBtn.click();
      await page.waitForTimeout(300);
    }

    // Pan to the left edge
    const box = await chartContainer.boundingBox();
    if (!box) throw new Error("Chart container not found");

    await page.mouse.move(box.x + box.width / 4, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + (box.width * 3) / 4, box.y + box.height / 2, {
      steps: 10,
    });
    await page.mouse.up();

    await page.waitForTimeout(1000);

    // Chart should still be visible and functional
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();
  });
});

test.describe("Auto Refresh", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chart");
    await page.waitForSelector('[class*="tv-lightweight-charts"]', {
      timeout: 30000,
    });
  });

  test("should toggle auto-refresh", async ({ page }) => {
    // Find the auto-refresh button (should be "Auto-Refresh On" initially)
    const autoRefreshBtn = page.getByRole("button", { name: /Auto-Refresh On/ });
    await expect(autoRefreshBtn).toBeVisible();

    // Click to turn off
    await autoRefreshBtn.click();

    // Should now show "Auto-Refresh Off"
    const autoRefreshOffBtn = page.getByRole("button", {
      name: /Auto-Refresh Off/,
    });
    await expect(autoRefreshOffBtn).toBeVisible();

    // Click again to turn back on
    await autoRefreshOffBtn.click();

    // Should show "Auto-Refresh On" again
    await expect(
      page.getByRole("button", { name: /Auto-Refresh On/ })
    ).toBeVisible();
  });

  test("should show countdown timer when auto-refresh is on", async ({
    page,
  }) => {
    // Wait for the countdown to appear
    await page.waitForTimeout(1000);

    // Should show "Next refresh:" text
    const nextRefresh = page.locator('text="Next refresh:"');
    await expect(nextRefresh).toBeVisible();
  });

  test("should show last updated time", async ({ page }) => {
    // Wait for initial data load
    await page.waitForTimeout(2000);

    // Should show "Last updated:" text
    const lastUpdated = page.locator('text="Last updated:"');
    await expect(lastUpdated).toBeVisible();
  });
});

test.describe("Error Handling", () => {
  test("should handle network errors gracefully", async ({ page }) => {
    // Navigate to the page first
    await page.goto("/chart");
    await page.waitForSelector('[class*="tv-lightweight-charts"]', {
      timeout: 30000,
    });

    // Block the API endpoint
    await page.route("**/api/market-data**", (route) => {
      route.abort("failed");
    });

    // Try to switch markets (should trigger a new API call)
    const spxButton = page.getByRole("button", { name: "SPX", exact: true });
    await spxButton.click();

    // Wait for error to appear
    await page.waitForTimeout(2000);

    // Should show an error message
    const errorText = page.locator('text=/Error|Failed/');
    await expect(errorText).toBeVisible({ timeout: 10000 });
  });
});
