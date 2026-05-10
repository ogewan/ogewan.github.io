#!/usr/bin/env node
/**
 * Capture the earth-moon hero image used by .portfolio.yml's project card.
 *
 *   node scripts/capture-hero.mjs
 *
 * Uses /en/about (camera framed for the earth-moon system, not the close-up
 * home view). Hides chrome and pins the moon to a foreground, lit angle so
 * both bodies are in frame. Saves to docs/screenshots/hero.png.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const URL        = 'http://localhost:5173/en/about';
const VIEWPORT   = { width: 1920, height: 1080 };
const MOON_ANGLE = Math.PI * 1.42; // lower-left of earth — lit, offset, unoccluded
const OUT_DIR    = resolve(process.cwd(), 'docs/screenshots');
const OUT_PATH   = resolve(OUT_DIR, 'hero.png');

mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
await ctx.addInitScript(() => {
  window.localStorage.setItem('portfolio:quality', 'quality');
  window.localStorage.setItem('portfolio:loadingOverlayMinMs', '0');
});

const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForSelector('canvas', { timeout: 10000 });
await page.waitForTimeout(2500);

await page.evaluate((angle) => {
  window.portfolio.ui.hide();
  window.portfolio.earth.rotationSpeed(0);
  window.portfolio.earth.moonAngle(angle);
}, MOON_ANGLE);

await page.waitForTimeout(1500);

await page.screenshot({ path: OUT_PATH, type: 'png', fullPage: false });
console.log(`Saved: ${OUT_PATH}`);

if (errors.length) {
  console.log('Page errors:');
  for (const e of errors) console.log(' ', e);
}

await browser.close();
