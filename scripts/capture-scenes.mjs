#!/usr/bin/env node
/**
 * Capture each of the five celestial scenes to a PNG, committed as the
 * source for the `static` quality mode. Run when the dev server is up and
 * the celestial scenes look the way you want them captured.
 *
 *   pnpm capture:scenes
 *
 * Output: packages/celestial/src/screenshots/{earth,about,projects,contact,colophon}.png
 *
 * The capture forces `Quality` mode via localStorage so the R3F canvas is
 * what gets snapshotted (not the `simple` CSS fallback). Header / rail / page
 * chrome is hidden via injected CSS so the captures show only the celestial
 * backdrop — that's what the StaticBackdrop component will render via <img>.
 *
 * Re-run this whenever scenes meaningfully change (e.g. after each of the
 * 9.2-9.5 sub-phases lands real geometry). The filenames are stable, so
 * `static` mode picks up the new images automatically without code edits.
 *
 * Why PNG, not WebP: Playwright's screenshot API supports png|jpeg only; a
 * WebP encoder (sharp / @squoosh/lib) would add 30+ MB of dependencies for
 * five tiny mostly-black images. PNGs at 1920×1080 of celestial content
 * compress to ~80 KB each (~400 KB total committed); same ballpark as WebP.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const SCENES = [
  { name: 'earth', path: '/en/' },
  { name: 'about', path: '/en/about' },
  { name: 'projects', path: '/en/projects' },
  { name: 'contact', path: '/en/contact' },
  { name: 'colophon', path: '/en/colophon' },
];

const outDir = resolve(process.cwd(), 'packages/celestial/src/screenshots');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  reducedMotion: 'no-preference',
});
await ctx.addInitScript(() => {
  window.localStorage.setItem('portfolio:quality', 'quality');
});

const page = await ctx.newPage();
const hideChrome = `
  /* Hide everything except the celestial backdrop (z-0). The site shell is
     z-10. The backdrop's fixed inset-0 z-0 leaves it as the canvas-only
     full-bleed image we want to capture. */
  body > div > [class*="z-10"] { display: none !important; }
`;

for (const scene of SCENES) {
  await page.goto(`http://localhost:5173${scene.path}`, {
    waitUntil: 'networkidle',
    timeout: 30000,
  });
  // Re-inject CSS — navigations clear added styles.
  await page.addStyleTag({ content: hideChrome });
  // Wait for camera fly-through to settle (gsap is fixed at 1200ms; +1.5s slack).
  await page.waitForTimeout(2500);

  const out = resolve(outDir, `${scene.name}.png`);
  await page.screenshot({ path: out, type: 'png', fullPage: false });
  console.log(`  captured ${scene.name} → ${out}`);
}

await browser.close();
console.log('done.');
