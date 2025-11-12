// scripts/troubleshoot-urls.ts
/**
 * URL Troubleshooting Script
 * Takes screenshots and checks for errors on all webhook/refund system URLs
 */

import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../lib/logger';


const SCREENSHOT_DIR = './screenshots/troubleshoot';
const PORT = 3002; // Current dev server port

const URLS_TO_TEST = [
  {
    name: 'webhook-health',
    url: `http://localhost:${PORT}/api/webhooks/whop`,
    description: 'Webhook Health Check',
  },
  {
    name: 'admin-analytics',
    url: `http://localhost:${PORT}/api/admin/analytics`,
    description: 'Admin Analytics API',
  },
  {
    name: 'leaderboard',
    url: `http://localhost:${PORT}/api/leaderboard?type=global`,
    description: 'Global Leaderboard',
  },
];

async function troubleshootURL(
  url: string,
  name: string,
  description: string
): Promise<{ success: boolean; error?: string; screenshot?: string }> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    logger.debug(`\n🔍 Testing: ${description}`);
    logger.debug(`   URL: ${url}`);

    // Navigate to URL
    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 10000,
    });

    // Check response status
    const status = response?.status() || 0;
    logger.debug(`   Status: ${status}`);

    // Take screenshot
    const screenshotPath = path.join(SCREENSHOT_DIR, `${name}.png`);
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });
    logger.debug(`   📸 Screenshot: ${screenshotPath}`);

    // Get page content
    const content = await page.content();

    // Check for errors
    const pageText = await page.textContent('body');

    if (status === 500) {
      logger.debug(`   ❌ ERROR: Internal Server Error (500)`);
      return {
        success: false,
        error: `HTTP 500: ${pageText?.substring(0, 200)}`,
        screenshot: screenshotPath,
      };
    }

    if (status === 404) {
      logger.debug(`   ❌ ERROR: Not Found (404)`);
      return {
        success: false,
        error: 'HTTP 404: Route not found',
        screenshot: screenshotPath,
      };
    }

    if (status >= 400) {
      logger.debug(`   ❌ ERROR: HTTP ${status}`);
      return {
        success: false,
        error: `HTTP ${status}: ${pageText?.substring(0, 200)}`,
        screenshot: screenshotPath,
      };
    }

    // Check if it's JSON (for API endpoints)
    if (content.includes('{') && content.includes('}')) {
      try {
        const json = JSON.parse(pageText || '{}');
        logger.debug(`   ✅ SUCCESS: Valid JSON response`);
        logger.debug(`   Response preview:`, JSON.stringify(json, null, 2).substring(0, 300));

        return {
          success: true,
          screenshot: screenshotPath,
        };
      } catch (e) {
        logger.debug(`   ⚠️  WARNING: Response looks like JSON but failed to parse`);
      }
    }

    logger.debug(`   ✅ SUCCESS: Page loaded`);
    return {
      success: true,
      screenshot: screenshotPath,
    };

  } catch (error: any) {
    logger.debug(`   ❌ FAILED: ${error.message}`);

    // Try to take screenshot anyway
    try {
      const screenshotPath = path.join(SCREENSHOT_DIR, `${name}-error.png`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });
      logger.debug(`   📸 Error screenshot: ${screenshotPath}`);

      return {
        success: false,
        error: error.message,
        screenshot: screenshotPath,
      };
    } catch (screenshotError) {
      return {
        success: false,
        error: error.message,
      };
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  logger.debug('\n🔧 URL TROUBLESHOOTING SCRIPT\n');
  logger.debug('═══════════════════════════════════════════════════════════\n');
  logger.debug(`Testing server on port ${PORT}\n`);

  // Create screenshot directory
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const results: Array<{
    name: string;
    description: string;
    url: string;
    success: boolean;
    error?: string;
    screenshot?: string;
  }> = [];

  // Test each URL
  for (const test of URLS_TO_TEST) {
    const result = await troubleshootURL(test.url, test.name, test.description);
    results.push({
      ...test,
      ...result,
    });
  }

  // Print summary
  logger.debug('\n═══════════════════════════════════════════════════════════');
  logger.info(' TROUBLESHOOTING SUMMARY');
  logger.debug('═══════════════════════════════════════════════════════════\n');

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  results.forEach((result) => {
    const status = result.success ? '✅ SUCCESS' : '❌ FAILED';
    logger.debug(`${status} - ${result.description}`);
    logger.debug(`   URL: ${result.url}`);
    if (result.error) {
      logger.debug(`   Error: ${result.error}`);
    }
    if (result.screenshot) {
      logger.debug(`   Screenshot: ${result.screenshot}`);
    }
    logger.debug('');
  });

  logger.debug('═══════════════════════════════════════════════════════════');
  logger.info('Passed: ${successCount}');
  logger.error('Failed: ${failCount}');
  logger.info(' Success Rate: ${((successCount / results.length) * 100).toFixed(2)}%');
  logger.debug('═══════════════════════════════════════════════════════════\n');

  // Additional troubleshooting tips
  if (failCount > 0) {
    logger.info(' TROUBLESHOOTING TIPS:\n');

    const has500 = results.some(r => r.error?.includes('500'));
    const has404 = results.some(r => r.error?.includes('404'));

    if (has500) {
      logger.error('  Internal Server Error (500) detected:');
      logger.debug('   1. Check if Prisma client is up to date: npx prisma generate');
      logger.debug('   2. Check server logs for detailed error messages');
      logger.debug('   3. Verify database connection is working');
      logger.debug('');
    }

    if (has404) {
      logger.warn('  Not Found (404) detected:');
      logger.debug('   1. Verify the route exists in your Next.js app');
      logger.debug('   2. Check if the file is in the correct directory');
      logger.debug('   3. Restart the dev server');
      logger.debug('');
    }
  }

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(console.error);
