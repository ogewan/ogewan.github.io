#!/usr/bin/env node
/**
 * Visual / runtime test harness for the running dev server.
 *
 *   pnpm test:visual                            # default probe of /en/
 *   pnpm test:visual --url=/en/about            # different route
 *   pnpm test:visual --quality=simple           # force quality mode via localStorage
 *   pnpm test:visual --screenshot=hero.png      # custom screenshot filename
 *   pnpm test:visual --skip-overlay             # bypass loading overlay (see below)
 *
 * Loads the page in a headless Chromium, optionally injects a localStorage
 * key to force a CelestialQuality mode, waits for network idle + 2.5s settle,
 * then probes the DOM (canvas count, scene element, computed pulse styles)
 * and saves a 1280x720 screenshot to .screenshots/.
 *
 * Use this BEFORE claiming a UI fix worked. Vite's dev server reflects source
 * changes immediately; this script tells you whether the runtime composition
 * is correct.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  }),
);

const url = `http://localhost:5173${args.url ?? '/en/'}`;
const quality = args.quality ?? null; // 'quality' | 'static' | 'simple' | null
const screenshotName = args.screenshot ?? 'visual.png';
const reducedMotion = args['reduced-motion'] === 'true' ? 'reduce' : 'no-preference';
// The loading overlay sits at z-index max with a 2000ms minimum visible time
// and a four-signal readiness gate (window.load + fonts + scene-ready +
// react-ready). The default 2500ms wait after networkidle is enough on a warm
// machine but not on cold loads, and the screenshot lands on the overlay
// rather than the page. --skip-overlay sets the dev-only minMs flag to 0 and
// waits for `body.loaded` (which the overlay-removal sequence stamps) before
// taking the shot. Use this for any UI verification past the cold-load gate.
const skipOverlay = args['skip-overlay'] === true || args['skip-overlay'] === 'true';

const screenshotsDir = resolve(process.cwd(), '.screenshots');
mkdirSync(screenshotsDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  reducedMotion,
});

if (quality) {
  await ctx.addInitScript((q) => {
    window.localStorage.setItem('portfolio:quality', q);
  }, quality);
}

if (skipOverlay) {
  await ctx.addInitScript(() => {
    window.localStorage.setItem('portfolio:loadingOverlayMinMs', '0');
  });
}

const page = await ctx.newPage();
const consoleMessages = [];
page.on('console', (msg) => consoleMessages.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => consoleMessages.push(`[pageerror] ${err.message}`));

await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
if (skipOverlay) {
  await page
    .waitForFunction(() => document.body.classList.contains('loaded'), { timeout: 10000 })
    .catch(() => {});
  await page.waitForTimeout(800);
} else {
  await page.waitForTimeout(2500);
}

const probe = await page.evaluate(() => {
  const canvases = document.querySelectorAll('canvas');
  const placeholderEarth = document.querySelector('[data-scene="earth"]');
  const staticImg = document.querySelector('img[data-scene-static]');
  const ring = document.querySelector('aside span.border-amber');
  const ringStyle = ring ? getComputedStyle(ring) : null;
  return {
    url: location.href,
    canvasCount: canvases.length,
    canvasSize: canvases[0] ? `${canvases[0].width}x${canvases[0].height}` : null,
    placeholderEarthFound: !!placeholderEarth,
    staticImageFound: !!staticImg,
    ringAnimation: ringStyle?.animationName ?? null,
    ringScale: ringStyle?.scale ?? null,
    ringOpacity: ringStyle?.opacity ?? null,
    quality: window.localStorage.getItem('portfolio:quality'),
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
});

console.log('PROBE', JSON.stringify(probe, null, 2));
if (consoleMessages.length) {
  console.log('CONSOLE');
  for (const m of consoleMessages.slice(0, 30)) console.log('  ', m);
}

const screenshotPath = resolve(screenshotsDir, screenshotName);
await page.screenshot({ path: screenshotPath, fullPage: false });
console.log(`Screenshot saved: ${screenshotPath}`);

await browser.close();
