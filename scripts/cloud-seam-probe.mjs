#!/usr/bin/env node
/**
 * Targets the cloud-noise seam at the equirectangular wrap (lng=±180).
 * Sweeps the sun across four longitudes so each pass lights a different
 * hemisphere of the cloud sphere. The pre-fix 2D-fbm shader showed a vertical
 * seam wherever the wrap was visible; the 3D-fbm (sampled by vWorldPos) should
 * be seamless in all four shots.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { detectPortfolioPort } from './_dev-port.mjs';

const port = await detectPortfolioPort();
const BASE_URL = `http://localhost:${port}/en/`;
const VIEWPORT = { width: 1280, height: 1280 };
const DIR = resolve(process.cwd(), '.screenshots', 'cloud-seam');
mkdirSync(DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function shot(name, lng) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.waitForTimeout(2500);

  await page.evaluate((lng) => {
    const p = window.portfolio;
    p.ui.hide();
    p.earth.rotationSpeed(0);
    p.earth.textureMode('nasa');
    p.earth.clouds.textureMode('nasa');
    p.earth.sunPosition(0, lng);
  }, lng);

  await page.waitForTimeout(4000);
  const path = resolve(DIR, `${name}.png`);
  await page.screenshot({ path });
  console.log(`lng=${lng}: ${path}`);
  await ctx.close();
}

await shot('lng-minus-90', -90);
await shot('lng-0', 0);
await shot('lng-90', 90);
await shot('lng-180', 180);

await browser.close();
console.log('\nDone.');
