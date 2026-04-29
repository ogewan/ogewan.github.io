// Verify clock markers + rotation. Captures with markers ON at three
// time points; the numerals should visibly rotate around the ring.

import { chromium } from 'playwright';

const PORT = process.env.PORT ?? '5178';
const BASE = `http://localhost:${PORT}`;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await ctx.newPage();
const log = [];
page.on('console', (msg) => log.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => log.push(`[pageerror] ${err.message}`));

await page.goto(`${BASE}/en/projects`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

await page.evaluate(() => {
  window.portfolio.quality('full');
});
await page.waitForTimeout(1500);

await page.evaluate(() => {
  window.portfolio.ui.hide();
  window.portfolio.rings.clock.show();
  // Crank rate so motion is unmistakable in screenshots taken ~1s apart.
  window.portfolio.rings.rotationSpeed(2);
});
await page.waitForTimeout(800);

const states = [];
for (let i = 0; i < 4; i++) {
  await page.screenshot({ path: `.screenshots/clock-rot-${i}.png` });
  states.push(`captured frame ${i}`);
  await page.waitForTimeout(800);
}
console.log('FRAMES', states.length);

// Verify the dev API surface.
const surface = await page.evaluate(() => ({
  ringsRate: window.portfolio.rings.rotationSpeed(),
  ringsClockOn: !!document.querySelector('canvas'),
  hasClockSubcommand:
    typeof window.portfolio.rings.clock?.show === 'function' &&
    typeof window.portfolio.rings.clock?.hide === 'function' &&
    typeof window.portfolio.rings.clock?.toggle === 'function',
}));
console.log('SURFACE', JSON.stringify(surface));

// Toggle off and capture once more.
await page.evaluate(() => window.portfolio.rings.clock.hide());
await page.waitForTimeout(500);
await page.screenshot({ path: '.screenshots/clock-off.png' });

// Restore default rate so we don't pollute persisted state.
await page.evaluate(() => window.portfolio.rings.rotationSpeed(0.02));

console.log('---LOG (last 20)---');
for (const line of log.slice(-20)) console.log(line);

await browser.close();
