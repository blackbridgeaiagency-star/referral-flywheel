import { chromium } from '@playwright/test';
import * as path from 'path';

const SCREENSHOT_DIR = './screenshots';
const BASE_URL = 'http://localhost:3002';
const PAGE_URL = '/customer/exp_0Zqx0UPJigG6FR';

async function takeScreenshot() {
  console.log('📸 Taking screenshot of:', BASE_URL + PAGE_URL);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1024 }
  });
  const page = await context.newPage();

  try {
    await page.goto(BASE_URL + PAGE_URL, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Wait for page to settle
    await page.waitForTimeout(2000);

    // Take screenshot
    const screenshotPath = path.join(
      SCREENSHOT_DIR,
      `member-dashboard-${Date.now()}.png`
    );

    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });

    console.log('✅ Screenshot saved to:', screenshotPath);

    await browser.close();
    return screenshotPath;
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await browser.close();
    throw error;
  }
}

takeScreenshot().catch(console.error);
