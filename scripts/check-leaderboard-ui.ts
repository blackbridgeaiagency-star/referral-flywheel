import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = './screenshots';
const MEMBER_DASHBOARD_URL = 'http://localhost:3000/customer/mem_gamezone_3';

async function checkLeaderboardUI() {
  console.log('🚀 Starting Leaderboard UI Check');
  console.log(`   Target: ${MEMBER_DASHBOARD_URL}\n`);

  // Ensure screenshot directory exists
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  // Launch browser
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Navigate to member dashboard
    console.log('🌐 Navigating to member dashboard...');
    await page.goto(MEMBER_DASHBOARD_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Let page fully render

    // Take screenshot of initial state
    console.log('📸 Capturing initial dashboard state...');
    const initialScreenshot = path.join(SCREENSHOT_DIR, 'dashboard-initial.png');
    await page.screenshot({
      path: initialScreenshot,
      fullPage: true,
    });
    console.log(`   ✓ Saved: ${initialScreenshot}`);

    // Take a screenshot of just the header
    console.log('📸 Capturing header area...');
    const header = await page.locator('header').first();
    const headerScreenshot = path.join(SCREENSHOT_DIR, 'dashboard-header.png');
    await header.screenshot({ path: headerScreenshot });
    console.log(`   ✓ Saved: ${headerScreenshot}`);

    // Check if leaderboard button exists
    console.log('\n🔍 Checking for leaderboard button...');
    const leaderboardButton = await page.locator('button:has-text("Leaderboard")');
    const buttonCount = await leaderboardButton.count();

    if (buttonCount > 0) {
      console.log('   ✓ Leaderboard button found!');

      // Take screenshot of the button
      console.log('📸 Capturing leaderboard button...');
      const buttonScreenshot = path.join(SCREENSHOT_DIR, 'leaderboard-button.png');
      await leaderboardButton.first().screenshot({ path: buttonScreenshot });
      console.log(`   ✓ Saved: ${buttonScreenshot}`);

      // Click the button
      console.log('\n🖱️  Clicking leaderboard button...');
      await leaderboardButton.first().click();
      await page.waitForTimeout(1000); // Wait for panel animation

      // Check if panel opened
      console.log('🔍 Checking if panel opened...');
      const panel = await page.locator('[class*="slide-in-from-left"]');
      const panelCount = await panel.count();

      if (panelCount > 0) {
        console.log('   ✓ Leaderboard panel opened!');

        // Check how many entries are in the panel
        const entryCount = await page.locator('[class*="rounded-lg transition-all"]').count();
        console.log(`   📊 Found ${entryCount} leaderboard entries`);

        // Take screenshot of panel (viewport only, not full page)
        console.log('📸 Capturing leaderboard panel...');
        const panelScreenshot = path.join(SCREENSHOT_DIR, 'leaderboard-panel-open.png');
        await page.screenshot({
          path: panelScreenshot,
          fullPage: false, // Only capture viewport
        });
        console.log(`   ✓ Saved: ${panelScreenshot}`);

        // Click community tab
        console.log('\n🖱️  Clicking Community tab...');
        const communityTab = await page.locator('button:has-text("Community")');
        await communityTab.click();
        await page.waitForTimeout(1000);

        const communityScreenshot = path.join(SCREENSHOT_DIR, 'leaderboard-community.png');
        await page.screenshot({
          path: communityScreenshot,
          fullPage: false,
        });
        console.log(`   ✓ Saved: ${communityScreenshot}`);

        // Click global tab
        console.log('🖱️  Clicking Global tab...');
        const globalTab = await page.locator('button:has-text("Global")');
        await globalTab.click();
        await page.waitForTimeout(1000);

        const globalScreenshot = path.join(SCREENSHOT_DIR, 'leaderboard-global.png');
        await page.screenshot({
          path: globalScreenshot,
          fullPage: false,
        });
        console.log(`   ✓ Saved: ${globalScreenshot}`);

      } else {
        console.log('   ❌ Panel did not open!');
      }
    } else {
      console.log('   ❌ Leaderboard button not found!');
    }

    console.log('\n✅ UI Check Complete!');
    console.log('   Screenshots saved in: ./screenshots/');
    console.log('\n📝 Please review the screenshots to verify:');
    console.log('   1. Leaderboard button is on the leftmost side of header');
    console.log('   2. Button shows Trophy icon + "Leaderboard" text');
    console.log('   3. Panel slides in from the left side');
    console.log('   4. Panel loads fully with leaderboard data');
    console.log('   5. Both Community and Global tabs work correctly\n');

    // Keep browser open for manual inspection
    console.log('⏳ Browser will stay open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Error during UI check:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the check
checkLeaderboardUI().catch(console.error);
