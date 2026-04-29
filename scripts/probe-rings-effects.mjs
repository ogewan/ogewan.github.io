// Probe the three ring effect toggles. Captures four states:
//   1. Defaults (sparkles on, clumps on, spokes off)
//   2. Sparkles only (clumps off)
//   3. Clumps only (sparkles off, clumps on, spokes off)
//   4. Spokes on top of defaults

import { chromium } from 'playwright';

const PORT = process.env.PORT ?? '5178';
const BASE = `http://localhost:${PORT}`;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await ctx.newPage();
const log = [];
page.on('console', (msg) => log.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => log.push(`[pageerror] ${err.message}`));

await page.goto(`${BASE}/en/projects`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

await page.evaluate(() => {
  window.portfolio.quality('full');
});
await page.waitForTimeout(1500);

await page.evaluate(() => {
  window.portfolio.ui.hide();
  // Crank rate so a visible motion frame helps reveal effects.
  window.portfolio.rings.rotationSpeed(0.8);
});
await page.waitForTimeout(800);

// 1. Defaults: sparkles on, clumps on, spokes off.
await page.evaluate(() => {
  window.portfolio.rings.sparkles.show();
  window.portfolio.rings.clumps.show();
  window.portfolio.rings.spokes.hide();
});
await page.waitForTimeout(1500); // buffer regen
await page.screenshot({ path: '.screenshots/effects-defaults.png' });

// 2. Sparkles only — clumps off.
await page.evaluate(() => {
  window.portfolio.rings.clumps.hide();
});
await page.waitForTimeout(1500);
await page.screenshot({ path: '.screenshots/effects-sparkles-only.png' });

// 3. Clumps only — sparkles off, clumps on, spokes off.
await page.evaluate(() => {
  window.portfolio.rings.sparkles.hide();
  window.portfolio.rings.clumps.show();
});
await page.waitForTimeout(1500);
await page.screenshot({ path: '.screenshots/effects-clumps-only.png' });

// 4. All three on.
await page.evaluate(() => {
  window.portfolio.rings.sparkles.show();
  window.portfolio.rings.spokes.show();
});
await page.waitForTimeout(1500);
await page.screenshot({ path: '.screenshots/effects-all-on.png' });

// Verify dev API surface
const surface = await page.evaluate(() => ({
  sparkles: typeof window.portfolio.rings.sparkles?.toggle === 'function',
  clumps: typeof window.portfolio.rings.clumps?.toggle === 'function',
  spokes: typeof window.portfolio.rings.spokes?.toggle === 'function',
  rotationRate: window.portfolio.rings.rotationSpeed(),
}));
console.log('SURFACE', JSON.stringify(surface));

// Restore defaults so we don't pollute persisted state.
await page.evaluate(() => {
  window.portfolio.rings.sparkles.show();
  window.portfolio.rings.clumps.show();
  window.portfolio.rings.spokes.hide();
  window.portfolio.rings.rotationSpeed(0.02);
});

await browser.close();
