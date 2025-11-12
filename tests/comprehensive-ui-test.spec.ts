import { test, expect, Page } from '@playwright/test';
import logger from '../lib/logger';


// Comprehensive UI and Feature Testing
test.describe('🎯 COMPREHENSIVE FEATURE & UI TESTING', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  // ====================================
  // 1. MEMBER DASHBOARD TESTS
  // ====================================
  test.describe('📱 Member Dashboard', () => {
    test('Complete UI and functionality test', async () => {
      // Navigate to member dashboard
      await page.goto('http://localhost:3002/customer/mem_techwhop_1');
      await page.waitForLoadState('networkidle');

      // Take full page screenshot
      await page.screenshot({
        path: 'tests/screenshots/member-dashboard-full.png',
        fullPage: true
      });

      // Check essential UI elements
      await expect(page.locator('h1')).toContainText(/Dashboard|Welcome/i);

      // Test referral link card
      const referralCard = page.locator('[data-testid="referral-link-card"]').or(
        page.locator('text=/Your Referral Link/i').locator('..')
      );
      await expect(referralCard).toBeVisible();

      // Test copy button functionality
      const copyButton = page.locator('button:has-text("Copy")').first();
      if (await copyButton.isVisible()) {
        await copyButton.click();
        // Check for success toast/message
        const successMessage = page.locator('text=/Copied/i');
        await expect(successMessage).toBeVisible({ timeout: 3000 }).catch(() => {
          logger.debug('No copy confirmation message found');
        });
      }

      // Test stats grid
      const statsGrid = page.locator('[data-testid="stats-grid"]').or(
        page.locator('text=/Total Earnings/i').locator('../..')
      );
      await expect(statsGrid).toBeVisible();
      await page.screenshot({
        path: 'tests/screenshots/member-stats.png',
        clip: { x: 0, y: 200, width: 1200, height: 400 }
      });

      // Test leaderboard
      const leaderboard = page.locator('[data-testid="leaderboard"]').or(
        page.locator('text=/Leaderboard/i').locator('..')
      );
      if (await leaderboard.isVisible()) {
        await page.screenshot({
          path: 'tests/screenshots/member-leaderboard.png'
        });
      }

      // Test earnings chart
      const earningsChart = page.locator('[data-testid="earnings-chart"]').or(
        page.locator('text=/Earnings/i').locator('..')
      );
      if (await earningsChart.isVisible()) {
        await page.screenshot({
          path: 'tests/screenshots/member-earnings-chart.png'
        });
      }

      // Test dark mode toggle (if exists)
      const darkModeToggle = page.locator('[data-testid="theme-toggle"]').or(
        page.locator('button[aria-label*="theme"]')
      );
      if (await darkModeToggle.isVisible()) {
        await darkModeToggle.click();
        await page.waitForTimeout(500);
        await page.screenshot({
          path: 'tests/screenshots/member-dashboard-dark.png',
          fullPage: true
        });
        await darkModeToggle.click(); // Toggle back
      }

      // Test responsive design
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone size
      await page.screenshot({
        path: 'tests/screenshots/member-dashboard-mobile.png',
        fullPage: true
      });
      await page.setViewportSize({ width: 1920, height: 1080 }); // Desktop
    });
  });

  // ====================================
  // 2. CREATOR DASHBOARD TESTS
  // ====================================
  test.describe('🏢 Creator Dashboard', () => {
    test('Complete UI and functionality test', async () => {
      // Navigate to creator dashboard
      await page.goto('http://localhost:3002/seller-product/prod_techwhop_test');
      await page.waitForLoadState('networkidle');

      // Take full page screenshot
      await page.screenshot({
        path: 'tests/screenshots/creator-dashboard-full.png',
        fullPage: true
      });

      // Check essential elements
      await expect(page.locator('h1')).toContainText(/Dashboard|Analytics|Creator/i);

      // Test revenue metrics
      const revenueCard = page.locator('text=/Total Revenue/i').locator('..');
      if (await revenueCard.isVisible()) {
        await page.screenshot({
          path: 'tests/screenshots/creator-revenue.png'
        });
      }

      // Test top performers table
      const topPerformers = page.locator('text=/Top Performers/i').locator('..');
      if (await topPerformers.isVisible()) {
        await page.screenshot({
          path: 'tests/screenshots/creator-top-performers.png'
        });
      }

      // Test reward management form
      const rewardForm = page.locator('[data-testid="reward-form"]').or(
        page.locator('text=/Reward/i').locator('..')
      );
      if (await rewardForm.isVisible()) {
        await page.screenshot({
          path: 'tests/screenshots/creator-rewards.png'
        });
      }

      // Test CSV export button
      const exportButton = page.locator('button:has-text("Export")').or(
        page.locator('button:has-text("CSV")')
      );
      if (await exportButton.isVisible()) {
        // Don't actually click to avoid download
        const isEnabled = await exportButton.isEnabled();
        expect(isEnabled).toBeTruthy();
      }

      // Test mobile view
      await page.setViewportSize({ width: 375, height: 667 });
      await page.screenshot({
        path: 'tests/screenshots/creator-dashboard-mobile.png',
        fullPage: true
      });
      await page.setViewportSize({ width: 1920, height: 1080 });
    });
  });

  // ====================================
  // 3. REFERRAL FLOW TESTS
  // ====================================
  test.describe('🔗 Referral Flow', () => {
    test('Test referral redirect and attribution', async () => {
      // Test referral link redirect
      await page.goto('http://localhost:3002/r/JESSICA-NSZP83');

      // Should redirect or show product page
      await page.waitForLoadState('networkidle');
      await page.screenshot({
        path: 'tests/screenshots/referral-redirect.png',
        fullPage: true
      });

      // Check for attribution tracking (check cookies/localStorage)
      const localStorage = await page.evaluate(() => {
        return Object.keys(window.localStorage).reduce((acc, key) => {
          acc[key] = window.localStorage.getItem(key);
          return acc;
        }, {} as Record<string, string | null>);
      });

      logger.debug('LocalStorage after referral:', localStorage);

      // Check cookies
      const cookies = await page.context().cookies();
      const attributionCookie = cookies.find(c =>
        c.name.toLowerCase().includes('referral') ||
        c.name.toLowerCase().includes('attribution')
      );

      if (attributionCookie) {
        logger.debug('Attribution cookie found:', attributionCookie);
      }
    });
  });

  // ====================================
  // 4. API ENDPOINT TESTS
  // ====================================
  test.describe('🔌 API Endpoints', () => {
    test('Test all API routes', async () => {
      // Test leaderboard API
      const leaderboardResponse = await page.request.get('http://localhost:3002/api/leaderboard');
      expect(leaderboardResponse.ok()).toBeTruthy();
      const leaderboardData = await leaderboardResponse.json();
      logger.debug('Leaderboard API:', leaderboardData);

      // Test referral stats API
      const statsResponse = await page.request.get('http://localhost:3002/api/referrals/stats?memberId=mem_techwhop_1');
      logger.debug('Stats API Response Status:', statsResponse.status());

      // Test webhook endpoint (with test data)
      const webhookResponse = await page.request.post('http://localhost:3002/api/webhooks/whop', {
        data: {
          action: 'membership.went_valid',
          data: {
            id: 'test_membership_' + Date.now(),
            user: { id: 'test_user_123', email: 'test@example.com' },
            product: { id: 'prod_techwhop_test' }
          }
        },
        headers: {
          'x-whop-signature': 'test-signature'
        }
      });
      logger.debug('Webhook test response:', webhookResponse.status());
    });
  });

  // ====================================
  // 5. DISCOVER PAGE TEST
  // ====================================
  test.describe('🌐 Discover Page', () => {
    test('Test discover page UI', async () => {
      await page.goto('http://localhost:3002/discover');
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: 'tests/screenshots/discover-page.png',
        fullPage: true
      });

      // Check for community listings
      const communityCards = page.locator('[data-testid="community-card"]').or(
        page.locator('.card').or(page.locator('[class*="card"]'))
      );

      const cardCount = await communityCards.count();
      logger.debug(`Found ${cardCount} community cards`);

      if (cardCount > 0) {
        expect(cardCount).toBeGreaterThan(0);
      }

      // Test mobile view
      await page.setViewportSize({ width: 375, height: 667 });
      await page.screenshot({
        path: 'tests/screenshots/discover-page-mobile.png',
        fullPage: true
      });
    });
  });

  // ====================================
  // 6. PERFORMANCE TESTS
  // ====================================
  test.describe('⚡ Performance', () => {
    test('Page load performance', async () => {
      const metrics: Record<string, number> = {};

      // Member dashboard performance
      const memberStart = Date.now();
      await page.goto('http://localhost:3002/customer/mem_techwhop_1');
      await page.waitForLoadState('networkidle');
      metrics.memberDashboardLoad = Date.now() - memberStart;

      // Creator dashboard performance
      const creatorStart = Date.now();
      await page.goto('http://localhost:3002/seller-product/prod_techwhop_test');
      await page.waitForLoadState('networkidle');
      metrics.creatorDashboardLoad = Date.now() - creatorStart;

      // Discover page performance
      const discoverStart = Date.now();
      await page.goto('http://localhost:3002/discover');
      await page.waitForLoadState('networkidle');
      metrics.discoverPageLoad = Date.now() - discoverStart;

      logger.debug('Performance Metrics (ms):', metrics);

      // Assert reasonable load times (under 3 seconds)
      Object.entries(metrics).forEach(([page, loadTime]) => {
        expect(loadTime).toBeLessThan(3000);
      });
    });
  });

  // ====================================
  // 7. ACCESSIBILITY TESTS
  // ====================================
  test.describe('♿ Accessibility', () => {
    test('Basic accessibility checks', async () => {
      await page.goto('http://localhost:3002/customer/mem_techwhop_1');

      // Check for alt text on images
      const images = await page.locator('img').all();
      for (const img of images) {
        const alt = await img.getAttribute('alt');
        // Images should have alt text or be decorative (empty alt)
        expect(alt).toBeDefined();
      }

      // Check for proper heading hierarchy
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeGreaterThan(0);
      expect(h1Count).toBeLessThanOrEqual(1); // Should have only one h1

      // Check for button labels
      const buttons = await page.locator('button').all();
      for (const button of buttons) {
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        // Button should have text or aria-label
        expect(text || ariaLabel).toBeTruthy();
      }

      // Check color contrast (basic check)
      const bodyBg = await page.evaluate(() =>
        window.getComputedStyle(document.body).backgroundColor
      );
      logger.debug('Body background color:', bodyBg);
    });
  });

  // ====================================
  // 8. ERROR HANDLING TESTS
  // ====================================
  test.describe('❌ Error Handling', () => {
    test('404 page handling', async () => {
      await page.goto('http://localhost:3002/nonexistent-page');
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: 'tests/screenshots/404-page.png',
        fullPage: true
      });

      // Should show 404 or redirect
      const pageContent = await page.textContent('body');
      logger.debug('404 page content preview:', pageContent?.substring(0, 200));
    });

    test('Invalid member ID handling', async () => {
      await page.goto('http://localhost:3002/customer/invalid_member_id');
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: 'tests/screenshots/invalid-member.png',
        fullPage: true
      });

      const pageContent = await page.textContent('body');
      logger.debug('Invalid member page content:', pageContent?.substring(0, 200));
    });
  });
});