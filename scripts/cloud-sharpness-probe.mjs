#!/usr/bin/env node
/**
 * Cloud sharpness probe — captures the earth at four sharpness levels,
 * cropped to the globe so the cloud detail is actually legible.
 *
 *   node scripts/cloud-sharpness-probe.mjs
 *
 * Requires the dev server at http://localhost:5173.
 * Saves to .screenshots/:
 *   cloud-sharp-0.00.png  — pure feather (max blur)
 *   cloud-sharp-0.20.png  — default
 *   cloud-sharp-0.60.png  — defined cores
 *   cloud-sharp-0.90.png  — near hard-edge
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE_URL = 'http://localhost:5173/en/about';
const VIEWPORT = { width: 1920, height: 1080 };
// Full viewport — locate earth position with UI hidden.
const CROP     = null;
const LEVELS   = [0.0, 0.2, 0.6, 0.9];
const DIR      = resolve(process.cwd(), '.screenshots');
mkdirSync(DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors  = [];

const ctx  = await browser.newContext({ viewport: VIEWPORT });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));

await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForSelector('canvas', { timeout: 10000 });
await page.waitForTimeout(3000);

// Procedural mode so NASA cloud webp doesn't override the canvas texture.
await page.evaluate(() => {
  window.portfolio.ui.hide();
  window.portfolio.earth.textureMode('procedural');
  // Spin fast to advance ~π rad (half rotation) so the lit side faces camera.
  window.portfolio.earth.rotationSpeed(Math.PI);
});
// Let it spin ~half a rotation then halt.
await page.waitForTimeout(1000);
await page.evaluate(() => window.portfolio.earth.rotationSpeed(0));
await page.waitForTimeout(300);

for (const level of LEVELS) {
  await page.evaluate((v) => window.portfolio.earth.cloudSharpness(v), level);
  // Give Three.js two frames to re-upload the canvas texture (~100 ms each).
  await page.waitForTimeout(600);

  const name = `cloud-sharp-${level.toFixed(2)}.png`;
  const path = resolve(DIR, name);
  await page.screenshot({ path, clip: CROP });
  console.log(`Saved (sharpness=${level}): ${path}`);
}

// Restore defaults.
await page.evaluate(() => window.portfolio.earth.reset());
await ctx.close();
await browser.close();

if (errors.length) {
  console.log('\nPage errors:');
  for (const e of errors) console.log(' ', e);
}

console.log('\nDone. Compare cloud-sharp-*.png — 0.00 should look soft/hazy, 0.90 should have crisp edges.');
