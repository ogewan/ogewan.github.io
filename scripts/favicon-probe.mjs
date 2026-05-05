import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROUTES = [
  ['earth',    '/en/'],
  ['about',    '/en/about'],
  ['projects', '/en/projects'],
  ['contact',  '/en/contact'],
  ['colophon', '/en/colophon'],
];
const BASE = 'http://localhost:5173';
const DIR  = resolve(process.cwd(), '.screenshots');
mkdirSync(DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });

for (const [name, path] of ROUTES) {
  const ctx  = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Extract the favicon data URL from the <link rel="icon">
  const href = await page.evaluate(() => {
    const link = document.head.querySelector('link[rel="icon"]');
    return link ? link.getAttribute('href') : null;
  });

  if (href && href.startsWith('data:image/png')) {
    // Render the favicon at 4x zoom so we can actually see it
    const faviconImg = await page.evaluate(async (dataUrl) => {
      const img = new Image();
      img.src = dataUrl;
      await new Promise(r => { img.onload = r; });
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, 256, 256);
      return canvas.toDataURL('image/png');
    }, href);

    // Save the upscaled favicon as a PNG
    const base64 = faviconImg.replace('data:image/png;base64,', '');
    const buf = Buffer.from(base64, 'base64');
    const { writeFileSync } = await import('node:fs');
    writeFileSync(resolve(DIR, `favicon-${name}.png`), buf);
    console.log(`Saved favicon-${name}.png`);
  } else {
    console.log(`No favicon found for ${name}: ${href?.slice(0, 60)}`);
  }

  await ctx.close();
}

await browser.close();
