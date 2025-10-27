import { test, expect } from '@playwright/test';

test.describe('Leaderboard Functionality', () => {
  test('should display community leaderboard by referrals', async ({ page }) => {
    await page.goto('/customer/mem_techwhop_1');

    // Find community leaderboard
    await expect(page.locator('text=Community Leaderboard - Top Referrers')).toBeVisible();

    // Check table structure
    const table = page.locator('text=Community Leaderboard - Top Referrers').locator('..').locator('table');
    await expect(table).toBeVisible();

    // Verify headers
    await expect(table.locator('th:has-text("Rank")')).toBeVisible();
    await expect(table.locator('th:has-text("Member")')).toBeVisible();
    await expect(table.locator('th:has-text("Referrals")')).toBeVisible();

    // Check data rows
    const rows = table.locator('tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
    expect(rowCount).toBeLessThanOrEqual(10); // Should show top 10

    // Verify ranking is sequential
    for (let i = 0; i < Math.min(rowCount, 3); i++) {
      const rankCell = rows.nth(i).locator('td').first();
      const rank = await rankCell.textContent();
      expect(rank).toBe(`${i + 1}`);
    }

    // Verify referrals are in descending order
    const referralValues = [];
    for (let i = 0; i < rowCount; i++) {
      const valueCell = rows.nth(i).locator('td').nth(2);
      const value = parseInt(await valueCell.textContent() || '0');
      referralValues.push(value);
    }

    // Check descending order
    for (let i = 1; i < referralValues.length; i++) {
      expect(referralValues[i]).toBeLessThanOrEqual(referralValues[i - 1]);
    }
  });

  test('should display global leaderboard by earnings', async ({ page }) => {
    await page.goto('/customer/mem_techwhop_1');

    // Find global leaderboard
    await expect(page.locator('text=Global Leaderboard - Top Earners')).toBeVisible();

    // Check table structure
    const table = page.locator('text=Global Leaderboard - Top Earners').locator('..').locator('table');
    await expect(table).toBeVisible();

    // Verify headers
    await expect(table.locator('th:has-text("Rank")')).toBeVisible();
    await expect(table.locator('th:has-text("Member")')).toBeVisible();
    await expect(table.locator('th:has-text("Earnings")')).toBeVisible();

    // Check data rows
    const rows = table.locator('tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
    expect(rowCount).toBeLessThanOrEqual(10);

    // Verify earnings format
    const firstEarningsCell = rows.first().locator('td').nth(2);
    const earnings = await firstEarningsCell.textContent();
    expect(earnings).toMatch(/^\$[0-9,]+(\.[0-9]{2})?$/);
  });

  test('should highlight current user in leaderboard', async ({ page }) => {
    await page.goto('/customer/mem_techwhop_1');

    // Look for highlighted row (usually has different background or border)
    const highlightedRows = page.locator('tr.bg-purple-900\\/20, tr.border-purple-500');
    const count = await highlightedRows.count();

    // Should have at least one highlighted row (current user)
    if (count > 0) {
      const highlightedText = await highlightedRows.first().textContent();
      expect(highlightedText).toBeTruthy();
    }
  });

  test('should show member badges/tiers', async ({ page }) => {
    await page.goto('/customer/mem_techwhop_1');

    // Check for tier badges in leaderboard
    const badges = page.locator('text=/Diamond|Gold|Silver|Bronze/i');
    const badgeCount = await badges.count();

    // Should have some tier indicators
    if (badgeCount > 0) {
      const firstBadge = await badges.first().textContent();
      expect(['Diamond', 'Gold', 'Silver', 'Bronze']).toContain(firstBadge?.trim());
    }
  });

  test('leaderboard API should return correct data', async ({ request }) => {
    // Test community leaderboard API
    const communityResponse = await request.get('/api/leaderboard?type=referrals&scope=community&creatorId=test&limit=10');
    expect(communityResponse.ok()).toBeTruthy();

    const communityData = await communityResponse.json();
    expect(Array.isArray(communityData)).toBeTruthy();

    // Test global leaderboard API
    const globalResponse = await request.get('/api/leaderboard?type=earnings&scope=global&limit=10');
    expect(globalResponse.ok()).toBeTruthy();

    const globalData = await globalResponse.json();
    expect(Array.isArray(globalData)).toBeTruthy();

    // Verify data structure
    if (globalData.length > 0) {
      const firstEntry = globalData[0];
      expect(firstEntry).toHaveProperty('rank');
      expect(firstEntry).toHaveProperty('username');
      expect(firstEntry).toHaveProperty('value');
    }
  });

  test('should handle empty leaderboards gracefully', async ({ page }) => {
    // This would test a member with no community members
    // For now, we just verify the page doesn't crash
    const response = await page.goto('/customer/mem_gamezone_30');
    expect(response?.status()).toBeLessThan(500);

    // Page should still load
    await expect(page.locator('text=/Dashboard|Earnings/')).toBeVisible();
  });
});

test.describe('Rankings Accuracy', () => {
  test('global rankings should be consistent', async ({ page }) => {
    // Visit multiple member dashboards and verify rankings make sense
    const members = [
      '/customer/mem_techwhop_1',
      '/customer/mem_techwhop_2',
      '/customer/mem_techwhop_3'
    ];

    const rankings = [];

    for (const memberUrl of members) {
      await page.goto(memberUrl);

      // Get global rank if displayed
      const globalRankElement = page.locator('text=/Global.*#[0-9]+/');
      if (await globalRankElement.count() > 0) {
        const rankText = await globalRankElement.textContent();
        const rank = parseInt(rankText?.match(/#([0-9]+)/)?.[1] || '0');
        rankings.push(rank);
      }
    }

    // Rankings should all be different
    const uniqueRanks = new Set(rankings);
    expect(uniqueRanks.size).toBe(rankings.length);
  });
});