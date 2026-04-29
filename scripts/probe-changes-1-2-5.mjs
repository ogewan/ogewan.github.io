// Probe for Changes 1, 2, 5:
//   1) Day/night terminator: focusing different cities should now show
//      illumination consistent with each city's actual local time.
//   2) Cities: Reykjavik + Saint Petersburg replace Paris + Frankfurt.
//   5) useVisitorLocation: timezone fallback when geolocation is denied;
//      no network call to ipapi.co.
//
// Captures all screenshots at once, then prints findings.

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const screenshotsDir = resolve(process.cwd(), '.screenshots');
mkdirSync(screenshotsDir, { recursive: true });

const PREFIX = 'change-1-2-5';

const browser = await chromium.launch({ headless: true });

// Block any third-party fetch to ipapi.co so Change 5 is verifiable: if the
// new hook still tried to call ipapi, the request would be visible in
// `ipapiCalls`. We also record the URL to confirm zero hits.
const ipapiCalls = [];

async function newPageWithBlocks(opts = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    timezoneId: opts.timezoneId ?? 'Europe/London',
    geolocation: opts.geolocation, // undefined = not permitted
    permissions: opts.permissions ?? [],
  });
  const page = await ctx.newPage();
  await page.route('**/ipapi.co/**', (route) => {
    ipapiCalls.push(route.request().url());
    return route.abort();
  });
  return page;
}

const messages = [];
function attachConsole(page, label) {
  page.on('console', (msg) => messages.push(`[${label}][${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => messages.push(`[${label}][pageerror] ${err.message}`));
}

// ----- Run 1: Earth scene + city focus screenshots (Changes 1 + 2) -----
{
  const page = await newPageWithBlocks();
  attachConsole(page, 'earth');

  console.log('navigating http://localhost:5173/en/');
  await page.goto('http://localhost:5173/en/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);

  // What UTC are we testing at? Stamp it in console output for interpretation.
  const utc = await page.evaluate(() => new Date().toISOString());
  console.log('UTC at probe', utc);

  // Halt rotation, enable test mode (city dots), hide UI for clean shots.
  await page.evaluate(() => {
    window.portfolio.earth.rotationSpeed(0);
    window.portfolio.earth.test(true);
    window.portfolio.ui.hide();
  });
  await page.waitForTimeout(800);

  // Capture canonical cities list to verify the swap.
  const citiesShape = await page.evaluate(() => {
    const aside = document.querySelector('aside');
    if (!aside) return null;
    return Array.from(aside.querySelectorAll('button'))
      .map((b) => b.getAttribute('aria-label'))
      .filter(Boolean);
  });
  console.log('RAIL_CITY_LABELS', JSON.stringify(citiesShape));

  // Base shot (no focus).
  await page.screenshot({ path: resolve(screenshotsDir, `${PREFIX}-base.png`) });

  // Focus each canonical city in turn. Cities of interest for the day/night
  // verification: London (Greenwich), Houston (CST), Reykjavik (-22°W),
  // Saint Petersburg (+30°E), Tokyo (+140°E), Sydney (+151°E).
  async function clickCityAndShot(cityRegex, screenshotName) {
    const clicked = await page.evaluate((pattern) => {
      const re = new RegExp(pattern, 'i');
      const btns = Array.from(document.querySelectorAll('aside button'));
      const btn = btns.find((b) => re.test(b.getAttribute('aria-label') ?? ''));
      if (!btn) return false;
      btn.click();
      return true;
    }, cityRegex);
    await page.waitForTimeout(2400); // FOCUS_TWEEN_DURATION_SEC = 2 + buffer
    await page.screenshot({ path: resolve(screenshotsDir, screenshotName) });
    console.log(`CITY ${cityRegex} clicked=${clicked} → ${screenshotName}`);
  }

  await clickCityAndShot('houston', `${PREFIX}-houston.png`);
  await clickCityAndShot('london', `${PREFIX}-london.png`);
  await clickCityAndShot('reykjavik', `${PREFIX}-reykjavik.png`);
  await clickCityAndShot('saint petersburg|st\\.? ?petersburg|stpetersburg', `${PREFIX}-stpetersburg.png`);
  await clickCityAndShot('tokyo', `${PREFIX}-tokyo.png`);
  await clickCityAndShot('sydney', `${PREFIX}-sydney.png`);

  // Disable test mode and capture the real earth at the last focus.
  await page.evaluate(() => window.portfolio.earth.test(false));
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(screenshotsDir, `${PREFIX}-real-earth-after-focus.png`) });

  // Introspect the running shader uniform for a few cities. Reads sunDirection
  // and earth quaternion straight from the live R3F scene so we can confirm
  // the lambert-at-center math.
  async function introspectAfterFocus(cityRegex) {
    const clicked = await page.evaluate((pattern) => {
      const re = new RegExp(pattern, 'i');
      const btns = Array.from(document.querySelectorAll('aside button'));
      const btn = btns.find((b) => re.test(b.getAttribute('aria-label') ?? ''));
      if (!btn) return false;
      btn.click();
      return true;
    }, cityRegex);
    await page.waitForTimeout(2400);
    const probe = await page.evaluate(() => window.__earthDebug ?? { error: 'no __earthDebug' });
    console.log(`UNIFORM_AFTER ${cityRegex} clicked=${clicked}`, JSON.stringify(probe));
  }

  // Refocus cities and probe + screenshot.
  await introspectAfterFocus('houston');
  await page.screenshot({ path: resolve(screenshotsDir, `${PREFIX}-real-houston.png`) });
  await introspectAfterFocus('london');
  await page.screenshot({ path: resolve(screenshotsDir, `${PREFIX}-real-london.png`) });
  await introspectAfterFocus('tokyo');
  await page.screenshot({ path: resolve(screenshotsDir, `${PREFIX}-real-tokyo.png`) });

  await page.context().close();
}

// ----- Run 2: useVisitorLocation — geolocation ALLOWED (Change 5) -----
{
  const page = await newPageWithBlocks({
    timezoneId: 'Europe/London',
    geolocation: { latitude: 51.5072, longitude: -0.1276 }, // London
    permissions: ['geolocation'],
  });
  attachConsole(page, 'geo-allowed');

  // Clear cache so the hook actually runs.
  await page.addInitScript(() => {
    try {
      sessionStorage.removeItem('portfolio:visitor-location');
    } catch (e) {
      void e;
    }
  });

  console.log('GEO_ALLOWED: navigate');
  await page.goto('http://localhost:5173/en/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000); // hook resolves async

  const geoAllowedState = await page.evaluate(() => {
    try {
      const raw = sessionStorage.getItem('portfolio:visitor-location');
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return { error: String(e) }; }
  });
  console.log('GEO_ALLOWED_CACHE', JSON.stringify(geoAllowedState, null, 2));

  await page.screenshot({ path: resolve(screenshotsDir, `${PREFIX}-geo-allowed.png`) });
  await page.context().close();
}

// ----- Run 3: useVisitorLocation — geolocation DENIED, tz=Europe/London -----
{
  const page = await newPageWithBlocks({
    timezoneId: 'Europe/London',
    permissions: [], // denied
  });
  attachConsole(page, 'geo-denied-london');

  await page.addInitScript(() => {
    try {
      sessionStorage.removeItem('portfolio:visitor-location');
    } catch (e) {
      void e;
    }
  });

  console.log('GEO_DENIED_LONDON: navigate');
  await page.goto('http://localhost:5173/en/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(6000); // 5s geolocation timeout + slack

  const geoDeniedState = await page.evaluate(() => {
    try {
      const raw = sessionStorage.getItem('portfolio:visitor-location');
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return { error: String(e) }; }
  });
  console.log('GEO_DENIED_LONDON_CACHE', JSON.stringify(geoDeniedState, null, 2));

  await page.context().close();
}

// ----- Run 4: useVisitorLocation — geolocation DENIED, unmapped tz -----
{
  const page = await newPageWithBlocks({
    timezoneId: 'Africa/Lagos',
    permissions: [],
  });
  attachConsole(page, 'geo-denied-unmapped');

  await page.addInitScript(() => {
    try {
      sessionStorage.removeItem('portfolio:visitor-location');
    } catch (e) {
      void e;
    }
  });

  console.log('GEO_DENIED_UNMAPPED: navigate');
  await page.goto('http://localhost:5173/en/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(6000);

  const failedState = await page.evaluate(() => {
    try {
      const raw = sessionStorage.getItem('portfolio:visitor-location');
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return { error: String(e) }; }
  });
  console.log('GEO_DENIED_UNMAPPED_CACHE', JSON.stringify(failedState, null, 2));

  await page.context().close();
}

console.log('IPAPI_CALL_COUNT', ipapiCalls.length);
console.log('IPAPI_CALLS', JSON.stringify(ipapiCalls));

console.log('CONSOLE_TAIL');
for (const m of messages.slice(-30)) console.log('  ', m);

await browser.close();
console.log('done');
