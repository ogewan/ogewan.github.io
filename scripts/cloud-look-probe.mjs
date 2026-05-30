#!/usr/bin/env node
/**
 * Probes the new cloud-look knobs against the rewritten cloud shader (fbm
 * coverage mask + detail erosion + silver-lining + brightness/contrast).
 *
 * Captures into .screenshots/cloud-look/:
 *   defaults.png     — out-of-the-box look (brightness 1.6, contrast 1.3, coverage 0.4)
 *   bright.png       — brightness 2.5 (peak day-side cloud)
 *   dense.png        — coverage 0.15 (low threshold → dense overcast)
 *   broken.png       — coverage 0.6, contrast 2.0 (broken patchy field)
 *   silver-lining.png — sun behind earth so day-side rim shows forward scatter
 *
 * Each shot pins the sun via portfolio.earth.sunPosition() so the lit
 * hemisphere is consistently framed.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { detectPortfolioPort } from './_dev-port.mjs';

const port = await detectPortfolioPort();
const BASE_URL = `http://localhost:${port}/en/`;
const VIEWPORT = { width: 1280, height: 1280 };
const DIR = resolve(process.cwd(), '.screenshots', 'cloud-look');
mkdirSync(DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function shot({ name, sun, brightness, contrast, coverage, opacity }) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.waitForTimeout(2500);

  await page.evaluate(
    ({ sun, brightness, contrast, coverage, opacity }) => {
      const p = window.portfolio;
      p.ui.hide();
      p.earth.rotationSpeed(0);
      p.earth.textureMode('nasa');
      p.earth.clouds.textureMode('nasa');
      p.earth.clouds.opacity(opacity);
      p.earth.clouds.brightness(brightness);
      p.earth.clouds.contrast(contrast);
      p.earth.clouds.coverage(coverage);
      p.earth.sunPosition(sun[0], sun[1]);
    },
    { sun, brightness, contrast, coverage, opacity },
  );

  await page.waitForTimeout(4000);

  const state = await page.evaluate(() => ({
    opacity: window.portfolio.earth.clouds.opacity(),
    brightness: window.portfolio.earth.clouds.brightness(),
    contrast: window.portfolio.earth.clouds.contrast(),
    coverage: window.portfolio.earth.clouds.coverage(),
    sun: window.portfolio.earth.sunOverride(),
    layers: window.portfolio.earth.clouds.layers().length,
  }));
  console.log(`${name}:`, JSON.stringify(state));

  const path = resolve(DIR, `${name}.png`);
  await page.screenshot({ path });
  console.log(`  ${path}`);
  await ctx.close();
}

// Sun south-of-center keeps the day-side hemisphere oriented toward the
// camera in the about-scene framing.
const DAYLIGHT = [0, -30];
const BEHIND = [0, 150];

await shot({ name: 'defaults', sun: DAYLIGHT, brightness: 1.6, contrast: 1.3, coverage: 0.4, opacity: 0.45 });
await shot({ name: 'bright', sun: DAYLIGHT, brightness: 2.5, contrast: 1.3, coverage: 0.4, opacity: 0.55 });
await shot({ name: 'dense', sun: DAYLIGHT, brightness: 1.6, contrast: 1.3, coverage: 0.15, opacity: 0.6 });
await shot({ name: 'broken', sun: DAYLIGHT, brightness: 1.6, contrast: 2.0, coverage: 0.6, opacity: 0.6 });
await shot({ name: 'silver-lining', sun: BEHIND, brightness: 1.6, contrast: 1.3, coverage: 0.4, opacity: 0.55 });

await browser.close();
console.log('\nDone.');
