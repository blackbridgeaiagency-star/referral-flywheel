import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = './screenshots';

export async function captureScreenshot(
  page: Page,
  name: string,
  iteration: number
): Promise<string> {
  // Ensure screenshot directory exists
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  // Generate filename
  const filename = `iteration-${iteration}-${name}-${Date.now()}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);

  // Take full page screenshot
  await page.screenshot({
    path: filepath,
    fullPage: true,
  });

  console.log(`📸 Screenshot saved: ${filepath}`);
  return filepath;
}

export async function captureComponentScreenshot(
  page: Page,
  selector: string,
  name: string,
  iteration: number
): Promise<string> {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const filename = `iteration-${iteration}-${name}-${Date.now()}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);

  // Wait for element and take screenshot
  const element = await page.locator(selector);
  await element.screenshot({ path: filepath });

  console.log(`📸 Component screenshot saved: ${filepath}`);
  return filepath;
}

export function convertImageToBase64(filepath: string): string {
  const imageBuffer = fs.readFileSync(filepath);
  return imageBuffer.toString('base64');
}

export function cleanupOldScreenshots() {
  if (!fs.existsSync(SCREENSHOT_DIR)) return;

  const files = fs.readdirSync(SCREENSHOT_DIR);
  files.forEach(file => {
    fs.unlinkSync(path.join(SCREENSHOT_DIR, file));
  });

  console.log('🧹 Cleaned up old screenshots');
}
