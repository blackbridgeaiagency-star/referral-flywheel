import { test, expect } from '@playwright/test';

test.describe('Creator Dashboard', () => {
  const creatorUrl = '/seller-product/prod_techwhop_test';

  test('should display revenue metrics', async ({ page }) => {
    await page.goto(creatorUrl);

    // Check header
    await expect(page.locator('h1:has-text("TechWhop Dashboard")')).toBeVisible();

    // Check revenue metrics
    await expect(page.locator('text=Total Revenue')).toBeVisible();
    await expect(page.locator('text=Monthly Revenue')).toBeVisible();
    await expect(page.locator('text=Monthly Growth')).toBeVisible();
    await expect(page.locator('text=Revenue from Top 10')).toBeVisible();

    // Verify currency formatting
    const revenue = await page.locator('text=Total Revenue').locator('..').locator('text=/\$[0-9,]+/').first().textContent();
    expect(revenue).toMatch(/^\$[0-9,]+(\.[0-9]{2})?$/);
  });

  test('should display community stats grid', async ({ page }) => {
    await page.goto(creatorUrl);

    // Check community stats
    await expect(page.locator('text=Total Members')).toBeVisible();
    await expect(page.locator('text=Active Members')).toBeVisible();
    await expect(page.locator('text=Total Clicks')).toBeVisible();
    await expect(page.locator('text=Conversion Rate')).toBeVisible();
  });

  test('should display top performers table', async ({ page }) => {
    await page.goto(creatorUrl);

    // Check for top performers section
    await expect(page.locator('h2:has-text("Top Performers by Referrals")')).toBeVisible();

    // Verify table has data
    const performerRows = page.locator('table tbody tr');
    const rowCount = await performerRows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Check table structure
    const firstRow = performerRows.first();
    await expect(firstRow.locator('td').nth(0)).toContainText(/^[0-9]+$/); // Rank
    await expect(firstRow.locator('td').nth(1)).toBeVisible(); // Name
    await expect(firstRow.locator('td').nth(2)).toContainText(/^[0-9]+$/); // Value
  });

  test('should display reward management form', async ({ page }) => {
    await page.goto(creatorUrl);

    // Check for reward management section
    await expect(page.locator('h2:has-text("Reward Management")')).toBeVisible();

    // Check tier fields exist
    await expect(page.locator('label:has-text("Tier 1")')).toBeVisible();
    await expect(page.locator('label:has-text("Tier 2")')).toBeVisible();
    await expect(page.locator('label:has-text("Tier 3")')).toBeVisible();
    await expect(page.locator('label:has-text("Tier 4")')).toBeVisible();

    // Check save button
    await expect(page.locator('button:has-text("Save Reward Settings")')).toBeVisible();
  });

  test('should display custom competition rewards form', async ({ page }) => {
    await page.goto(creatorUrl);

    // Check for custom rewards section
    await expect(page.locator('text=Custom Competition Rewards')).toBeVisible();

    // Check enable toggle
    await expect(page.locator('label:has-text("Enable Custom Rewards")')).toBeVisible();

    // If enabled, check for competition settings
    const enableSwitch = page.locator('#custom-rewards-enabled');
    const isEnabled = await enableSwitch.isChecked();

    if (isEnabled) {
      // Check competition period dropdown
      await expect(page.locator('text=Competition Period')).toBeVisible();

      // Check individual prize fields
      await expect(page.locator('label:has-text("1st Place Prize")')).toBeVisible();
      await expect(page.locator('label:has-text("2nd Place Prize")')).toBeVisible();
      await expect(page.locator('label:has-text("3rd Place Prize")')).toBeVisible();
    }
  });

  test('should save reward settings', async ({ page }) => {
    await page.goto(creatorUrl);

    // Find a reward field and modify it
    const tier1Input = page.locator('input').filter({ hasText: /Tier 1/ }).first();
    await tier1Input.fill('2 months free');

    // Click save button
    await page.locator('button:has-text("Save Reward Settings")').click();

    // Check for success message
    await expect(page.locator('text=/Settings saved|Success/')).toBeVisible({ timeout: 5000 });
  });

  test('should toggle custom rewards', async ({ page }) => {
    await page.goto(creatorUrl);

    // Find the custom rewards toggle
    const enableSwitch = page.locator('#custom-rewards-enabled');
    const initialState = await enableSwitch.isChecked();

    // Toggle the switch
    await page.locator('label[for="custom-rewards-enabled"]').click();

    // Verify state changed
    const newState = await enableSwitch.isChecked();
    expect(newState).toBe(!initialState);

    // If now enabled, prize fields should be visible
    if (newState) {
      await expect(page.locator('text=1st Place Prize')).toBeVisible();
    }
  });

  test('should be responsive on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(creatorUrl);

    // Check that main elements are visible
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('text=Total Revenue')).toBeVisible();

    // Verify layout adjusts
    const metricsGrid = page.locator('.grid').filter({ has: page.locator('text=Total Revenue') });
    const gridClasses = await metricsGrid.getAttribute('class');
    expect(gridClasses).toContain('md:grid-cols');
  });
});
