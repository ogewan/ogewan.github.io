// Verify SCENE_DEFAULTS read correctly on a fresh browser context
// (no localStorage entries from prior sessions). Should show
// sceneRotationSpeed: 0.0025 and clock: false among the others.

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

const config = await page.evaluate(() => window.portfolio.rings.config());
console.log('CONFIG_FRESH', JSON.stringify(config));

await browser.close();
