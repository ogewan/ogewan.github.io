// Probe for the placeholder earth + city-lights work:
//   A) Declination sign fix — Northern Hemisphere cities should now read
//      bright on day side at northern-spring UTCs.
//   B) Placeholder textures — green continents on blue ocean, default
//      fallback when committed webps are stubs.
//   C) City dots — bright yellow on night side, dim red on day side.
//   D) Console toggle — portfolio.earth.placeholder(on/off) forces it.

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const screenshotsDir = resolve(process.cwd(), '.screenshots');
mkdirSync(screenshotsDir, { recursive: true });

const PREFIX = 'placeholder';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
const messages = [];
page.on('console', (msg) => messages.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => messages.push(`[pageerror] ${err.message}`));

console.log('navigating http://localhost:5173/en/');
await page.goto('http://localhost:5173/en/', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2500);

const utc = await page.evaluate(() => new Date().toISOString());
console.log('UTC at probe', utc);

// Halt rotation, hide UI for clean shots.
await page.evaluate(() => {
  window.portfolio.earth.rotationSpeed(0);
  window.portfolio.ui.hide();
});
await page.waitForTimeout(500);

// Verify portfolio.earth.placeholder exists.
const apiCheck = await page.evaluate(() => ({
  hasPlaceholder: typeof window.portfolio?.earth?.placeholder === 'function',
}));
console.log('API_CHECK', JSON.stringify(apiCheck));

// State 1: default (placeholder by virtue of stub webps), no focus.
await page.screenshot({ path: resolve(screenshotsDir, `${PREFIX}-default-no-focus.png`) });

async function clickCity(cityRegex) {
  return page.evaluate((pattern) => {
    const re = new RegExp(pattern, 'i');
    const btns = Array.from(document.querySelectorAll('aside button'));
    const btn = btns.find((b) => re.test(b.getAttribute('aria-label') ?? ''));
    if (!btn) return false;
    btn.click();
    return true;
  }, cityRegex);
}

async function focusAndShoot(city, screenshotName) {
  const clicked = await clickCity(city);
  await page.waitForTimeout(2400);
  await page.screenshot({ path: resolve(screenshotsDir, screenshotName) });
  console.log(`FOCUS ${city} clicked=${clicked} → ${screenshotName}`);
}

// State 2: focus a few cities under default mode (should look like the
// placeholder — green/blue map, no dots since neither test nor placeholder
// mode is forced and the rail dots are separate from the earth-dots).
await focusAndShoot('houston', `${PREFIX}-default-houston.png`);
await focusAndShoot('london', `${PREFIX}-default-london.png`);
await focusAndShoot('tokyo', `${PREFIX}-default-tokyo.png`);
await focusAndShoot('sydney', `${PREFIX}-default-sydney.png`);

// State 3: placeholder mode ON. City dots become visible (lambert-aware).
await page.evaluate(() => window.portfolio.earth.placeholder(true));
await page.waitForTimeout(500);
await page.screenshot({ path: resolve(screenshotsDir, `${PREFIX}-on-tokyo.png`) }); // tokyo still focused
await focusAndShoot('houston', `${PREFIX}-on-houston.png`);
await focusAndShoot('london', `${PREFIX}-on-london.png`);
await focusAndShoot('sydney', `${PREFIX}-on-sydney.png`);
await focusAndShoot('reykjavik', `${PREFIX}-on-reykjavik.png`);
await focusAndShoot('saint petersburg|st\\.? ?petersburg|stpetersburg', `${PREFIX}-on-stpetersburg.png`);

// State 4: placeholder OFF. Should fall back to whatever dayMap state holds
// (still placeholder since webps are stubs). Dots disappear.
await page.evaluate(() => window.portfolio.earth.placeholder(false));
await page.waitForTimeout(500);
await page.screenshot({ path: resolve(screenshotsDir, `${PREFIX}-toggled-off.png`) });

// State 5: persistence — placeholder ON, reload, confirm still on.
await page.evaluate(() => window.portfolio.earth.placeholder(true));
await page.waitForTimeout(300);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
const afterReload = await page.evaluate(() => {
  try {
    return window.localStorage.getItem('portfolio:earth-placeholder');
  } catch {
    return null;
  }
});
console.log('PERSIST_AFTER_RELOAD storage value:', afterReload);
await page.screenshot({ path: resolve(screenshotsDir, `${PREFIX}-after-reload.png`) });

// Cleanup: turn off so subsequent dev sessions start clean.
await page.evaluate(() => window.portfolio.earth.placeholder(false));

console.log('CONSOLE_TAIL');
for (const m of messages.slice(-15)) console.log('  ', m);

await browser.close();
console.log('done');
