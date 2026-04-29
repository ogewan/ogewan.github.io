// Probe the wired gas-giant body shader. Captures with rotation paused
// to show the bands + vortex clearly, then with rotation running to
// confirm bands shear past each other (differential motion).

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
  // Halt scene/body rotation so the body sits still in frame.
  window.portfolio.rings.config({
    sceneRotationSpeed: 0,
    bodyRotationSpeed: 0,
    rotationSpeed: 0.02,
    sparkles: true,
    clumps: true,
    spokes: false,
    flow: true,
    clock: false,
  });
});
await page.waitForTimeout(1500);

await page.screenshot({ path: '.screenshots/gas-giant-static.png' });

// Now bump body rotation to a fast value so the bands clearly scroll
// at differential rates between two captures.
await page.evaluate(() => {
  window.portfolio.rings.config({ bodyRotationSpeed: 0.4 });
});
await page.waitForTimeout(1500);
await page.screenshot({ path: '.screenshots/gas-giant-spinning-t0.png' });
await page.waitForTimeout(1000);
await page.screenshot({ path: '.screenshots/gas-giant-spinning-t1.png' });

// Restore defaults.
await page.evaluate(() => {
  window.portfolio.rings.config({
    sceneRotationSpeed: 0.0025,
    bodyRotationSpeed: 0,
  });
});

await browser.close();
console.log('captured');
