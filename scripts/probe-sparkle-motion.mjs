// Verify sparkle motion + twinkle by capturing the same state at 3
// time points ~700ms apart. With rate=0.5 and sparkle radius mostly
// in mid-B (orbit factor ~0.3), each sparkle moves ~0.5 * 0.3 *
// 0.7s ≈ 0.1 rad ≈ 6° per frame. Visible across 3 frames.

import { chromium } from 'playwright';

const PORT = process.env.PORT ?? '5178';
const BASE = `http://localhost:${PORT}`;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await ctx.newPage();

await page.goto(`${BASE}/en/projects`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
await page.evaluate(() => {
  window.portfolio.quality('full');
});
await page.waitForTimeout(1500);
await page.evaluate(() => {
  window.portfolio.ui.hide();
  window.portfolio.rings.sparkles.show();
  window.portfolio.rings.clumps.show();
  window.portfolio.rings.spokes.hide();
  window.portfolio.rings.rotationSpeed(0.5);
});
await page.waitForTimeout(1500);

for (let i = 0; i < 3; i++) {
  await page.screenshot({ path: `.screenshots/sparkle-motion-${i}.png` });
  await page.waitForTimeout(700);
}

// Restore
await page.evaluate(() => window.portfolio.rings.rotationSpeed(0.02));
await browser.close();
console.log('captured 3 frames');
