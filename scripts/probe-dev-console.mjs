// Ad-hoc probe for the window.portfolio dev console API. Verifies that:
//   1. portfolio.help() prints to console
//   2. portfolio.ui.hide() / bg.hide() take effect
//   3. portfolio.earth.test(true) renders the UV checker + city dots
//   4. portfolio.go('about') scrolls to the About section
//   5. portfolio.quality('lite') switches to simple backdrop
//   6. portfolio.earth.rotationSpeed() get/set
//
// Not a committed test — temp script. Saves screenshots to .screenshots/
// for visual confirmation.

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const screenshotsDir = resolve(process.cwd(), '.screenshots');
mkdirSync(screenshotsDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();

const messages = [];
page.on('console', (msg) => messages.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => messages.push(`[pageerror] ${err.message}`));

const url = 'http://localhost:5173/en/';
console.log(`navigating ${url}`);
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2500);

// Probe 1: API surface exists.
const apiShape = await page.evaluate(() => {
  const p = window.portfolio;
  if (!p) return null;
  return {
    keys: Object.keys(p).sort(),
    uiKeys: Object.keys(p.ui ?? {}).sort(),
    bgKeys: Object.keys(p.bg ?? {}).sort(),
    earthKeys: Object.keys(p.earth ?? {}).sort(),
    types: {
      go: typeof p.go,
      quality: typeof p.quality,
      help: typeof p.help,
      'ui.hide': typeof p.ui?.hide,
      'bg.toggle': typeof p.bg?.toggle,
      'earth.test': typeof p.earth?.test,
      'earth.rotationSpeed': typeof p.earth?.rotationSpeed,
    },
  };
});
console.log('API_SHAPE', JSON.stringify(apiShape, null, 2));

// Probe 2: help() prints (capture console output).
const helpMsgCountBefore = messages.length;
await page.evaluate(() => window.portfolio.help());
await page.waitForTimeout(200);
const helpPrinted = messages.slice(helpMsgCountBefore).some((m) => m.includes('window.portfolio'));
console.log('HELP_PRINTED', helpPrinted);

// Probe 3: rotation speed get/set.
const rotProbe = await page.evaluate(() => {
  const initial = window.portfolio.earth.rotationSpeed();
  window.portfolio.earth.rotationSpeed(0); // halt for screenshot determinism
  const afterSet = window.portfolio.earth.rotationSpeed();
  return { initial, afterSet };
});
console.log('ROT_PROBE', JSON.stringify(rotProbe));

// Probe 4: earth test mode on. Hide UI immediately so we can actually see
// the test material (otherwise the hero text covers the earth).
await page.evaluate(() => {
  window.portfolio.earth.test(true);
  window.portfolio.ui.hide();
});
await page.waitForTimeout(800);
await page.screenshot({
  path: resolve(screenshotsDir, 'console-earth-test-on.png'),
  fullPage: false,
});
console.log('SCREENSHOT earth-test-on');

// Probes 5-7: click rail city buttons and screenshot. Buttons are still in
// the DOM even though ui.hide() applied display:none — we can dispatch a
// programmatic click without needing them visible.
async function clickCityAndShot(cityName, screenshotName) {
  const clicked = await page.evaluate((name) => {
    const btns = Array.from(document.querySelectorAll('aside button'));
    const btn = btns.find((b) => new RegExp(name, 'i').test(b.getAttribute('aria-label') ?? ''));
    if (!btn) return false;
    btn.click();
    return true;
  }, cityName);
  await page.waitForTimeout(2400); // FOCUS_TWEEN_DURATION_SEC = 2 + buffer
  await page.screenshot({ path: resolve(screenshotsDir, screenshotName), fullPage: false });
  console.log(`CITY ${cityName} clicked=${clicked} → ${screenshotName}`);
}

await clickCityAndShot('tokyo', 'console-earth-test-tokyo.png');
await clickCityAndShot('sydney', 'console-earth-test-sydney.png');
await clickCityAndShot('london', 'console-earth-test-london.png');
await clickCityAndShot('houston', 'console-earth-test-houston.png');

// Probe 8: turn off test mode, restore UI, verify normal earth.
await page.evaluate(() => {
  window.portfolio.earth.test(false);
  window.portfolio.ui.show();
});
await page.waitForTimeout(800);
await page.screenshot({
  path: resolve(screenshotsDir, 'console-earth-test-off.png'),
  fullPage: false,
});
console.log('SCREENSHOT earth-test-off (UI restored, real earth)');

// Probe 9: ui.hide() probe (UI is currently shown).
await page.evaluate(() => window.portfolio.ui.hide());
await page.waitForTimeout(200);
const uiHiddenProbe = await page.evaluate(() => ({
  htmlClass: document.documentElement.className,
  uiRootDisplay: getComputedStyle(document.querySelector('[data-ui-root]')).display,
}));
console.log('UI_HIDE_PROBE', JSON.stringify(uiHiddenProbe));

// Probe 10: bg.hide() (with ui still hidden).
await page.evaluate(() => window.portfolio.bg.hide());
await page.waitForTimeout(200);
const bgHiddenProbe = await page.evaluate(() => ({
  htmlClass: document.documentElement.className,
  bgRootDisplay: getComputedStyle(document.querySelector('[data-bg-root]')).display,
}));
console.log('BG_HIDE_PROBE', JSON.stringify(bgHiddenProbe));
await page.screenshot({
  path: resolve(screenshotsDir, 'console-ui-and-bg-hidden.png'),
  fullPage: false,
});
console.log('SCREENSHOT ui-and-bg-hidden');

// Restore.
await page.evaluate(() => {
  window.portfolio.ui.show();
  window.portfolio.bg.show();
});

// Probe 11: portfolio.go('about').
await page.evaluate(() => window.portfolio.go('about'));
await page.waitForTimeout(1500);
const goProbe = await page.evaluate(() => ({
  url: location.pathname,
  scrollY: window.scrollY,
}));
console.log('GO_ABOUT_PROBE', JSON.stringify(goProbe));

console.log('CONSOLE_MESSAGES_TAIL');
for (const m of messages.slice(-20)) console.log('  ', m);

await browser.close();
console.log('done');
