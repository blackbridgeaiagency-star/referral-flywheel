import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../lib/logger';


const SCREENSHOT_DIR = './screenshots';
const MEMBER_DASHBOARD_URL = 'http://localhost:3000/customer/mem_gamezone_3';

async function checkLeaderboardUI() {
  logger.info(' Starting Leaderboard UI Check');
  logger.debug(`   Target: ${MEMBER_DASHBOARD_URL}\n`);

  // Ensure screenshot directory exists
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  // Launch browser
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Navigate to member dashboard
    logger.info(' Navigating to member dashboard...');
    await page.goto(MEMBER_DASHBOARD_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Let page fully render

    // Take screenshot of initial state
    logger.info(' Capturing initial dashboard state...');
    const initialScreenshot = path.join(SCREENSHOT_DIR, 'dashboard-initial.png');
    await page.screenshot({
      path: initialScreenshot,
      fullPage: true,
    });
    logger.debug(`   ✓ Saved: ${initialScreenshot}`);

    // Take a screenshot of just the header
    logger.info(' Capturing header area...');
    const header = await page.locator('header').first();
    const headerScreenshot = path.join(SCREENSHOT_DIR, 'dashboard-header.png');
    await header.screenshot({ path: headerScreenshot });
    logger.debug(`   ✓ Saved: ${headerScreenshot}`);

    // Check if leaderboard button exists
    logger.debug('\n🔍 Checking for leaderboard button...');
    const leaderboardButton = await page.locator('button:has-text("Leaderboard")');
    const buttonCount = await leaderboardButton.count();

    if (buttonCount > 0) {
      logger.debug('   ✓ Leaderboard button found!');

      // Take screenshot of the button
      logger.info(' Capturing leaderboard button...');
      const buttonScreenshot = path.join(SCREENSHOT_DIR, 'leaderboard-button.png');
      await leaderboardButton.first().screenshot({ path: buttonScreenshot });
      logger.debug(`   ✓ Saved: ${buttonScreenshot}`);

      // Click the button
      logger.debug('\n🖱️  Clicking leaderboard button...');
      await leaderboardButton.first().click();
      await page.waitForTimeout(1000); // Wait for panel animation

      // Check if panel opened
      logger.info(' Checking if panel opened...');
      const panel = await page.locator('[class*="slide-in-from-left"]');
      const panelCount = await panel.count();

      if (panelCount > 0) {
        logger.debug('   ✓ Leaderboard panel opened!');

        // Check how many entries are in the panel
        const entryCount = await page.locator('[class*="rounded-lg transition-all"]').count();
        logger.debug(`   📊 Found ${entryCount} leaderboard entries`);

        // Take screenshot of panel (viewport only, not full page)
        logger.info(' Capturing leaderboard panel...');
        const panelScreenshot = path.join(SCREENSHOT_DIR, 'leaderboard-panel-open.png');
        await page.screenshot({
          path: panelScreenshot,
          fullPage: false, // Only capture viewport
        });
        logger.debug(`   ✓ Saved: ${panelScreenshot}`);

        // Click community tab
        logger.debug('\n🖱️  Clicking Community tab...');
        const communityTab = await page.locator('button:has-text("Community")');
        await communityTab.click();
        await page.waitForTimeout(1000);

        const communityScreenshot = path.join(SCREENSHOT_DIR, 'leaderboard-community.png');
        await page.screenshot({
          path: communityScreenshot,
          fullPage: false,
        });
        logger.debug(`   ✓ Saved: ${communityScreenshot}`);

        // Click global tab
        logger.info('️  Clicking Global tab...');
        const globalTab = await page.locator('button:has-text("Global")');
        await globalTab.click();
        await page.waitForTimeout(1000);

        const globalScreenshot = path.join(SCREENSHOT_DIR, 'leaderboard-global.png');
        await page.screenshot({
          path: globalScreenshot,
          fullPage: false,
        });
        logger.debug(`   ✓ Saved: ${globalScreenshot}`);

      } else {
        logger.debug('   ❌ Panel did not open!');
      }
    } else {
      logger.debug('   ❌ Leaderboard button not found!');
    }

    logger.debug('\n✅ UI Check Complete!');
    logger.debug('   Screenshots saved in: ./screenshots/');
    logger.debug('\n📝 Please review the screenshots to verify:');
    logger.debug('   1. Leaderboard button is on the leftmost side of header');
    logger.debug('   2. Button shows Trophy icon + "Leaderboard" text');
    logger.debug('   3. Panel slides in from the left side');
    logger.debug('   4. Panel loads fully with leaderboard data');
    logger.debug('   5. Both Community and Global tabs work correctly\n');

    // Keep browser open for manual inspection
    logger.debug('⏳ Browser will stay open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    logger.error('❌ Error during UI check:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the check
checkLeaderboardUI().catch(console.error);
