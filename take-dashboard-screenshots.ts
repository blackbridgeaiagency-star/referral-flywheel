import { chromium } from 'playwright';

const creators = [
  { name: 'TechWhop', productId: 'prod_techwhop_test' },
  { name: 'FitnessHub', productId: 'prod_fitnesshub_test' },
  { name: 'GameZone', productId: 'prod_gamezone_test' },
];

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  for (const creator of creators) {
    const url = `http://localhost:3000/seller-product/${creator.productId}`;
    console.log(`\n📸 Taking screenshot of ${creator.name}...`);
    console.log(`   URL: ${url}`);

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait a bit for any animations
      await page.waitForTimeout(2000);

      // Take full page screenshot
      const screenshotPath = `./screenshots/${creator.name}-dashboard-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });

      console.log(`   ✅ Screenshot saved: ${screenshotPath}`);
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  await browser.close();
  console.log('\n✅ All screenshots captured!');
}

main();
