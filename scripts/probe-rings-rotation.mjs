// Probe ring rotation: navigate to projects, capture before/after at
// different rotation speeds, log dev-command return values to verify the
// API plumbing.

import { chromium } from 'playwright';

const PORT = process.env.PORT ?? '5178';
const BASE = `http://localhost:${PORT}`;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await ctx.newPage();
const log = [];
page.on('console', (msg) => log.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => log.push(`[pageerror] ${err.message}`));

// Cold-load /en/projects directly so MainPage's cold-load scroll effect
// places us at the projects section before the IO has a chance to flip.
await page.goto(`${BASE}/en/projects`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
await page.evaluate(() => {
  window.portfolio.quality('full');
});
await page.waitForTimeout(1500);
// Now safe to hide UI — IO has already settled on projects.
await page.evaluate(() => {
  window.portfolio.ui.hide();
});
await page.waitForTimeout(500);

// Verify the dev command itself: read, write, read.
const initial = await page.evaluate(() => window.portfolio.rings.rotationSpeed());
console.log('INITIAL_RATE', initial);

await page.evaluate(() => window.portfolio.rings.rotationSpeed(2.0));
await page.waitForTimeout(300);

const afterSet = await page.evaluate(() => window.portfolio.rings.rotationSpeed());
console.log('AFTER_SET_RATE', afterSet);

// Capture frame 1, wait, capture frame 2 — at rate 2.0 the inner ring
// should orbit at 2.0/sqrt(7) = 0.756 rad/s (~43°/sec). Over 1.5 s
// that's ~65° — clearly visible motion if the time uniform reaches
// the shader.
await page.screenshot({ path: '.screenshots/rings-rot-fast-t0.png' });
await page.waitForTimeout(1500);
await page.screenshot({ path: '.screenshots/rings-rot-fast-t1.png' });

// Also halt and capture as control.
await page.evaluate(() => window.portfolio.rings.rotationSpeed(0));
await page.waitForTimeout(300);
const afterHalt = await page.evaluate(() => window.portfolio.rings.rotationSpeed());
console.log('AFTER_HALT_RATE', afterHalt);
await page.screenshot({ path: '.screenshots/rings-rot-halted.png' });

// Probe the canvas + scene for diagnostics.
const diag = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  return {
    canvasFound: !!canvas,
    cssSize: canvas
      ? `${canvas.getBoundingClientRect().width}x${canvas.getBoundingClientRect().height}`
      : null,
    bufferSize: canvas ? `${canvas.width}x${canvas.height}` : null,
    sceneAttr: document.querySelector('[data-scene]')?.getAttribute('data-scene') ?? null,
    activeSection: document.querySelector('[data-active-scene]')?.getAttribute('data-active-scene') ?? null,
  };
});
console.log('DIAG', JSON.stringify(diag));

console.log('---LOG---');
for (const line of log.slice(-40)) console.log(line);

await browser.close();
