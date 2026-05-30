#!/usr/bin/env node
/**
 * Probes the three new cloud/sun controls:
 *   1. portfolio.earth.clouds.opacity(v)
 *   2. portfolio.earth.sunPosition(lat, lng)
 *   3. cloud fragment alpha now fades by lambert (night-side clouds disappear)
 *
 * Captures four shots into .screenshots/cloud-sun/ that should be visibly
 * distinct from each other:
 *   sun-east.png    — sun at (0, +90): right hemisphere lit
 *   sun-west.png    — sun at (0, -90): left hemisphere lit
 *   opacity-low.png — opacity 0.15, sun at (0, +90)
 *   opacity-high.png — opacity 0.85, sun at (0, +90)
 *
 * Each shot uses earth.moonFocus(false) + earth.show() so we see the full
 * earth, hides the moon focus controls, and pins moonAngle to keep the moon
 * out of frame above the earth.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { detectPortfolioPort } from './_dev-port.mjs';

const port = await detectPortfolioPort();
const BASE_URL = `http://localhost:${port}/en/about`;
const VIEWPORT = { width: 1920, height: 1080 };
const DIR = resolve(process.cwd(), '.screenshots', 'cloud-sun');
mkdirSync(DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function shot({ name, lat, lng, opacity }) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.waitForTimeout(2500);

  await page.evaluate(
    ({ lat, lng, opacity }) => {
      window.portfolio.ui.hide();
      window.portfolio.earth.rotationSpeed(0);
      window.portfolio.earth.textureMode('nasa');
      window.portfolio.earth.clouds.textureMode('nasa');
      window.portfolio.earth.clouds.opacity(opacity);
      window.portfolio.earth.sunPosition(lat, lng);
    },
    { lat, lng, opacity },
  );

  await page.waitForTimeout(4000);

  const state = await page.evaluate(() => ({
    sun: window.portfolio.earth.sunOverride(),
    opacity: window.portfolio.earth.clouds.opacity(),
    layers: window.portfolio.earth.clouds.layers().map((l) => l.url.split('/').pop()),
  }));
  console.log(`${name}:`, JSON.stringify(state));

  const path = resolve(DIR, `${name}.png`);
  await page.screenshot({ path });
  console.log(`  saved ${path}`);
  await ctx.close();
}

await shot({ name: 'sun-east', lat: 0, lng: 90, opacity: 0.45 });
await shot({ name: 'sun-west', lat: 0, lng: -90, opacity: 0.45 });
await shot({ name: 'opacity-low', lat: 0, lng: 90, opacity: 0.15 });
await shot({ name: 'opacity-high', lat: 0, lng: 90, opacity: 0.85 });

await browser.close();
console.log('\nDone.');
