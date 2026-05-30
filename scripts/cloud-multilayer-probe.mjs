#!/usr/bin/env node
/**
 * Cloud multi-layer probe — captures the earth/clouds composite in both
 * cloud texture modes and reads portfolio.earth.clouds.layers() to verify
 * the runtime pick. Until the user drops cloud-NN.webp files under
 * packages/celestial/src/textures/clouds/, the layers() snapshot will be
 * empty and no cloud spheres should render in NASA mode.
 *
 *   node scripts/cloud-multilayer-probe.mjs
 *
 * Auto-detects the dev server port. Saves to .screenshots/cloud-multilayer/.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { detectPortfolioPort } from './_dev-port.mjs';

const port = await detectPortfolioPort();
const BASE_URL = `http://localhost:${port}/en/about`;
const VIEWPORT = { width: 1920, height: 1080 };
const DIR = resolve(process.cwd(), '.screenshots', 'cloud-multilayer');
mkdirSync(DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const allWarnings = [];

async function probe(cloudMode, screenshotName) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  page.on('console', (msg) => {
    const t = msg.text();
    if (t.toLowerCase().includes('cloud') || t.includes('webp') || t.includes('celestial')) {
      allWarnings.push(`[${msg.type()}] ${t}`);
    }
  });
  const fetchedCloudUrls = [];
  page.on('response', (res) => {
    const u = res.url();
    if (u.includes('/clouds/') && u.endsWith('.webp')) {
      fetchedCloudUrls.push(`${res.status()} ${u}`);
    }
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.waitForTimeout(3000);

  await page.evaluate((mode) => {
    window.portfolio.ui.hide();
    window.portfolio.earth.rotationSpeed(0);
    window.portfolio.earth.textureMode('nasa');
    window.portfolio.earth.clouds.textureMode(mode);
  }, cloudMode);

  await page.waitForTimeout(cloudMode === 'nasa' ? 4000 : 1000);

  const probeOut = await page.evaluate(() => {
    // Try multiple paths to reach the R3F scene.
    const canvas = document.querySelector('canvas');
    const allMeshes = [];
    const cloudCandidates = [];
    // r3f attaches a __r3f field with `root` (Root) containing fiber+three state
    const r3f = canvas?.__r3f;
    let scene = null;
    if (r3f?.root?.getState) scene = r3f.root.getState().scene;
    else if (r3f?.scene) scene = r3f.scene;
    if (scene) {
      scene.traverse((o) => {
        if (!o.isMesh) return;
        const r = o.geometry?.parameters?.radius;
        allMeshes.push({ radius: r ?? null, type: o.material?.type });
        if (o.material?.uniforms?.cloudMap) {
          const t = o.material.uniforms.cloudMap.value;
          cloudCandidates.push({
            visible: o.visible,
            radius: r ?? null,
            rotationY: +o.rotation.y.toFixed(4),
            cloudMapHasImage: !!t?.image,
            cloudMapW: t?.image?.width ?? null,
          });
        }
      });
    }
    return {
      cloudMode: window.portfolio.earth.clouds.textureMode(),
      layers: window.portfolio.earth.clouds.layers(),
      sceneFound: !!scene,
      allMeshCount: allMeshes.length,
      allMeshRadii: allMeshes.map((m) => m.radius).slice(0, 30),
      cloudCandidates,
      canvasCount: document.querySelectorAll('canvas').length,
      directRefs: (window.__cloudLayerRefs ?? []).map((r) => {
        const m = r.current;
        if (!m) return { mounted: false };
        const t = m.material?.uniforms?.cloudMap?.value;
        return {
          mounted: true,
          visible: m.visible,
          rotationY: +m.rotation.y.toFixed(4),
          parentVisible: m.parent?.visible,
          hasTexture: !!t,
          textureHasImage: !!t?.image,
          textureWidth: t?.image?.width ?? null,
        };
      }),
    };
  });
  console.log(`PROBE (${cloudMode}):`, JSON.stringify(probeOut, null, 2));

  const path = resolve(DIR, screenshotName);
  await page.screenshot({ path });
  console.log(`Saved: ${path}`);
  if (fetchedCloudUrls.length) {
    console.log(`Network: cloud fetches in ${cloudMode} mode:`);
    for (const u of fetchedCloudUrls) console.log(`  ${u}`);
  } else {
    console.log(`Network: NO cloud-webp fetches in ${cloudMode} mode`);
  }

  await ctx.close();
}

await probe(null, 'no-clouds.png');
await probe('nasa', 'nasa-mode.png');

if (allWarnings.length) {
  console.log('\nCloud-related console messages:');
  for (const w of allWarnings) console.log(' ', w);
}
if (errors.length) {
  console.log('\nPage errors:');
  for (const e of errors) console.log(' ', e);
}

await browser.close();
console.log('\nDone.');
