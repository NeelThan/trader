import { test, expect } from "@playwright/test";

test.describe("Chart Page", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to chart page and wait for it to load
    await page.goto("/chart");
    // Wait for the chart container to be visible
    await page.waitForSelector('[class*="tv-lightweight-charts"]', {
      timeout: 30000,
    });
  });

  test("should load and display the chart page", async ({ page }) => {
    // Check that the chart canvas is rendered
    const chartCanvas = page.locator("canvas").first();
    await expect(chartCanvas).toBeVisible();

    // Check that the symbol selector is visible (shows DJI by default)
    await expect(page.locator('button:has-text("DJI")')).toBeVisible();
  });

  test("should display price summary", async ({ page }) => {
    // Check price summary section exists
    const priceSummary = page.locator('text="Symbol"').first();
    await expect(priceSummary).toBeVisible();

    // Check price is displayed
    const priceSection = page.locator('text="Price"').first();
    await expect(priceSection).toBeVisible();
  });

  test("should display chart toolbar with zoom controls", async ({ page }) => {
    // Check zoom buttons exist - use title attribute to avoid matching "+ More" buttons
    const zoomInBtn = page.locator('button[title*="Zoom In"]');
    const zoomOutBtn = page.locator('button[title*="Zoom Out"]');
    const resetBtn = page.getByRole("button", { name: "Reset View" });

    await expect(zoomInBtn).toBeVisible();
    await expect(zoomOutBtn).toBeVisible();
    await expect(resetBtn).toBeVisible();
  });

  test("should display Fibonacci controls", async ({ page }) => {
    // Check Fibonacci toggle buttons in the analysis panel
    const retracementBtn = page.getByRole("button", { name: /Retracement/i }).first();
    const extensionBtn = page.getByRole("button", { name: /Extension/i }).first();

    await expect(retracementBtn).toBeVisible();
    await expect(extensionBtn).toBeVisible();
  });
});

test.describe("Market Selection", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chart");
    await page.waitForSelector('[class*="tv-lightweight-charts"]', {
      timeout: 30000,
    });
  });

  test("should switch between markets", async ({ page }) => {
    // Open the market dropdown (currently shows DJI)
    const marketDropdown = page.locator('button:has-text("DJI")').first();
    await marketDropdown.click();

    // Click on SPX in the dropdown menu
    await page.locator('[role="menuitem"]:has-text("SPX")').click();

    // Wait for chart to update - verify the dropdown now shows SPX
    await expect(page.locator('button:has-text("SPX")')).toBeVisible({ timeout: 10000 });

    // Verify chart is still visible
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();
  });

  test("should switch between timeframes", async ({ page }) => {
    // Chart page uses inline timeframe buttons with full names (Daily, Weekly, etc.)
    // Click on Weekly to switch timeframe
    const weeklyBtn = page.getByRole("button", { name: "Weekly" });
    await weeklyBtn.click();

    // Wait for chart to update - verify the timeframe in summary shows 1W
    await expect(page.locator('p:has-text("1W")')).toBeVisible({ timeout: 10000 });

    // Verify chart canvas is still visible after timeframe change
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();
  });
});

test.describe("Data Source Selection", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chart");
    await page.waitForSelector('[class*="tv-lightweight-charts"]', {
      timeout: 30000,
    });
  });

  test("should show refresh controls for Yahoo Finance", async ({ page }) => {
    // Default is Yahoo Finance - auto-refresh button should be visible
    const autoRefreshBtn = page.getByRole("button", { name: /Auto-Refresh/ });
    await expect(autoRefreshBtn).toBeVisible({ timeout: 10000 });

    const refreshNowBtn = page.getByRole("button", { name: "Refresh Now" });
    await expect(refreshNowBtn).toBeVisible();
  });

  test("should toggle auto-refresh", async ({ page }) => {
    // Find the auto-refresh button
    const autoRefreshBtn = page.getByRole("button", { name: /Auto-Refresh/ });
    await expect(autoRefreshBtn).toBeVisible({ timeout: 10000 });

    // Click to toggle
    await autoRefreshBtn.click();

    // Chart should still be visible
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();
  });
});

test.describe("Analysis Panel", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chart");
    await page.waitForSelector('[class*="tv-lightweight-charts"]', {
      timeout: 30000,
    });
  });

  test("should display analysis panel with tabs", async ({ page }) => {
    // Check that analysis panel tabs are visible
    const fibTab = page.locator('button:has-text("Fibonacci")').first();
    const pivotTab = page.locator('button:has-text("Pivots")').first();

    await expect(fibTab).toBeVisible();
    await expect(pivotTab).toBeVisible();
  });

  test("should toggle pivot points visibility", async ({ page }) => {
    // Click on Pivots tab first
    const pivotTab = page.locator('button:has-text("Pivots")').first();
    await pivotTab.click();

    // By default pivots are hidden, so button should say "Show Pivots"
    const showPivotsBtn = page.getByRole("button", { name: /Show Pivots/ });
    await expect(showPivotsBtn).toBeVisible();

    // Click to show pivots
    await showPivotsBtn.click();

    // Now button should say "Hide Pivots"
    const hidePivotsBtn = page.getByRole("button", { name: /Hide Pivots/ });
    await expect(hidePivotsBtn).toBeVisible();
  });

  test("should toggle pivot lines visibility", async ({ page }) => {
    // Click on Pivots tab first
    const pivotTab = page.locator('button:has-text("Pivots")').first();
    await pivotTab.click();

    // By default lines are hidden, so button should say "Show Lines"
    const showLinesBtn = page.getByRole("button", { name: /Show Lines/ });
    await expect(showLinesBtn).toBeVisible();

    // Click to show lines
    await showLinesBtn.click();

    // Now button should say "Hide Lines"
    const hideLinesBtn = page.getByRole("button", { name: /Hide Lines/ });
    await expect(hideLinesBtn).toBeVisible();
  });
});
