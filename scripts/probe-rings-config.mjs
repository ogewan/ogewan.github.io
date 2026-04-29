// Verify scene/body rotation + the unified rings.config() get/set.
// Sets scene = 0.6, body = -0.6 (counter-rotation: body should look
// static, scene should appear to spin). Captures two frames; the body
// silhouette should be IDENTICAL between them, while the rings have
// rotated.

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
await page.evaluate(() => window.portfolio.ui.hide());
await page.waitForTimeout(500);

// Snapshot the default config.
const defaults = await page.evaluate(() => window.portfolio.rings.config());
console.log('DEFAULTS', JSON.stringify(defaults));

// Apply a counter-rotation config and a fast K so motion is obvious
// in the captured pair.
await page.evaluate(() => {
  window.portfolio.rings.config({
    sceneRotationSpeed: 0.6,
    bodyRotationSpeed: -0.6,
    rotationSpeed: 0.2,
    spokes: false,
  });
});
await page.waitForTimeout(800);

// Confirm the config round-trips.
const applied = await page.evaluate(() => window.portfolio.rings.config());
console.log('APPLIED', JSON.stringify(applied));

// Capture two frames 1s apart; body silhouette should match, rings
// should be at different positions.
await page.screenshot({ path: '.screenshots/counter-rot-t0.png' });
await page.waitForTimeout(1000);
await page.screenshot({ path: '.screenshots/counter-rot-t1.png' });

// Restore defaults so persisted state isn't polluted.
await page.evaluate(() => {
  window.portfolio.rings.config({
    sceneRotationSpeed: 0,
    bodyRotationSpeed: 0,
    rotationSpeed: 0.02,
    sparkles: true,
    clumps: true,
    spokes: false,
    flow: true,
  });
});

await browser.close();
