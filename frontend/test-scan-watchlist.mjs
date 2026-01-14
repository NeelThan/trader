import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  const consoleMessages = [];

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleMessages.push(`[ERROR] ${msg.text()}`);
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    errors.push(error.message);
  });

  console.log('Navigating to workflow-v2...');

  try {
    await page.goto('http://localhost:3000/workflow-v2', {
      timeout: 30000,
      waitUntil: 'networkidle'
    });

    console.log('Page loaded, waiting for initial render...');
    await page.waitForTimeout(2000);

    // Take screenshot of initial state
    await page.screenshot({ path: 'scan-1-initial.png' });
    console.log('Screenshot 1: Initial state (Single Symbol mode)');

    // Click on "Scan Watchlist" button
    console.log('\nClicking "Scan Watchlist" button...');
    const scanButton = page.locator('button:has-text("Scan")');

    if (await scanButton.count() > 0) {
      await scanButton.click();
      console.log('Clicked Scan Watchlist button');

      // Wait for scan to complete
      await page.waitForTimeout(3000);

      // Take screenshot after clicking
      await page.screenshot({ path: 'scan-2-after-click.png' });
      console.log('Screenshot 2: After clicking Scan Watchlist');

      // Check for loading state
      const loadingText = page.locator('text=Scanning');
      if (await loadingText.count() > 0) {
        console.log('Loading state detected, waiting...');
        await page.waitForTimeout(5000);
      }

      // Take final screenshot
      await page.screenshot({ path: 'scan-3-results.png' });
      console.log('Screenshot 3: Scan results');

      // Check what's displayed
      const opportunitiesText = await page.locator('text=/\\d+ opportunities?/i').first().textContent().catch(() => null);
      if (opportunitiesText) {
        console.log(`\nFound: ${opportunitiesText}`);
      }

      const noOpportunities = await page.locator('text=/no opportunities/i').count();
      if (noOpportunities > 0) {
        console.log('\nNo opportunities found in scan');
      }

      // Check for symbols scanned
      const symbolsScanned = await page.locator('text=/\\d+ symbols?/i').first().textContent().catch(() => null);
      if (symbolsScanned) {
        console.log(`Symbols scanned: ${symbolsScanned}`);
      }

    } else {
      console.log('ERROR: Scan Watchlist button not found!');

      // Debug: list all buttons
      const buttons = await page.locator('button').all();
      console.log(`Found ${buttons.length} buttons:`);
      for (const btn of buttons.slice(0, 10)) {
        const text = await btn.textContent().catch(() => 'N/A');
        console.log(`  - ${text.trim().substring(0, 50)}`);
      }
    }

    console.log('\n=== CONSOLE ERRORS ===');
    if (consoleMessages.length > 0) {
      consoleMessages.forEach(msg => console.log(msg));
    } else {
      console.log('None');
    }

    console.log('\n=== PAGE ERRORS ===');
    if (errors.length > 0) {
      errors.forEach(err => console.log(err));
    } else {
      console.log('None');
    }

  } catch (e) {
    console.log('Error:', e.message);
    await page.screenshot({ path: 'scan-error.png' });
  }

  // Keep browser open for manual inspection
  console.log('\nBrowser will stay open for 10 seconds...');
  await page.waitForTimeout(10000);

  await browser.close();
})();
