// Verify the band-flow effect (D). Captures four states:
//   1. flow on (default), motion frame 0
//   2. flow on, motion frame 1 (700ms later — bands should have shifted)
//   3. flow off — bands should be static painted color
//   4. flow on again to confirm toggle round-trips

import { chromium } from 'playwright';

const PORT = process.env.PORT ?? '5178';
const BASE = `http://localhost:${PORT}`;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await ctx.newPage();

await page.goto(`${BASE}/en/projects`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
await page.evaluate(() => window.portfolio.quality('full'));
await page.waitForTimeout(1500);
await page.evaluate(() => {
  window.portfolio.ui.hide();
  window.portfolio.rings.sparkles.show();
  window.portfolio.rings.clumps.show();
  window.portfolio.rings.spokes.hide();
  window.portfolio.rings.flow.show();
  window.portfolio.rings.rotationSpeed(0.6);
});
await page.waitForTimeout(1500);

await page.screenshot({ path: '.screenshots/flow-on-t0.png' });
await page.waitForTimeout(700);
await page.screenshot({ path: '.screenshots/flow-on-t1.png' });

// Toggle flow off — bands should now read as solid painted color.
await page.evaluate(() => window.portfolio.rings.flow.hide());
await page.waitForTimeout(800);
await page.screenshot({ path: '.screenshots/flow-off.png' });

// Toggle back on to verify round trip.
await page.evaluate(() => window.portfolio.rings.flow.show());
await page.waitForTimeout(800);
await page.screenshot({ path: '.screenshots/flow-back-on.png' });

const surface = await page.evaluate(() => ({
  hasFlow: typeof window.portfolio.rings.flow?.toggle === 'function',
  flowOn: !!window.portfolio.rings.flow,
}));
console.log('SURFACE', JSON.stringify(surface));

// Restore defaults.
await page.evaluate(() => window.portfolio.rings.rotationSpeed(0.02));
await browser.close();
