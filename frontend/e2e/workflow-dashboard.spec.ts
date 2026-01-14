import { test, expect } from '@playwright/test';

test.describe('Workflow Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/workflow');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should display empty state when no workflows exist', async ({ page }) => {
    await page.goto('/workflow');

    // Wait for hydration
    await page.waitForSelector('h2:has-text("Trading Workflows")', { timeout: 10000 });

    // Check for empty state
    await expect(page.locator('text=No workflows found')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Workflow' }).first()).toBeVisible();
  });

  test('should create a new workflow when clicking New Workflow button', async ({ page }) => {
    await page.goto('/workflow');

    // Wait for dashboard to load
    await page.waitForSelector('h2:has-text("Trading Workflows")', { timeout: 10000 });

    // Click the New Workflow button (first one in header area)
    await page.getByRole('button', { name: 'New Workflow' }).first().click();

    // Should navigate to workflow stepper - wait for the card title
    await expect(page.locator('[data-slot="card-title"]:has-text("Market & Timeframe Selection")')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate back to dashboard from workflow stepper', async ({ page }) => {
    await page.goto('/workflow');

    // Create a workflow
    await page.waitForSelector('h2:has-text("Trading Workflows")', { timeout: 10000 });
    await page.getByRole('button', { name: 'New Workflow' }).first().click();

    // Wait for stepper to load
    await expect(page.locator('[data-slot="card-title"]:has-text("Market & Timeframe Selection")')).toBeVisible({ timeout: 5000 });

    // Click back to all workflows - wait for button to be ready
    const allWorkflowsBtn = page.locator('button:has-text("All Workflows")');
    await expect(allWorkflowsBtn).toBeVisible({ timeout: 5000 });
    await allWorkflowsBtn.click();

    // Should show dashboard again
    await expect(page.locator('h2:has-text("Trading Workflows")')).toBeVisible({ timeout: 5000 });
  });

  test('should display workflow card after creating a workflow', async ({ page }) => {
    await page.goto('/workflow');

    // Create a workflow
    await page.waitForSelector('h2:has-text("Trading Workflows")', { timeout: 10000 });
    await page.getByRole('button', { name: 'New Workflow' }).first().click();

    // Go back to dashboard
    await page.waitForSelector('[data-slot="card-title"]:has-text("Market & Timeframe Selection")', { timeout: 5000 });
    const allWorkflowsBtn = page.locator('button:has-text("All Workflows")');
    await expect(allWorkflowsBtn).toBeVisible({ timeout: 5000 });
    await allWorkflowsBtn.click();

    // Should show workflow card with symbol
    await expect(page.locator('.font-mono.font-semibold:has-text("SPX")')).toBeVisible({ timeout: 5000 });
  });

  test('should filter workflows by status', async ({ page }) => {
    await page.goto('/workflow');

    // Create a workflow
    await page.waitForSelector('h2:has-text("Trading Workflows")', { timeout: 10000 });
    await page.getByRole('button', { name: 'New Workflow' }).first().click();
    await page.waitForSelector('[data-slot="card-title"]:has-text("Market & Timeframe Selection")', { timeout: 5000 });
    const allWorkflowsBtn1 = page.locator('button:has-text("All Workflows")');
    await expect(allWorkflowsBtn1).toBeVisible({ timeout: 5000 });
    await allWorkflowsBtn1.click();

    // Wait for dashboard
    await page.waitForSelector('h2:has-text("Trading Workflows")', { timeout: 5000 });

    // Check pending filter - look for the filter button specifically
    await page.getByRole('button', { name: /Pending/ }).click();
    await expect(page.locator('.font-mono.font-semibold:has-text("SPX")')).toBeVisible();

    // Check completed filter (should be empty)
    await page.getByRole('button', { name: /Completed/ }).click();
    await expect(page.locator('text=No workflows found')).toBeVisible();

    // Check all filter
    await page.getByRole('button', { name: /^All/ }).click();
    await expect(page.locator('.font-mono.font-semibold:has-text("SPX")')).toBeVisible();
  });

  test('should delete a workflow', async ({ page }) => {
    await page.goto('/workflow');

    // Create a workflow
    await page.waitForSelector('h2:has-text("Trading Workflows")', { timeout: 10000 });
    await page.getByRole('button', { name: 'New Workflow' }).first().click();
    await page.waitForSelector('[data-slot="card-title"]:has-text("Market & Timeframe Selection")', { timeout: 5000 });
    const allWorkflowsBtn2 = page.locator('button:has-text("All Workflows")');
    await expect(allWorkflowsBtn2).toBeVisible({ timeout: 5000 });
    await allWorkflowsBtn2.click();

    // Wait for dashboard and workflow card
    await page.waitForSelector('.font-mono.font-semibold:has-text("SPX")', { timeout: 5000 });

    // Click delete button (trash icon)
    await page.click('[title="Delete"]');

    // Confirm deletion in dialog
    await page.getByRole('button', { name: 'Delete', exact: true }).click();

    // Should show empty state again
    await expect(page.locator('text=No workflows found')).toBeVisible({ timeout: 5000 });
  });

  test('should show workflow header with correct title', async ({ page }) => {
    await page.goto('/workflow');

    // Dashboard view - header should show Trading Workflows
    await page.waitForSelector('h2:has-text("Trading Workflows")', { timeout: 10000 });
    await expect(page.locator('h1:has-text("Trading Workflows")')).toBeVisible();

    // Create workflow and check stepper title changes
    await page.getByRole('button', { name: 'New Workflow' }).first().click();
    await page.waitForSelector('[data-slot="card-title"]:has-text("Market & Timeframe Selection")', { timeout: 5000 });

    // Header should now show workflow name (contains the symbol and date)
    await expect(page.locator('h1')).toContainText(/SPX|Pending/);
  });

  test('should have link to chart page', async ({ page }) => {
    await page.goto('/workflow');
    await page.waitForSelector('h2:has-text("Trading Workflows")', { timeout: 10000 });

    // Check for Open Chart link
    const chartLink = page.getByRole('link', { name: /Open Chart/i });
    await expect(chartLink).toBeVisible();
    await expect(chartLink).toHaveAttribute('href', '/chart');
  });
});
