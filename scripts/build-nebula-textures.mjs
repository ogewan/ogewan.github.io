#!/usr/bin/env node
// Asset-prep script for Phase 9.4 contact-scene nebulae.
//
// Reads four NASA / ESA / STScI master images from .scratch/nebulae-source/,
// center-crops each to a square, resizes to 2048 px and 1024 px on the long
// edge, encodes both as WebP at quality 75, and emits them under
// packages/celestial/src/textures/nebulae/{variant}/photo_{2k,1k}.webp.
//
// Also writes a credit.json per variant capturing the source URL, license,
// and exact credit-line text — surfaced in colophon copy.
//
// One-shot: run when source masters change. Not part of `pnpm build`.
//
// Usage:
//   node scripts/build-nebula-textures.mjs
//
// Source masters expected at:
//   .scratch/nebulae-source/{01-carina,02-lagoon,03-pillars,04-veil}.jpg
//
// .scratch/ is gitignored. See packages/celestial/src/textures/README.md
// for sourcing instructions.

import { mkdir, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const SOURCE_DIR = path.join(ROOT, '.scratch', 'nebulae-source');
const OUT_ROOT = path.join(ROOT, 'packages', 'celestial', 'src', 'textures', 'nebulae');

// Per-variant manifest. The slug matches the URL pin (`?neb=01..04` →
// '01-carina', etc.) and the directory name under textures/nebulae/.
// `source` is the fetched master file in .scratch/nebulae-source/.
// `pageUrl` is the press-release page; `license` and `credit` go into
// the per-variant credit.json that ships with the WebPs.
const VARIANTS = [
  {
    slug: '01-carina',
    name: 'Carina Nebula — Cosmic Cliffs (NGC 3324)',
    source: '01-carina.jpg',
    pageUrl: 'https://esawebb.org/images/weic2205a/',
    license: 'Public domain (NASA / ESA / CSA)',
    credit: 'NASA, ESA, CSA, and STScI',
    instrument: 'JWST NIRCam + MIRI',
    releaseDate: '2022-07-12',
  },
  {
    slug: '02-lagoon',
    name: 'Lagoon Nebula (Messier 8)',
    source: '02-lagoon.jpg',
    pageUrl: 'https://esahubble.org/images/heic1808a/',
    license: 'Public domain (NASA / ESA)',
    credit: 'NASA, ESA, STScI',
    instrument: 'Hubble WFC3 (visible-light)',
    releaseDate: '2018-04-19',
  },
  {
    slug: '03-pillars',
    name: 'Pillars of Creation (Messier 16)',
    source: '03-pillars.jpg',
    pageUrl: 'https://esawebb.org/images/weic2216a/',
    license: 'Public domain (NASA / ESA / CSA)',
    credit: 'NASA, ESA, CSA, STScI; J. DePasquale, A. Koekemoer, A. Pagan (STScI)',
    instrument: 'JWST NIRCam',
    releaseDate: '2022-10-19',
  },
  {
    slug: '04-veil',
    name: 'Veil Nebula',
    source: '04-veil.jpg',
    pageUrl: 'https://esahubble.org/images/heic1520a/',
    license: 'Public domain (NASA / ESA)',
    credit: 'NASA, ESA, Hubble Heritage Team',
    instrument: 'Hubble WFC3',
    releaseDate: '2015-09-24',
  },
];

const SIZES = [
  { suffix: '2k', edge: 2048 },
  { suffix: '1k', edge: 1024 },
];

const WEBP_QUALITY = 75;

async function fileExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function buildOne(variant) {
  const sourcePath = path.join(SOURCE_DIR, variant.source);
  if (!(await fileExists(sourcePath))) {
    console.warn(`[skip] ${variant.slug}: master not found at ${sourcePath}`);
    return null;
  }

  const outDir = path.join(OUT_ROOT, variant.slug);
  await mkdir(outDir, { recursive: true });

  // Center-crop to square so the variant always fills the bounding-sphere
  // raymarch UV regardless of source aspect ratio. Sharp's `cover` resize
  // strategy with `position: 'center'` does center-crop + resize in one
  // step.
  const meta = await sharp(sourcePath).metadata();
  const minDim = Math.min(meta.width ?? 0, meta.height ?? 0);

  const outputs = [];
  for (const { suffix, edge } of SIZES) {
    const target = Math.min(edge, minDim);
    const outPath = path.join(outDir, `photo_${suffix}.webp`);
    await sharp(sourcePath)
      .resize(target, target, { fit: 'cover', position: 'center' })
      .webp({ quality: WEBP_QUALITY, effort: 6 })
      .toFile(outPath);
    const { size } = await stat(outPath);
    outputs.push({ suffix, edge: target, path: outPath, bytes: size });
  }

  const creditPath = path.join(outDir, 'credit.json');
  await writeFile(
    creditPath,
    JSON.stringify(
      {
        slug: variant.slug,
        name: variant.name,
        instrument: variant.instrument,
        releaseDate: variant.releaseDate,
        pageUrl: variant.pageUrl,
        license: variant.license,
        credit: variant.credit,
      },
      null,
      2,
    ) + '\n',
  );

  return { variant, outputs, creditPath };
}

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  await mkdir(OUT_ROOT, { recursive: true });
  console.log(`source dir : ${path.relative(ROOT, SOURCE_DIR)}`);
  console.log(`output root: ${path.relative(ROOT, OUT_ROOT)}`);
  console.log('');

  let totalBytes = 0;
  for (const variant of VARIANTS) {
    const result = await buildOne(variant);
    if (!result) continue;
    console.log(`${variant.slug}  ${variant.name}`);
    for (const { suffix, edge, path: p, bytes } of result.outputs) {
      console.log(`  ${suffix.padEnd(3)} ${edge}px  ${fmtBytes(bytes).padStart(8)}  ${path.relative(ROOT, p)}`);
      totalBytes += bytes;
    }
    console.log('');
  }
  console.log(`total committed weight: ${fmtBytes(totalBytes)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
