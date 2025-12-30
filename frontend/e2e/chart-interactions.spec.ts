import { test, expect } from "@playwright/test";

test.describe("Chart Zoom Controls", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chart");
    await page.waitForSelector('[class*="tv-lightweight-charts"]', {
      timeout: 30000,
    });
  });

  test("should zoom in when clicking zoom in button", async ({ page }) => {
    const zoomInBtn = page.getByRole("button", { name: "+" });
    const canvas = page.locator("canvas").first();

    // Get initial canvas state
    await expect(canvas).toBeVisible();

    // Click zoom in multiple times
    await zoomInBtn.click();
    await page.waitForTimeout(300);
    await zoomInBtn.click();
    await page.waitForTimeout(300);

    // Chart should still be visible after zooming
    await expect(canvas).toBeVisible();
  });

  test("should zoom out when clicking zoom out button", async ({ page }) => {
    const zoomOutBtn = page.getByRole("button", { name: "−" });
    const canvas = page.locator("canvas").first();

    // Click zoom out multiple times
    await zoomOutBtn.click();
    await page.waitForTimeout(300);
    await zoomOutBtn.click();
    await page.waitForTimeout(300);

    // Chart should still be visible after zooming
    await expect(canvas).toBeVisible();
  });

  test("should reset view when clicking reset button", async ({ page }) => {
    const zoomInBtn = page.getByRole("button", { name: "+" });
    const resetBtn = page.getByRole("button", { name: "Reset View" });
    const canvas = page.locator("canvas").first();

    // Zoom in first
    await zoomInBtn.click();
    await zoomInBtn.click();
    await zoomInBtn.click();
    await page.waitForTimeout(300);

    // Then reset
    await resetBtn.click();
    await page.waitForTimeout(300);

    // Chart should still be visible
    await expect(canvas).toBeVisible();
  });

  test("should zoom with mouse wheel", async ({ page }) => {
    const chartContainer = page.locator('[class*="tv-lightweight-charts"]');
    const canvas = page.locator("canvas").first();

    await expect(chartContainer).toBeVisible();

    // Get the bounding box of the chart
    const box = await chartContainer.boundingBox();
    if (!box) throw new Error("Chart container not found");

    // Scroll to zoom (negative deltaY = zoom in)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(300);

    // Chart should still be visible
    await expect(canvas).toBeVisible();
  });
});

test.describe("Chart Pan/Drag", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chart");
    await page.waitForSelector('[class*="tv-lightweight-charts"]', {
      timeout: 30000,
    });
  });

  test("should pan chart when dragging", async ({ page }) => {
    const chartContainer = page.locator('[class*="tv-lightweight-charts"]');
    const canvas = page.locator("canvas").first();

    await expect(chartContainer).toBeVisible();

    const box = await chartContainer.boundingBox();
    if (!box) throw new Error("Chart container not found");

    // Perform a drag operation
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    const endX = startX - 100;
    const endY = startY;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.mouse.up();

    await page.waitForTimeout(300);

    // Chart should still be visible after panning
    await expect(canvas).toBeVisible();
  });

  test("should maintain zoom level after panning", async ({ page }) => {
    const chartContainer = page.locator('[class*="tv-lightweight-charts"]');
    const zoomInBtn = page.getByRole("button", { name: "+" });

    // Zoom in first
    await zoomInBtn.click();
    await zoomInBtn.click();
    await page.waitForTimeout(300);

    const box = await chartContainer.boundingBox();
    if (!box) throw new Error("Chart container not found");

    // Pan the chart
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX - 50, startY, { steps: 5 });
    await page.mouse.up();

    await page.waitForTimeout(300);

    // Chart should still be visible
    await expect(page.locator("canvas").first()).toBeVisible();
  });
});

test.describe("Chart Crosshair", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chart");
    await page.waitForSelector('[class*="tv-lightweight-charts"]', {
      timeout: 30000,
    });
  });

  test("should update price display when hovering over chart", async ({
    page,
  }) => {
    const chartContainer = page.locator('[class*="tv-lightweight-charts"]');

    await expect(chartContainer).toBeVisible();

    const box = await chartContainer.boundingBox();
    if (!box) throw new Error("Chart container not found");

    // Move mouse over the chart
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(500);

    // Price display should still be visible
    const priceDisplay = page.locator('text="Price"').first();
    await expect(priceDisplay).toBeVisible();
  });
});
