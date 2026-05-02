// Probe for Bug 1: portfolio.bg.global.config(...) changes should update
// visuals live without a page reload.
//
// Validates the full call chain:
//   config() → registry.setBgGlobal → setBackgroundSet → currentState mutated
//   → useFrame reads new value → uniform mutated → Three.js renders change
//
// Checks:
//   1. Store probe log: "[bg-config] setBackgroundSet global ..."
//   2. Frame pickup log: "[SharedStarField useFrame] nebulaBrightness changed: ..."
//   3. Before/after screenshots show a visible brightness difference

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

// Use the contact scene — minimal foreground elements, darker CSS background,
// nebula/stars are the primary visual. Navigate via hash scroll after load.
const url = 'http://localhost:5173/en/';
console.log(`\nNavigating to ${url}…`);
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
// Wait for canvas + frame loop to stabilise, then scroll to contact
await page.waitForTimeout(2000);
await page.evaluate(() => document.getElementById('contact')?.scrollIntoView({ behavior: 'instant' }));
await page.waitForTimeout(2000);

const baselineMessageCount = messages.length;

// Read initial state
const initial = await page.evaluate(() => {
  const p = window.portfolio;
  if (!p?.bg?.global?.config) return null;
  return p.bg.global.config();
});
console.log('INITIAL_STATE', JSON.stringify(initial));

// --- Test 1: starBrightness (particle opacity — pure WebGL, no CSS ambiguity) ---
// Reset to a known baseline first
await page.evaluate(() => window.portfolio.bg.reset());
await page.waitForTimeout(400);

await page.screenshot({ path: resolve(screenshotsDir, 'bg-config-before.png'), fullPage: false });
console.log('Screenshot saved: bg-config-before.png (default starBrightness)');

// Stars off — should visibly remove particles
await page.evaluate(() => window.portfolio.bg.global.config({ starBrightness: 0 }));
await page.waitForTimeout(400);
await page.screenshot({ path: resolve(screenshotsDir, 'bg-config-stars-off.png'), fullPage: false });
console.log('Screenshot saved: bg-config-stars-off.png (starBrightness=0)');

// Stars at max
await page.evaluate(() => window.portfolio.bg.global.config({ starBrightness: 5 }));
await page.waitForTimeout(400);
await page.screenshot({ path: resolve(screenshotsDir, 'bg-config-stars-max.png'), fullPage: false });
console.log('Screenshot saved: bg-config-stars-max.png (starBrightness=5)');

// --- Test 2: nebulaBrightness (shader uniform) ---
await page.evaluate(() => window.portfolio.bg.reset());
await page.waitForTimeout(400);

await page.evaluate(() => window.portfolio.bg.global.config({ nebulaBrightness: 0, nebulaSaturation: 0 }));
await page.waitForTimeout(400);
await page.screenshot({ path: resolve(screenshotsDir, 'bg-config-nebula-off.png'), fullPage: false });
console.log('Screenshot saved: bg-config-nebula-off.png (nebulaBrightness=0)');

await page.evaluate(() => window.portfolio.bg.global.config({ nebulaBrightness: 3, nebulaSaturation: 3 }));
await page.waitForTimeout(400);
await page.screenshot({ path: resolve(screenshotsDir, 'bg-config-nebula-max.png'), fullPage: false });
console.log('Screenshot saved: bg-config-nebula-max.png (nebulaBrightness=3)');

// Reset
await page.evaluate(() => window.portfolio.bg.reset());
await page.waitForTimeout(300);

// Collect relevant log window
const afterDark = await page.evaluate(() => window.portfolio.bg.global.config());
console.log('STATE_AFTER_RESET', JSON.stringify(afterDark));

// --- Analyse probe logs ---
const newMessages = messages.slice(baselineMessageCount);

const storeProbe = newMessages.filter((m) => m.includes('[bg-config] setBackgroundSet'));
const frameProbe = newMessages.filter((m) => m.includes('[SharedStarField useFrame]'));
const warnings = newMessages.filter((m) => m.startsWith('[warning]') || m.startsWith('[error]') || m.includes('[pageerror]'));

console.log('\n=== PROBE RESULTS ===');
console.log(`Store probe logs (${storeProbe.length}):`);
storeProbe.forEach((m) => console.log('  ', m));

console.log(`\nFrame pickup logs (${frameProbe.length}):`);
frameProbe.forEach((m) => console.log('  ', m));

if (warnings.length) {
  console.log(`\nWarnings/errors (${warnings.length}):`);
  warnings.forEach((m) => console.log('  ', m));
}

const storeOk = storeProbe.length >= 2; // called for dark + bright
const frameOk = frameProbe.length >= 2; // picked up both changes

console.log('\n=== VERDICT ===');
console.log('Store mutation reaching currentState:', storeOk ? 'PASS ✓' : 'FAIL ✗');
console.log('useFrame reading updated value:       ', frameOk ? 'PASS ✓' : 'FAIL ✗');
if (storeOk && frameOk) {
  console.log('\nFull call chain is working. Check before/after screenshots for visual diff.');
} else if (storeOk && !frameOk) {
  console.log('\nuseFrame is NOT picking up the store change. Likely cause: frame loop not running, stale closure, or wrong store reference in SharedStarField.');
} else if (!storeOk) {
  console.log('\nStore not being mutated. Likely cause: registry.setBgGlobal not wired (DevConsoleBridge not mounted), or config() call not reaching setBackgroundSet.');
}

await browser.close();
