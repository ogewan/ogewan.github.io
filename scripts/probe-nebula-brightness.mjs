// Probe: nebulaBrightness live-update at three values (0.5, 5, 50).
// Validates that portfolio.bg.global.config({nebulaBrightness: N}) updates
// the visual in real-time without a page reload.
//
// Screenshots → .screenshots/nebula-brightness/

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE_URL = process.argv.find((a) => a.startsWith('--url='))?.slice(6) ?? 'http://localhost:5175';
const url = `${BASE_URL}/en/`;

const screenshotsDir = resolve(process.cwd(), '.screenshots/nebula-brightness');
mkdirSync(screenshotsDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();

const messages = [];
page.on('console', (msg) => messages.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => messages.push(`[pageerror] ${err.message}`));

console.log(`\nNavigating to ${url}…`);
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
// Stay at home/earth scene — no billboard nebulae overlaying the procedural skybox,
// so nebulaBrightness changes are directly visible without competing layers.
await page.evaluate(() => document.getElementById('home')?.scrollIntoView({ behavior: 'instant' }));
await page.waitForTimeout(2000);

// Reset to a known baseline (SCENE_DEFAULTS)
await page.evaluate(() => window.portfolio.bg.reset());
await page.waitForTimeout(400);

const baseline = await page.evaluate(() => window.portfolio.bg.global.config());
console.log('BASELINE (after reset)', JSON.stringify(baseline));

await page.screenshot({ path: resolve(screenshotsDir, '00-baseline.png') });
console.log('Screenshot: 00-baseline.png');

const levels = [0.5, 5, 50];
for (const level of levels) {
  await page.evaluate((b) => window.portfolio.bg.global.config({ nebulaBrightness: b }), level);
  await page.waitForTimeout(400);
  const state = await page.evaluate(() => window.portfolio.bg.global.config());
  const file = `nebula-brightness-${String(level).replace('.', '_')}.png`;
  await page.screenshot({ path: resolve(screenshotsDir, file) });
  console.log(`Screenshot: ${file}  state=${JSON.stringify(state)}`);
}

// Reset
await page.evaluate(() => window.portfolio.bg.reset());

const warnings = messages.filter((m) => m.includes('[pageerror]') || m.includes('[error]'));
if (warnings.length) {
  console.log('\nErrors:');
  warnings.forEach((m) => console.log(' ', m));
}

await browser.close();
console.log('\ndone — screenshots in .screenshots/nebula-brightness/');
