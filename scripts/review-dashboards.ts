import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../lib/logger';


const SCREENSHOT_DIR = './screenshots/review';
const BASE_URL = 'http://localhost:3000';

const PAGES_TO_REVIEW = [
  { name: 'member-dashboard', url: '/customer/mem_techwhop_1', description: 'Member Dashboard' },
  { name: 'creator-dashboard', url: '/seller-product/prod_techwhop_test', description: 'Creator Dashboard' },
  { name: 'discover-page', url: '/discover', description: 'Discover Landing Page' },
  { name: 'setup-wizard', url: '/setup?productId=test', description: 'Setup Wizard' },
  { name: 'error-page', url: '/test-404', description: '404 Page' },
];

async function captureAllDashboards() {
  logger.info(' Starting Dashboard Review');
  logger.debug(`   Base URL: ${BASE_URL}`);
  logger.debug(`   Pages to review: ${PAGES_TO_REVIEW.length}\n`);

  // Create screenshot directory
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();
  const screenshots: Array<{ name: string; path: string; url: string }> = [];

  for (const pageInfo of PAGES_TO_REVIEW) {
    logger.debug(`\n📸 Capturing: ${pageInfo.description}`);
    logger.debug(`   URL: ${BASE_URL}${pageInfo.url}`);

    try {
      await page.goto(`${BASE_URL}${pageInfo.url}`, {
        waitUntil: 'networkidle',
        timeout: 10000
      });
      await page.waitForTimeout(2000); // Let animations complete

      const filename = `${pageInfo.name}-${Date.now()}.png`;
      const filepath = path.join(SCREENSHOT_DIR, filename);

      // Full page screenshot
      await page.screenshot({
        path: filepath,
        fullPage: true,
      });

      logger.debug(`   ✅ Saved: ${filepath}`);
      screenshots.push({
        name: pageInfo.description,
        path: filepath,
        url: pageInfo.url
      });

      // Also capture mobile view
      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(500);

      const mobileFilename = `${pageInfo.name}-mobile-${Date.now()}.png`;
      const mobileFilepath = path.join(SCREENSHOT_DIR, mobileFilename);

      await page.screenshot({
        path: mobileFilepath,
        fullPage: true,
      });

      logger.debug(`   ✅ Saved (mobile): ${mobileFilepath}`);
      screenshots.push({
        name: `${pageInfo.description} (Mobile)`,
        path: mobileFilepath,
        url: pageInfo.url
      });

      // Reset viewport
      await page.setViewportSize({ width: 1920, height: 1080 });

    } catch (error) {
      logger.error(`   ❌ Error capturing ${pageInfo.name}:`, error);
    }
  }

  await browser.close();

  // Generate review report
  const report = `# Dashboard Review Report
*Generated: ${new Date().toISOString()}*

## Screenshots Captured

${screenshots.map((s, i) => `
### ${i + 1}. ${s.name}
**URL**: \`${s.url}\`
**Screenshot**: ![${s.name}](${s.path.replace('./screenshots/review/', './')})

---
`).join('\n')}

## Review Checklist

### Visual Design
- [ ] Consistent spacing and alignment
- [ ] Proper color contrast (WCAG AA)
- [ ] Typography hierarchy clear
- [ ] Dark theme properly applied
- [ ] No visual bugs or glitches

### Responsive Design
- [ ] Mobile layout works properly
- [ ] Touch targets are 44px minimum
- [ ] Text is readable on small screens
- [ ] No horizontal scroll
- [ ] Proper breakpoints used

### Component Quality
- [ ] Loading states implemented
- [ ] Empty states handled
- [ ] Error states clear
- [ ] Hover effects smooth
- [ ] Animations polished

### UX Issues
- [ ] Navigation intuitive
- [ ] CTAs clearly visible
- [ ] Important info prioritized
- [ ] User flow makes sense
- [ ] No confusing elements

## Improvements Needed

_(Will be filled after review)_

---

*Next: Review screenshots and create improvement tasks*
`;

  const reportPath = path.join(SCREENSHOT_DIR, 'REVIEW-REPORT.md');
  fs.writeFileSync(reportPath, report);

  logger.debug(`\n✅ Review Complete!`);
  logger.debug(`   Screenshots: ${screenshots.length}`);
  logger.debug(`   Location: ${SCREENSHOT_DIR}`);
  logger.debug(`   Report: ${reportPath}\n`);
}

captureAllDashboards().catch(console.error);
