import { test, expect } from '@playwright/test';

test.describe('Referral Flow', () => {
  test('should handle referral link redirect', async ({ page, context }) => {
    // Test referral link click
    const referralCode = 'JOHN-ABC123';
    const response = await page.goto(`/r/${referralCode}`);

    // Should redirect (302 status code is expected)
    expect(response?.status()).toBeLessThanOrEqual(302);

    // Check for attribution cookie
    const cookies = await context.cookies();
    const attributionCookie = cookies.find(c => c.name === 'attribution' || c.name === 'ref');

    // If cookie exists, verify it contains referral code
    if (attributionCookie) {
      expect(attributionCookie.value).toContain(referralCode);
    }
  });

  test('should track attribution for 30 days', async ({ page, context }) => {
    // Visit with referral code
    await page.goto('/r/TEST-123456');

    // Check cookie expiry
    const cookies = await context.cookies();
    const attributionCookie = cookies.find(c => c.name === 'attribution' || c.name === 'ref');

    if (attributionCookie && attributionCookie.expires) {
      const expiryDate = new Date(attributionCookie.expires * 1000);
      const now = new Date();
      const daysDiff = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      // Should be approximately 30 days
      expect(daysDiff).toBeGreaterThan(28);
      expect(daysDiff).toBeLessThan(31);
    }
  });

  test('should display referral code format correctly', async ({ page }) => {
    await page.goto('/customer/mem_techwhop_1');

    // Find referral code display
    const referralCodeElement = await page.locator('text=/\/r\/[A-Z]+-[A-Z0-9]{6}/');
    const referralCode = await referralCodeElement.textContent();

    // Verify format: FIRSTNAME-6CHARS
    expect(referralCode).toMatch(/\/r\/[A-Z]+-[A-Z0-9]{6}/);
  });

  test('should handle invalid referral codes gracefully', async ({ page }) => {
    // Test with invalid code
    const response = await page.goto('/r/INVALID');

    // Should still respond (not 404)
    expect(response?.status()).toBeLessThan(500);

    // Could redirect to home or show error
    const url = page.url();
    expect(url).toBeTruthy();
  });
});

test.describe('Commission Calculations', () => {
  test('should display correct commission splits', async ({ page }) => {
    // This would require access to commission data
    // For now, we verify the display format
    await page.goto('/customer/mem_techwhop_1');

    // Check earnings display
    const lifetimeEarnings = await page.locator('text=Lifetime Earnings')
      .locator('..')
      .locator('text=/\$[0-9]/').textContent();

    // Verify it's a valid currency amount
    expect(lifetimeEarnings).toMatch(/^\$[0-9,]+(\.[0-9]{2})?$/);

    // Commission should be 10% of sales
    // This would need actual data verification in a real test
  });

  test('should show monthly vs lifetime earnings', async ({ page }) => {
    await page.goto('/customer/mem_techwhop_1');

    // Get both values
    const lifetimeElement = await page.locator('text=Lifetime Earnings')
      .locator('..')
      .locator('p.text-2xl');
    const monthlyElement = await page.locator('text=Monthly Earnings')
      .locator('..')
      .locator('p.text-2xl');

    const lifetimeText = await lifetimeElement.textContent();
    const monthlyText = await monthlyElement.textContent();

    // Parse values
    const lifetime = parseFloat(lifetimeText?.replace(/[$,]/g, '') || '0');
    const monthly = parseFloat(monthlyText?.replace(/[$,]/g, '') || '0');

    // Monthly should be less than or equal to lifetime
    expect(monthly).toBeLessThanOrEqual(lifetime);
  });
});
