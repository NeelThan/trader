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
    // Check page title/header is visible
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("h1")).toContainText("Dow Jones");

    // Check that the chart canvas is rendered
    const chartCanvas = page.locator("canvas").first();
    await expect(chartCanvas).toBeVisible();
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
    // Check zoom buttons exist
    const zoomInBtn = page.getByRole("button", { name: "+" });
    const zoomOutBtn = page.getByRole("button", { name: "−" });
    const resetBtn = page.getByRole("button", { name: "Reset View" });

    await expect(zoomInBtn).toBeVisible();
    await expect(zoomOutBtn).toBeVisible();
    await expect(resetBtn).toBeVisible();
  });

  test("should display Fibonacci controls", async ({ page }) => {
    // Check Fibonacci toggle buttons
    const retracementBtn = page.getByRole("button", { name: "Retracement" });
    const extensionBtn = page.getByRole("button", { name: "Extension" });

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
    // Click on SPX market
    const spxButton = page.getByRole("button", { name: "SPX", exact: true });
    await spxButton.click();

    // Wait for chart to update and verify header changed
    await expect(page.locator("h1")).toContainText("S&P 500", { timeout: 10000 });
  });

  test("should switch between timeframes", async ({ page }) => {
    // Click on 1W timeframe
    const weeklyButton = page.getByRole("button", { name: "1W", exact: true });
    await weeklyButton.click();

    // Wait for chart to reload and verify the button is still visible and clickable
    await page.waitForTimeout(1000);
    await expect(weeklyButton).toBeVisible();

    // Verify chart canvas is still visible after timeframe change
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();
  });
});

test.describe("Chart Type Selection", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chart");
    await page.waitForSelector('[class*="tv-lightweight-charts"]', {
      timeout: 30000,
    });
  });

  test("should switch to Heikin Ashi chart", async ({ page }) => {
    const heikinAshiBtn = page.getByRole("button", { name: "Heikin Ashi" });
    await heikinAshiBtn.click();

    // Button should be active after click
    await expect(heikinAshiBtn).toBeVisible();
  });

  test("should switch to Bar chart", async ({ page }) => {
    const barBtn = page.getByRole("button", { name: "Bar", exact: true });
    await barBtn.click();

    // Button should be active after click
    await expect(barBtn).toBeVisible();
  });
});

test.describe("Data Source Selection", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chart");
    await page.waitForSelector('[class*="tv-lightweight-charts"]', {
      timeout: 30000,
    });
  });

  test("should switch to simulated data", async ({ page }) => {
    const simulatedBtn = page.getByRole("button", { name: "Simulated" });
    await simulatedBtn.click();

    // Refresh status should disappear when using simulated data
    await expect(page.locator('text="Auto-Refresh"')).not.toBeVisible({
      timeout: 5000,
    });
  });

  test("should show refresh controls for Yahoo Finance", async ({ page }) => {
    // Default is Yahoo Finance
    const autoRefreshBtn = page.getByRole("button", { name: /Auto-Refresh/ });
    await expect(autoRefreshBtn).toBeVisible();

    const refreshNowBtn = page.getByRole("button", { name: "Refresh Now" });
    await expect(refreshNowBtn).toBeVisible();
  });
});

test.describe("Pivot Points", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chart");
    await page.waitForSelector('[class*="tv-lightweight-charts"]', {
      timeout: 30000,
    });
  });

  test("should toggle pivot points visibility", async ({ page }) => {
    const hidePivotsBtn = page.getByRole("button", { name: "Hide Pivots" });
    await expect(hidePivotsBtn).toBeVisible();

    await hidePivotsBtn.click();

    const showPivotsBtn = page.getByRole("button", { name: "Show Pivots" });
    await expect(showPivotsBtn).toBeVisible();
  });

  test("should toggle pivot lines visibility", async ({ page }) => {
    const hideLinesBtn = page.getByRole("button", { name: "Hide Lines" });
    await expect(hideLinesBtn).toBeVisible();

    await hideLinesBtn.click();

    const showLinesBtn = page.getByRole("button", { name: "Show Lines" });
    await expect(showLinesBtn).toBeVisible();
  });

  test("should switch to manual pivot mode", async ({ page }) => {
    const manualBtn = page.getByRole("button", { name: "Manual Override" });
    await manualBtn.click();

    // Should show input fields for manual high/low
    const highInput = page.locator('input[id="manualHigh"]');
    const lowInput = page.locator('input[id="manualLow"]');

    await expect(highInput).toBeVisible();
    await expect(lowInput).toBeVisible();
  });
});
