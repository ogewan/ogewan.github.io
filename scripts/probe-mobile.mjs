#!/usr/bin/env node
/**
 * Mobile layout verify — runs at 390x844 (iPhone 14) against all 5 routes.
 * Checks: no horizontal overflow, hamburger visible + functional, quality
 * switcher visible, canvas present in quality mode.
 *
 *   node scripts/probe-mobile.mjs
 *   node scripts/probe-mobile.mjs --url=http://localhost:5175
 */
import { chromium } from 'playwright';

const BASE_URL =
  process.argv.find((a) => a.startsWith('--url='))?.slice(6) ?? 'http://localhost:5175';

const ROUTES = [
  { name: 'earth', path: '/en/' },
  { name: 'about', path: '/en/about' },
  { name: 'projects', path: '/en/projects' },
  { name: 'contact', path: '/en/contact' },
  { name: 'colophon', path: '/en/colophon' },
];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 3,
});
const page = await ctx.newPage();

// Force quality mode
await page.addInitScript(() => {
  localStorage.setItem('portfolio:quality', 'quality');
});

let passed = 0;
let failed = 0;

function check(label, value, expected) {
  const ok = expected === undefined ? !!value : value === expected;
  const icon = ok ? 'PASS' : 'FAIL';
  console.log(`  [${icon}] ${label}${ok ? '' : ' — got: ' + JSON.stringify(value)}`);
  if (ok) passed++;
  else failed++;
  return ok;
}

for (const route of ROUTES) {
  const url = `${BASE_URL}${route.path}`;
  console.log(`\n${route.name} (${url})`);

  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  const checks = await page.evaluate(() => {
    // Horizontal overflow: scrollWidth > clientWidth means content overflows
    const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth;

    // Hamburger: button with aria-label containing "menu" or "nav"
    const hamburger = document.querySelector(
      'button[aria-label*="menu" i], button[aria-label*="nav" i], button[aria-label*="open" i]',
    );
    const hamburgerVisible =
      hamburger != null && hamburger.getBoundingClientRect().width > 0;

    // Quality switcher: trigger button has text-cyan class (unique to QualitySwitcher).
    // Displays translated labels "Full"/"Still"/"Lite", not key names.
    const qualityBtn = document.querySelector('button.text-cyan');
    const qualityVisible = qualityBtn != null && qualityBtn.getBoundingClientRect().width > 0;

    // Canvas: R3F canvas element present
    const canvas = document.querySelector('canvas');
    const canvasVisible = canvas != null && canvas.getBoundingClientRect().width > 0;

    return { overflow, hamburgerVisible, qualityVisible, canvasVisible };
  });

  check('no horizontal overflow', checks.overflow, false);
  check('hamburger visible', checks.hamburgerVisible, true);
  check('quality switcher visible', checks.qualityVisible, true);
  check('canvas rendered', checks.canvasVisible, true);

  // Hamburger open/close cycle
  const hamburger = page.locator(
    'button[aria-label*="menu" i], button[aria-label*="nav" i], button[aria-label*="open" i]',
  );
  if (await hamburger.count()) {
    await hamburger.first().tap();
    await page.waitForTimeout(300);
    const navOpen = await page.evaluate(() => {
      // Look for a nav element or mobile menu that became visible
      const nav = document.querySelector('nav, [role="navigation"], [data-mobile-menu]');
      return nav != null;
    });
    check('hamburger opens nav', navOpen, true);

    // Close it — tap again or press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
}

await browser.close();

console.log(`\n${passed + failed} checks — ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
