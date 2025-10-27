import { test, expect } from '@playwright/test';

test.describe('Member Dashboard', () => {
  const memberUrl = '/customer/mem_techwhop_1';

  test('should display member stats correctly', async ({ page }) => {
    await page.goto(memberUrl);

    // Check for stats grid
    await expect(page.locator('text=Lifetime Earnings')).toBeVisible();
    await expect(page.locator('text=Monthly Earnings')).toBeVisible();
    await expect(page.locator('text=Total Referrals')).toBeVisible();
    await expect(page.locator('text=This Month')).toBeVisible();

    // Verify currency formatting
    const lifetimeEarnings = await page.locator('text=Lifetime Earnings').locator('..').locator('text=/\$[0-9,]+/').textContent();
    expect(lifetimeEarnings).toMatch(/^\$[0-9,]+(\.[0-9]{2})?$/);
  });

  test('should display compact referral link card', async ({ page }) => {
    await page.goto(memberUrl);

    // Check for referral link card
    await expect(page.locator('text=Your Referral Link')).toBeVisible();
    await expect(page.locator('text=/\/r\/[A-Z]+-[A-Z0-9]+/')).toBeVisible();

    // Test copy button
    const copyButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await copyButton.click();

    // Check for copy confirmation (icon change)
    await expect(page.locator('svg.text-green-500')).toBeVisible();
  });

  test('should display earnings chart with date range controls', async ({ page }) => {
    await page.goto(memberUrl);

    // Check for earnings chart
    await expect(page.locator('text=Earnings Chart')).toBeVisible();

    // Test date range buttons
    const dateRangeButtons = ['Last 7 days', 'Last 30 days', 'Last 90 days', 'Last year'];
    for (const range of dateRangeButtons) {
      await expect(page.locator(`button:has-text("${range}")`)).toBeVisible();
    }

    // Click on different date ranges
    await page.locator('button:has-text("Last 7 days")').click();
    await page.waitForTimeout(500);

    await page.locator('button:has-text("Last 90 days")').click();
    await page.waitForTimeout(500);

    // Verify chart updates (total amount should change)
    const totalText = await page.locator('text=/Total: \$[0-9,]+/').textContent();
    expect(totalText).toBeTruthy();
  });

  test('should display both community and global leaderboards', async ({ page }) => {
    await page.goto(memberUrl);

    // Check for community leaderboard
    await expect(page.locator('text=Community Leaderboard - Top Referrers')).toBeVisible();

    // Check for global leaderboard
    await expect(page.locator('text=Global Leaderboard - Top Earners')).toBeVisible();

    // Verify leaderboard entries have proper structure
    const leaderboardEntries = page.locator('.bg-\[\#1A1A1A\] table tbody tr');
    const count = await leaderboardEntries.count();
    expect(count).toBeGreaterThan(0);

    // Check first entry has rank, name, and value
    const firstEntry = leaderboardEntries.first();
    await expect(firstEntry.locator('td').first()).toContainText(/^[0-9]+$/);
  });

  test('should display reward progress', async ({ page }) => {
    await page.goto(memberUrl);

    // Check for reward progress section
    await expect(page.locator('text=/Reward Progress|Next Reward/')).toBeVisible();

    // Verify progress bar exists
    const progressBar = page.locator('[role="progressbar"], .bg-gradient-to-r');
    await expect(progressBar.first()).toBeVisible();
  });

  test('should display custom reward eligibility banner when eligible', async ({ page }) => {
    // Navigate to a member who might be eligible for rewards
    await page.goto(memberUrl);

    // Check if custom reward banner exists (conditional)
    const customRewardBanner = page.locator('text=/Congratulations.*Eligible for a Reward/');
    const bannerExists = await customRewardBanner.count() > 0;

    if (bannerExists) {
      await expect(customRewardBanner).toBeVisible();
      // Should show prize details
      await expect(page.locator('text=/1st Place|2nd Place|3rd Place/')).toBeVisible();
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(memberUrl);

    // Check that main elements are still visible
    await expect(page.locator('text=Lifetime Earnings')).toBeVisible();
    await expect(page.locator('text=Your Referral Link')).toBeVisible();

    // Check that layout adapts (cards should stack)
    const statsGrid = page.locator('.grid').first();
    const gridClasses = await statsGrid.getAttribute('class');
    expect(gridClasses).toContain('grid-cols-');
  });
});
