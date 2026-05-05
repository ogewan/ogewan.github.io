#!/usr/bin/env node
/**
 * Moon texture probe — captures the moon at a fixed orbit position in both
 * texture modes and crops to the earth+moon area so the difference is legible.
 *
 *   node scripts/moon-probe.mjs
 *
 * Requires the dev server at http://localhost:5173.
 * Saves to .screenshots/:
 *   moon-probe-procedural.png  — uniform grey sphere (base colour)
 *   moon-probe-nasa.png        — should show LRO surface (grey + dark maria)
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE_URL  = 'http://localhost:5173/en/about';
// 1920×1080 so the earth/moon are larger on screen.
const VIEWPORT  = { width: 1920, height: 1080 };
// Full viewport — side-by-side comparison of procedural vs NASA moon.
const CROP      = null;
// Moon at PI*0.35 — foreground, lit side, not occluded by earth.
const MOON_ANGLE = Math.PI * 1.469;
const DIR = resolve(process.cwd(), '.screenshots');
mkdirSync(DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors  = [];

async function probe(textureMode, screenshotName) {
  // deviceScaleFactor:3 renders at 3× pixel density — moon is ~3× larger in pixels.
  const ctx  = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 10000 });
  // Let the scene fully settle (rotation, lighting etc.).
  await page.waitForTimeout(3000);

  await page.evaluate(
    ({ mode, angle }) => {
      window.portfolio.ui.hide();
      window.portfolio.earth.rotationSpeed(0);
      window.portfolio.earth.textureMode(mode);
      window.portfolio.earth.moonAngle(angle);
    },
    { mode: textureMode, angle: MOON_ANGLE },
  );

  // NASA mode fetches four webp files; give them time to decode and upload.
  await page.waitForTimeout(textureMode === 'nasa' ? 5000 : 1000);

  const path = resolve(DIR, screenshotName);
  await page.screenshot({ path, ...(CROP ? { clip: CROP } : {}) });
  console.log(`Saved (${textureMode}): ${path}`);

  await ctx.close();
}

await probe('procedural', 'moon-probe-procedural.png');
await probe('nasa',       'moon-probe-nasa.png');

if (errors.length) {
  console.log('\nPage errors:');
  for (const e of errors) console.log(' ', e);
}

await browser.close();
console.log('\nDone. NASA mode moon should show lunar surface detail; procedural = uniform grey.');
