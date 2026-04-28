// Quick probe of the running R3F scene state. Inspect camera, earth group,
// city marker meshes — find out why the test earth looks so small.

import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
const messages = [];
page.on('console', (msg) => messages.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => messages.push(`[pageerror] ${err.message}`));

await page.goto('http://localhost:5173/en/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

// Turn on test mode and halt rotation, then probe.
await page.evaluate(() => {
  window.portfolio.earth.test(true);
  window.portfolio.earth.rotationSpeed(0);
});
await page.waitForTimeout(500);

// We can't get the R3F three state directly without a window-exposed handle.
// Instead screenshot a high-contrast probe: hide the UI and force quality mode.
await page.evaluate(() => {
  window.portfolio.ui.hide();
});
await page.waitForTimeout(300);
await page.screenshot({ path: '.screenshots/probe-scene-no-ui.png' });

// Get the canvas's actual dimensions and position.
const canvasInfo = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return { found: false };
  const rect = canvas.getBoundingClientRect();
  return {
    found: true,
    cssWidth: rect.width,
    cssHeight: rect.height,
    bufferWidth: canvas.width,
    bufferHeight: canvas.height,
    parentDataset: canvas.parentElement?.dataset,
    backdropOpacity: getComputedStyle(canvas.parentElement).opacity,
  };
});
console.log('CANVAS', JSON.stringify(canvasInfo, null, 2));

await browser.close();
