import { test, expect } from "@playwright/test";

/**
 * Playwright E2E Tests for Confluence Scoring in Validation
 *
 * Tests the 7th validation check (Confluence Score) which was added
 * to enforce real confluence calculation instead of hardcoded values.
 */

test.describe("Validation API - Confluence Score", () => {
  test("should return 7 validation checks including Confluence Score", async ({
    request,
  }) => {
    // Call the validation API directly
    const response = await request.post("/api/trader/workflow/validate", {
      data: {
        symbol: "DJI",
        higher_timeframe: "1D",
        lower_timeframe: "4H",
        direction: "long",
        atr_period: 14,
      },
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();

    // Should have 7 checks now (was 6 before)
    expect(result.total_count).toBe(7);
    expect(result.checks).toHaveLength(7);

    // Find the Confluence Score check
    const confluenceCheck = result.checks.find(
      (c: { name: string }) => c.name === "Confluence Score"
    );
    expect(confluenceCheck).toBeDefined();
    expect(confluenceCheck.name).toBe("Confluence Score");
    expect(typeof confluenceCheck.passed).toBe("boolean");
    expect(typeof confluenceCheck.explanation).toBe("string");
  });

  test("should return confluence_score field in response", async ({
    request,
  }) => {
    const response = await request.post("/api/trader/workflow/validate", {
      data: {
        symbol: "DJI",
        higher_timeframe: "1D",
        lower_timeframe: "4H",
        direction: "long",
        atr_period: 14,
      },
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();

    // Should have confluence_score field
    expect(result.confluence_score).toBeDefined();
    expect(typeof result.confluence_score).toBe("number");
    expect(result.confluence_score).toBeGreaterThanOrEqual(1); // Base score is always 1
  });

  test("should return confluence_breakdown field in response", async ({
    request,
  }) => {
    const response = await request.post("/api/trader/workflow/validate", {
      data: {
        symbol: "DJI",
        higher_timeframe: "1D",
        lower_timeframe: "4H",
        direction: "long",
        atr_period: 14,
      },
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();

    // Should have confluence_breakdown field with expected structure
    expect(result.confluence_breakdown).toBeDefined();
    expect(result.confluence_breakdown.base_fib_level).toBe(1);
    expect(
      typeof result.confluence_breakdown.same_tf_confluence
    ).toBe("number");
    expect(
      typeof result.confluence_breakdown.higher_tf_confluence
    ).toBe("number");
    expect(
      typeof result.confluence_breakdown.cross_tool_confluence
    ).toBe("number");
    expect(typeof result.confluence_breakdown.previous_pivot).toBe("number");
    expect(
      typeof result.confluence_breakdown.psychological_level
    ).toBe("number");
  });

  test("should return trade_category field in response", async ({
    request,
  }) => {
    const response = await request.post("/api/trader/workflow/validate", {
      data: {
        symbol: "DJI",
        higher_timeframe: "1D",
        lower_timeframe: "4H",
        direction: "long",
        atr_period: 14,
      },
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();

    // Should have trade_category field with valid values
    expect(result.trade_category).toBeDefined();
    expect(["with_trend", "counter_trend", "reversal_attempt"]).toContain(
      result.trade_category
    );
  });

  test("should include confluence check in pass/fail calculation", async ({
    request,
  }) => {
    const response = await request.post("/api/trader/workflow/validate", {
      data: {
        symbol: "DJI",
        higher_timeframe: "1D",
        lower_timeframe: "4H",
        direction: "long",
        atr_period: 14,
      },
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();

    // passed_count should be calculated from all 7 checks
    const passedChecks = result.checks.filter(
      (c: { passed: boolean }) => c.passed
    ).length;
    expect(result.passed_count).toBe(passedChecks);

    // pass_percentage should be based on 7 checks
    const expectedPercentage = (passedChecks / 7) * 100;
    expect(result.pass_percentage).toBeCloseTo(expectedPercentage, 1);
  });
});

test.describe("Validation API - Confluence Requirements", () => {
  test("should require higher confluence for counter-trend trades", async ({
    request,
  }) => {
    // Test a short trade when higher TF might be bullish (counter-trend)
    const response = await request.post("/api/trader/workflow/validate", {
      data: {
        symbol: "DJI",
        higher_timeframe: "1D",
        lower_timeframe: "4H",
        direction: "short", // Against potential bullish higher TF
        atr_period: 14,
      },
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();

    // Find the Confluence Score check
    const confluenceCheck = result.checks.find(
      (c: { name: string }) => c.name === "Confluence Score"
    );
    expect(confluenceCheck).toBeDefined();

    // The explanation should mention the threshold
    expect(confluenceCheck.explanation).toMatch(/threshold|score/i);
    expect(confluenceCheck.details).toMatch(/min required/i);
  });
});

test.describe("Workflow V2 UI - Confluence Display", () => {
  test.skip("should display Confluence Score in validation checklist", async ({
    page,
  }) => {
    // Navigate to workflow-v2 and trigger validation
    await page.goto("/workflow-v2");
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    // This test requires navigating through the workflow to validation
    // which depends on the specific UI flow - skipped for now
    // TODO: Implement when we have a clear path to validation panel

    // The Confluence Score check should be visible in the checklist
    const confluenceCheck = page.locator('text="Confluence Score"');
    await expect(confluenceCheck).toBeVisible({ timeout: 10000 });
  });

  test.skip("should display confluence score card when available", async ({
    page,
  }) => {
    await page.goto("/workflow-v2");
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    // TODO: Implement when we have a clear path to validation panel
    // The confluence score card should show breakdown

    const confluenceCard = page.locator('text="Confluence Score"').first();
    await expect(confluenceCard).toBeVisible({ timeout: 10000 });
  });
});
