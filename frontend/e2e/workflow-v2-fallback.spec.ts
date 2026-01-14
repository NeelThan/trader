import { test, expect } from "@playwright/test";

test.describe("Workflow V2 - Backend Unavailable Fallback", () => {
  test.beforeEach(async ({ page }) => {
    // Block all backend API calls to simulate backend being unavailable
    await page.route("**/api/trader/**", (route) => {
      route.abort("connectionrefused");
    });
  });

  test("should load without infinite loops when backend is unavailable", async ({
    page,
  }) => {
    // Navigate to workflow-v2 page
    await page.goto("/workflow-v2");

    // Wait for the page to stabilize (no infinite loops)
    // If there's an infinite loop, this will timeout
    await page.waitForLoadState("networkidle", { timeout: 10000 });

    // Verify the page title/header is visible
    await expect(page.locator('text="Workflow"')).toBeVisible({ timeout: 5000 });
  });

  test("should show chart with fallback data when backend is unavailable", async ({
    page,
  }) => {
    await page.goto("/workflow-v2");

    // Wait for the page to stabilize
    await page.waitForLoadState("networkidle", { timeout: 10000 });

    // The chart should render with simulated data (canvas should be visible)
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 10000 });
  });

  test("should not show 'Some data unavailable' error with fallback", async ({
    page,
  }) => {
    await page.goto("/workflow-v2");

    // Wait for the page to stabilize
    await page.waitForLoadState("networkidle", { timeout: 10000 });

    // The "Some data unavailable" error should NOT be visible
    // because we're using fallback data now
    const errorBanner = page.locator('text="Some data unavailable"');
    await expect(errorBanner).not.toBeVisible({ timeout: 5000 });
  });

  test("should show trend alignment data from fallback", async ({ page }) => {
    await page.goto("/workflow-v2");

    // Wait for the page to stabilize
    await page.waitForLoadState("networkidle", { timeout: 10000 });

    // The trend indicator should be visible (shows bullish/bearish count)
    // This indicates the fallback trend data is being used
    const trendIndicator = page.locator('[title*="trend"]').first();

    // Alternative: check for the stats display
    const statsText = page.locator('text=/\\d+ active \\/ \\d+ opportunities/');
    await expect(statsText).toBeVisible({ timeout: 10000 });
  });

  test("should handle symbol change with fallback data", async ({ page }) => {
    await page.goto("/workflow-v2");

    // Wait for initial load
    await page.waitForLoadState("networkidle", { timeout: 10000 });

    // Find and click the symbol selector
    const symbolSelect = page.locator('button:has-text("DJI")').first();
    await symbolSelect.click();

    // Select a different symbol
    const spxOption = page.locator('div[role="option"]:has-text("SPX")');
    await spxOption.click();

    // Wait for the page to stabilize after symbol change
    await page.waitForLoadState("networkidle", { timeout: 10000 });

    // Page should still be stable (no infinite loops)
    await expect(page.locator('text="Workflow"')).toBeVisible();

    // Chart should still be visible
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();
  });

  test("should handle timeframe change with fallback data", async ({ page }) => {
    await page.goto("/workflow-v2");

    // Wait for initial load
    await page.waitForLoadState("networkidle", { timeout: 10000 });

    // Find and click the timeframe selector
    const timeframeSelect = page.locator('button:has-text("1D")').first();
    await timeframeSelect.click();

    // Select a different timeframe
    const weeklyOption = page.locator('div[role="option"]:has-text("1W")');
    await weeklyOption.click();

    // Wait for the page to stabilize after timeframe change
    await page.waitForLoadState("networkidle", { timeout: 10000 });

    // Page should still be stable
    await expect(page.locator('text="Workflow"')).toBeVisible();
  });

  test("should display discovery panel without errors", async ({ page }) => {
    await page.goto("/workflow-v2");

    // Wait for initial load
    await page.waitForLoadState("networkidle", { timeout: 10000 });

    // The discovery panel should show either:
    // - "No opportunities found" (normal when no signals)
    // - Or actual opportunities from fallback data
    // But NOT error messages

    // One of these should be visible (indicating the panel rendered correctly)
    // Use .first() to avoid strict mode violation when multiple elements match
    const panelContent = page.locator('text=/No opportunities found|Waiting for trend alignment|Trade Opportunities/').first();
    await expect(panelContent).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Workflow V2 - Normal Operation", () => {
  test("should load and render correctly", async ({ page }) => {
    await page.goto("/workflow-v2");

    // Wait for the page to load
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    // Verify main elements are visible
    await expect(page.locator('text="Workflow"')).toBeVisible();

    // Chart should render
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });
  });

  test("should not crash on rapid interactions", async ({ page }) => {
    await page.goto("/workflow-v2");
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    // Rapidly toggle some UI elements
    for (let i = 0; i < 3; i++) {
      // Toggle swing markers if button exists
      const swingBtn = page.locator('button:has-text("Swing")').first();
      if (await swingBtn.isVisible()) {
        await swingBtn.click();
        await page.waitForTimeout(100);
      }

      // Toggle Fib if button exists
      const fibBtn = page.locator('button:has-text("Fib")').first();
      if (await fibBtn.isVisible()) {
        await fibBtn.click();
        await page.waitForTimeout(100);
      }
    }

    // Page should still be functional
    await expect(page.locator('text="Workflow"')).toBeVisible();
  });
});
