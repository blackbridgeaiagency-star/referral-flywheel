import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../lib/logger';


const SCREENSHOT_DIR = './screenshots/all-pages';
const BASE_URL = 'http://localhost:3002';

// Test IDs from database
const TEST_MEMBER_ID = 'cmh58cvvv00061h5svl29v20l';
const TEST_CREATOR_ID = 'cmh58cvmo00021h5so1pfcm8c';
const TEST_EXPERIENCE_ID = 'exp_test123';

interface PageToTest {
  name: string;
  url: string;
  waitFor?: string; // CSS selector to wait for
  requiresAuth?: boolean;
  description: string;
}

const pagesToTest: PageToTest[] = [
  {
    name: 'home',
    url: '/',
    description: 'Landing page with setup instructions',
  },
  {
    name: 'discover',
    url: '/discover',
    description: 'Public community listings',
  },
  {
    name: 'setup',
    url: '/setup',
    description: 'Setup wizard for new creators',
  },
  {
    name: 'member-dashboard',
    url: `/customer/mem_techwhop_1`,
    description: 'Member dashboard with referral stats (Linda Sanchez - 5 referrals)',
    waitFor: 'h1',
  },
  {
    name: 'creator-dashboard',
    url: `/seller-product/prod_techwhop_test`,
    description: 'Creator dashboard with analytics',
    waitFor: 'h1',
  },
  {
    name: 'admin-dashboard',
    url: '/admin/dashboard',
    description: 'Admin dashboard overview',
  },
  {
    name: 'admin-webhook-monitor',
    url: '/admin/webhook-monitor',
    description: 'Webhook monitoring and debugging',
  },
  {
    name: 'admin-members',
    url: '/admin/members',
    description: 'Member management interface',
  },
  {
    name: 'admin-analytics',
    url: '/admin/analytics',
    description: 'Platform-wide analytics',
  },
  {
    name: 'analytics',
    url: '/analytics',
    description: 'General analytics page',
  },
];

async function ensureDirectory(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function takeScreenshot(
  browser: any,
  page: PageToTest
): Promise<{ success: boolean; error?: string; path?: string }> {
  const context = await browser.newContext();
  const browserPage = await context.newPage();

  try {
    logger.debug(`\n📸 Testing: ${page.name}`);
    logger.debug(`   URL: ${BASE_URL}${page.url}`);
    logger.debug(`   Description: ${page.description}`);

    // Navigate to page
    const response = await browserPage.goto(`${BASE_URL}${page.url}`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Check response status
    if (!response || response.status() >= 400) {
      const status = response?.status() || 'unknown';
      logger.debug(`   ❌ Failed: HTTP ${status}`);
      await context.close();
      return {
        success: false,
        error: `HTTP ${status}`,
      };
    }

    // Wait for specific element if specified
    if (page.waitFor) {
      try {
        await browserPage.waitForSelector(page.waitFor, { timeout: 10000 });
      } catch (e) {
        logger.debug(`   ⚠️  Warning: Selector "${page.waitFor}" not found`);
      }
    }

    // Wait a bit for page to settle
    await browserPage.waitForTimeout(2000);

    // Take screenshot
    const screenshotPath = path.join(
      SCREENSHOT_DIR,
      `${page.name}-${Date.now()}.png`
    );
    await browserPage.screenshot({
      path: screenshotPath,
      fullPage: true,
    });

    logger.debug(`   ✅ Success: ${screenshotPath}`);

    await context.close();
    return {
      success: true,
      path: screenshotPath,
    };
  } catch (error: any) {
    logger.debug(`   ❌ Error: ${error.message}`);
    await context.close();
    return {
      success: false,
      error: error.message,
    };
  }
}

async function main() {
  logger.info(' Starting comprehensive page screenshot test');
  logger.debug(`   Base URL: ${BASE_URL}`);
  logger.debug(`   Pages to test: ${pagesToTest.length}`);
  logger.debug(`   Screenshot dir: ${SCREENSHOT_DIR}\n`);

  // Ensure screenshot directory exists
  ensureDirectory(SCREENSHOT_DIR);

  // Launch browser
  logger.info(' Launching browser...');
  const browser = await chromium.launch({ headless: false });

  const results: Array<{
    page: PageToTest;
    result: Awaited<ReturnType<typeof takeScreenshot>>;
  }> = [];

  // Test each page
  for (const page of pagesToTest) {
    const result = await takeScreenshot(browser, page);
    results.push({ page, result });
  }

  await browser.close();

  // Generate report
  logger.debug('\n' + '='.repeat(60));
  logger.info(' RESULTS SUMMARY');
  logger.debug('='.repeat(60) + '\n');

  const successful = results.filter((r) => r.result.success);
  const failed = results.filter((r) => !r.result.success);

  logger.info('Successful: ${successful.length}/${results.length}');
  logger.error('Failed: ${failed.length}/${results.length}\n');

  if (failed.length > 0) {
    logger.debug('Failed pages:');
    failed.forEach(({ page, result }) => {
      logger.debug(`  - ${page.name}: ${result.error}`);
    });
  }

  // Generate markdown report
  const report = generateMarkdownReport(results);
  const reportPath = path.join(SCREENSHOT_DIR, 'REPORT.md');
  fs.writeFileSync(reportPath, report);
  logger.debug(`\n📝 Full report saved to: ${reportPath}`);

  // Exit with error code if any failed
  if (failed.length > 0) {
    process.exit(1);
  }
}

function generateMarkdownReport(
  results: Array<{
    page: PageToTest;
    result: Awaited<ReturnType<typeof takeScreenshot>>;
  }>
): string {
  const timestamp = new Date().toISOString();
  const successful = results.filter((r) => r.result.success);
  const failed = results.filter((r) => !r.result.success);

  let report = `# Page Screenshot Report
*Generated: ${timestamp}*

---

## Summary

- **Total Pages**: ${results.length}
- **Successful**: ${successful.length}
- **Failed**: ${failed.length}
- **Success Rate**: ${((successful.length / results.length) * 100).toFixed(1)}%

---

`;

  if (successful.length > 0) {
    report += `## ✅ Successful Pages (${successful.length})\n\n`;
    successful.forEach(({ page, result }) => {
      const relativePath = result.path?.replace(SCREENSHOT_DIR, '.');
      report += `### ${page.name}

**URL**: \`${page.url}\`
**Description**: ${page.description}

![${page.name}](${relativePath})

---

`;
    });
  }

  if (failed.length > 0) {
    report += `## ❌ Failed Pages (${failed.length})\n\n`;
    failed.forEach(({ page, result }) => {
      report += `### ${page.name}

**URL**: \`${page.url}\`
**Description**: ${page.description}
**Error**: ${result.error}

---

`;
    });
  }

  report += `## Issues Found

`;

  // Analyze errors
  const errorTypes = new Map<string, number>();
  failed.forEach(({ result }) => {
    const errorType = result.error?.split(':')[0] || 'Unknown';
    errorTypes.set(errorType, (errorTypes.get(errorType) || 0) + 1);
  });

  if (errorTypes.size > 0) {
    report += 'Error breakdown:\n';
    errorTypes.forEach((count, type) => {
      report += `- ${type}: ${count} occurrence(s)\n`;
    });
  } else {
    report += 'No issues found! All pages are rendering correctly.\n';
  }

  report += `\n---

## Next Steps

`;

  if (failed.length > 0) {
    report += `- [ ] Fix failed pages (${failed.length} total)\n`;
    failed.forEach(({ page }) => {
      report += `  - [ ] ${page.name} (${page.url})\n`;
    });
  } else {
    report += `- [x] All pages rendering successfully\n`;
    report += `- [ ] Review screenshots for UI/UX issues\n`;
    report += `- [ ] Test responsive design on mobile\n`;
    report += `- [ ] Test with real user interactions\n`;
  }

  report += `\n---

*Report generated by automated page screenshot system*
`;

  return report;
}

// Run the test
main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
