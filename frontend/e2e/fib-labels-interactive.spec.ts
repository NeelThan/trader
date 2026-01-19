import { test, expect } from "@playwright/test";

/**
 * Interactive test for Fib label hover tooltips
 * Run with: npx playwright test fib-labels-interactive.spec.ts --headed
 */
test.describe("Fib Labels Interactive Test", () => {
  test("Hover over Fib markers to see tooltip with price", async ({ page }) => {
    await page.goto("/workflow-v2");
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    // Wait for chart to render
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // Wait for Fib levels to load
    await page.waitForTimeout(3000);

    // Take initial screenshot
    await page.screenshot({ path: "test-results/fib-markers-initial.png" });

    // Find the Fib marker containers (parent div with pointer-events-auto)
    const markers = page.locator('div[class*="pointer-events-auto"][class*="group"]');
    const markerCount = await markers.count();
    console.log(`Found ${markerCount} Fib markers`);

    if (markerCount > 0) {
      // Hover over the first marker using force to bypass interception check
      const firstMarker = markers.first();
      await firstMarker.hover({ force: true });
      await page.waitForTimeout(500);

      // Take screenshot showing tooltip
      await page.screenshot({ path: "test-results/fib-marker-hover.png" });

      // Check if tooltip appeared
      const tooltip = page.locator('text=/SUPPORT|RESISTANCE/');
      const tooltipVisible = await tooltip.isVisible().catch(() => false);
      console.log(`Tooltip visible: ${tooltipVisible}`);

      if (tooltipVisible) {
        const tooltipText = await tooltip.textContent();
        console.log(`Tooltip content: ${tooltipText}`);
      }

      // Hover over a few more markers
      for (let i = 1; i < Math.min(5, markerCount); i++) {
        const marker = markers.nth(i);
        await marker.hover({ force: true });
        await page.waitForTimeout(300);
      }

      // Final screenshot
      await page.screenshot({ path: "test-results/fib-markers-final.png" });
    }

    // Pan the chart to test marker position updates
    console.log("Testing chart pan...");
    const canvasBox = await canvas.boundingBox();
    if (canvasBox) {
      await page.mouse.move(canvasBox.x + 400, canvasBox.y + 300);
      await page.mouse.down();
      await page.mouse.move(canvasBox.x + 200, canvasBox.y + 300, { steps: 10 });
      await page.mouse.up();
    }
    await page.waitForTimeout(500);

    await page.screenshot({ path: "test-results/fib-markers-after-pan.png" });

    console.log("Test complete - check screenshots in test-results/");
  });

  test.skip("Manual inspection - pauses for 60 seconds", async ({ page }) => {
    await page.goto("/workflow-v2");
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    // Wait for chart to render
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    console.log("Page loaded - you have 60 seconds to inspect the Fib markers");
    console.log("Hover over the colored dots to see tooltips with price info");

    // Pause for manual inspection
    await page.waitForTimeout(60000);
  });
});
