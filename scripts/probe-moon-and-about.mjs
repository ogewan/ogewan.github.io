// Probe for Changes 3 and 4 (refined):
//   3) Moon orbits earth, locked to earth.rotation.y + UTC-derived offset.
//      Orbit advances at the auto-rotation rate (default 0.025 rad/s ≈ 4
//      minutes per orbit). Earth's umbra darkens the moon when it crosses
//      the anti-sun side.
//   4) Home → About is a smooth camera pull-back from z=4 to z=12 (same
//      lookAt as Earth). Reverse zooms back in.
//
// To make the moon visible during the probe we leave auto-rotation ON and
// crank the rotation rate so the moon completes a visible arc within the
// probe's runtime.

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const screenshotsDir = resolve(process.cwd(), '.screenshots');
mkdirSync(screenshotsDir, { recursive: true });

const PREFIX = 'moon-about';

const browser = await chromium.launch({ headless: true });
// Simulate OS reduced-motion so we can verify the camera tween still smooths
// over its full 1200ms (hard-coded in CameraDriver) regardless of the
// reduced-motion CSS-token collapse.
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  reducedMotion: 'reduce',
});
const page = await ctx.newPage();
const messages = [];
page.on('console', (msg) => messages.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => messages.push(`[pageerror] ${err.message}`));

console.log('navigating http://localhost:5173/en/');
await page.goto('http://localhost:5173/en/', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2500);

const utc = await page.evaluate(() => new Date().toISOString());
console.log('UTC at probe', utc);

// Crank rotation speed so the moon orbits visibly during the probe. Hide UI
// for clean shots.
await page.evaluate(() => {
  window.portfolio.earth.rotationSpeed(0.6); // ~10s per orbit at this rate
  window.portfolio.ui.hide();
});
await page.waitForTimeout(500);

// --- Moon orbit sequence (Home view). 12 frames over 12s ≈ 1.2 orbits. ---
const ORBIT_FRAMES = 12;
const FRAME_INTERVAL_MS = 1000;
for (let i = 0; i < ORBIT_FRAMES; i++) {
  await page.waitForTimeout(FRAME_INTERVAL_MS);
  const path = resolve(screenshotsDir, `${PREFIX}-orbit-${String(i).padStart(2, '0')}.png`);
  await page.screenshot({ path });
  console.log(`ORBIT frame ${i} → ${path}`);
}

// Halt rotation for the transition shots so any difference is purely camera.
// Re-show the UI: the active-scene observer relies on the data-scene sections
// having actual layout height; with ui.hide() they collapse to 0×0 and the
// IntersectionObserver has nothing to track.
await page.evaluate(() => {
  window.portfolio.earth.rotationSpeed(0);
  window.portfolio.ui.show();
});
await page.waitForTimeout(500);

// Snapshot the active scene + camera position via the React fiber. We dig
// into __reactFiber to find the camera (R3F doesn't expose it on window).
async function readSceneState(label) {
  const state = await page.evaluate(() => {
    const sectionEls = Array.from(document.querySelectorAll('[data-scene]'));
    const visibleScenes = sectionEls.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        scene: el.getAttribute('data-scene'),
        topY: Math.round(r.top),
        bottomY: Math.round(r.bottom),
      };
    });
    return {
      scrollY: window.scrollY,
      pathname: location.pathname,
      visibleScenes,
    };
  });
  console.log(`${label}`, JSON.stringify(state));
}

// --- Home → About transition ---
await page.evaluate(() => window.portfolio.go('home'));
await page.waitForTimeout(1500);
await readSceneState('STATE_AT_HOME');
await page.screenshot({ path: resolve(screenshotsDir, `${PREFIX}-home.png`) });

console.log('GO_ABOUT (smooth pull-back)');
await page.evaluate(() => window.portfolio.go('about'));
// Capture mid-tween snapshots at 600ms intervals to verify smoothness.
for (let i = 0; i < 5; i++) {
  await page.waitForTimeout(400);
  await page.screenshot({
    path: resolve(screenshotsDir, `${PREFIX}-home-to-about-${i}.png`),
  });
}
await readSceneState('STATE_AT_ABOUT');

console.log('GO_HOME (smooth zoom-in back)');
await page.evaluate(() => window.portfolio.go('home'));
for (let i = 0; i < 5; i++) {
  await page.waitForTimeout(400);
  await page.screenshot({
    path: resolve(screenshotsDir, `${PREFIX}-about-to-home-${i}.png`),
  });
}
await readSceneState('STATE_AT_HOME_AFTER');

// --- Continue forward to projects to confirm tween still reaches Z=-116 ---
console.log('GO_PROJECTS');
await page.evaluate(() => window.portfolio.go('projects'));
await page.waitForTimeout(1800);
await page.screenshot({ path: resolve(screenshotsDir, `${PREFIX}-projects.png`) });

console.log('CONSOLE_TAIL');
for (const m of messages.slice(-15)) console.log('  ', m);

await browser.close();
console.log('done');
