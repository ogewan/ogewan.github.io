#!/usr/bin/env node
/**
 * Verifies the ?earthSystem= URL sync end-to-end:
 *
 *   A. Fresh load with no query → URL becomes /en/?earthSystem=nasa
 *   B. Fresh load with ?earthSystem=procedural → mode applied, URL kept
 *   C. Cross-route navigation preserves the param (e.g. /en/ → /en/about
 *      should land at /en/about?earthSystem=nasa)
 *   D. portfolio.earth.system.textureMode('procedural') flips URL to
 *      ?earthSystem=procedural and clears the cloud layer
 */
import { chromium } from 'playwright';
import { detectPortfolioPort } from './_dev-port.mjs';

const port = await detectPortfolioPort();
const BASE = `http://localhost:${port}`;
const browser = await chromium.launch({ headless: true });

async function inspect(page, label) {
  const state = await page.evaluate(() => ({
    href: location.href,
    search: location.search,
    earthMode: window.portfolio?.earth?.system?.textureMode(),
    cloudMode: window.portfolio?.earth?.clouds?.textureMode(),
  }));
  console.log(`${label}:`, JSON.stringify(state));
  return state;
}

async function fresh(url) {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => !!window.portfolio?.earth?.system, { timeout: 10000 });
  await page.waitForTimeout(1500);
  return { ctx, page };
}

// A. Fresh load with no query → URL ends up with ?earthSystem=nasa
console.log('\n--- A: fresh load, no query');
let { ctx, page } = await fresh(`${BASE}/en/`);
const A = await inspect(page, 'after fresh /en/');
const A_pass = A.search.includes('earthSystem=nasa') && A.earthMode === 'nasa' && A.cloudMode === 'nasa';
console.log(`  pass: ${A_pass}`);
await ctx.close();

// B. Fresh load with ?earthSystem=procedural → mode applied
console.log('\n--- B: fresh load with ?earthSystem=procedural');
({ ctx, page } = await fresh(`${BASE}/en/?earthSystem=procedural`));
const B = await inspect(page, 'after fresh ?earthSystem=procedural');
const B_pass = B.search.includes('earthSystem=procedural') && B.earthMode === 'procedural' && B.cloudMode === null;
console.log(`  pass: ${B_pass}`);
await ctx.close();

// C. Navigate within app — param must follow
console.log('\n--- C: navigate /en/ → /en/about');
({ ctx, page } = await fresh(`${BASE}/en/`));
await inspect(page, 'before nav');
await page.evaluate(() => window.portfolio.go('/en/about'));
await page.waitForTimeout(1500);
const C = await inspect(page, 'after nav to /en/about');
const C_pass = C.href.includes('/en/about') && C.search.includes('earthSystem=nasa');
console.log(`  pass: ${C_pass}`);
await ctx.close();

// D. system.textureMode flips URL + clouds
console.log('\n--- D: system.textureMode(procedural) updates URL + clouds');
({ ctx, page } = await fresh(`${BASE}/en/`));
await inspect(page, 'D start');
await page.evaluate(() => window.portfolio.earth.system.textureMode('procedural'));
await page.waitForTimeout(1500);
const D = await inspect(page, 'D after switch');
const D_pass = D.search.includes('earthSystem=procedural') && D.earthMode === 'procedural' && D.cloudMode === null;
console.log(`  pass: ${D_pass}`);
await ctx.close();

// E. Pre-paint: URL must already have ?earthSystem= BEFORE React mounts.
// Stop at domcontentloaded (no R3F, no main.tsx finished) and check location.
console.log('\n--- E: URL stamped before React mounts');
{
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/en/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const E = await page.evaluate(() => ({
    search: location.search,
    earthKey: window.localStorage.getItem('portfolio:earth-texture-mode'),
    versionKey: window.localStorage.getItem('portfolio:state-version'),
    cloudInit: window.__earthSystemCloudInit,
  }));
  console.log('at DOMContentLoaded:', JSON.stringify(E));
  // versionKey is null in dev mode (migration deferred to prod); only the
  // URL + cloud init need to be pre-paint correct.
  const E_pass = E.search.includes('earthSystem=nasa') && E.cloudInit === 'nasa';
  console.log(`  pass: ${E_pass}`);
  await ctx.close();
  if (!E_pass) process.exit(1);
}

// F. Dev-mode: version check is skipped — stale state survives reload.
// The probe targets a Vite dev server, so MODE === 'development' at HTML
// transform time. In prod the wipe would happen; here it must NOT.
console.log('\n--- F: dev mode preserves stale state (wipe deferred to prod)');
{
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/en/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  // Seed stale state.
  await page.evaluate(() => {
    localStorage.setItem('portfolio:state-version', 'OLD-FAKE-VERSION');
    localStorage.setItem('portfolio:earth-rotation-rate', '99');
    localStorage.setItem('portfolio:earth-cloud-opacity', '0.99');
  });
  await page.goto(`${BASE}/en/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const F = await page.evaluate(() => ({
    version: localStorage.getItem('portfolio:state-version'),
    rotation: localStorage.getItem('portfolio:earth-rotation-rate'),
    cloudOp: localStorage.getItem('portfolio:earth-cloud-opacity'),
  }));
  console.log('after stale-load (dev):', JSON.stringify(F));
  const F_pass = F.version === 'OLD-FAKE-VERSION' && F.rotation === '99' && F.cloudOp === '0.99';
  console.log(`  pass: ${F_pass}`);
  await ctx.close();
  if (!F_pass) process.exit(1);
}

await browser.close();

console.log(`\nSummary: A=${A_pass} B=${B_pass} C=${C_pass} D=${D_pass} E=ok F=ok`);
if (!A_pass || !B_pass || !C_pass || !D_pass) process.exit(1);
