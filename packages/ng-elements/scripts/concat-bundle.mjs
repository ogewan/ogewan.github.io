#!/usr/bin/env node
// Post-build step: take Angular CLI's per-file output and concatenate the
// JS files into a single `ng-elements.js` (plus copy the styles bundle to
// `ng-elements.css`). Output goes to TWO places:
//
//   1. packages/ng-elements/dist/ng-elements/  — the canonical artifact.
//   2. packages/shell/public/ng-elements/      — what Vite actually serves
//      to the browser at /ng-elements/*. The shell loads the bundle by
//      script-tag injection of /ng-elements/ng-elements.js, so the file
//      has to live in the shell's public/ tree.
//
// Why a concat step at all: the browser-esbuild builder still produces
// separate polyfills + main + chunked bundles in some configurations, and
// we want a single file the shell can dynamic-import without coordinating
// multiple loads.

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const RAW_DIR = join(ROOT, 'dist', 'ng-elements-raw');
const PKG_OUT = join(ROOT, 'dist', 'ng-elements');
const SHELL_PUBLIC = join(ROOT, '..', 'shell', 'public', 'ng-elements');

function findOutputDir(start) {
  // Some Angular configurations nest the output under `browser/`. Find the
  // first directory that contains *.js files.
  if (!existsSync(start)) {
    throw new Error(`raw output directory not found: ${start}`);
  }
  const entries = readdirSync(start);
  const hasJs = entries.some((e) => e.endsWith('.js'));
  if (hasJs) return start;
  for (const e of entries) {
    const p = join(start, e);
    if (statSync(p).isDirectory()) {
      const inner = findOutputDir(p);
      if (inner) return inner;
    }
  }
  return null;
}

const sourceDir = findOutputDir(RAW_DIR);
if (!sourceDir) {
  console.error('[concat-bundle] no JS output found under', RAW_DIR);
  process.exit(1);
}

// Order matters: polyfills/zone.js first, then chunked module loaders, then
// main app code. Filename heuristic. polyfills*.js → 0, chunk-* → 1,
// main* → 2, anything else → 3.
const allJs = readdirSync(sourceDir).filter((f) => f.endsWith('.js'));
const score = (name) => {
  if (name.startsWith('polyfills')) return 0;
  if (name.startsWith('chunk-')) return 1;
  if (name.startsWith('main')) return 2;
  return 3;
};
const orderedJs = allJs.sort((a, b) => {
  const sa = score(a);
  const sb = score(b);
  if (sa !== sb) return sa - sb;
  return a.localeCompare(b);
});

let combined = '';
for (const file of orderedJs) {
  const body = readFileSync(join(sourceDir, file), 'utf8');
  combined += `// === ${file} ===
;(function(){${body}})();
`;
}

const cssFiles = readdirSync(sourceDir).filter((f) => f.endsWith('.css'));
const combinedCss = cssFiles.map((f) => readFileSync(join(sourceDir, f), 'utf8')).join('\n');

function writeBundle(outDir) {
  if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'ng-elements.js'), combined, 'utf8');
  if (combinedCss.trim()) {
    writeFileSync(join(outDir, 'ng-elements.css'), combinedCss, 'utf8');
  }
}

writeBundle(PKG_OUT);
writeBundle(SHELL_PUBLIC);

const jsKb = (Buffer.byteLength(combined, 'utf8') / 1024).toFixed(1);
const cssKb = (Buffer.byteLength(combinedCss, 'utf8') / 1024).toFixed(1);
console.log('[concat-bundle] wrote', join(PKG_OUT, 'ng-elements.js'));
console.log('[concat-bundle] wrote', join(SHELL_PUBLIC, 'ng-elements.js'));
console.log('[concat-bundle]   js  :', jsKb, 'KB (uncompressed)');
console.log('[concat-bundle]   css :', cssKb, 'KB (uncompressed)');
console.log('[concat-bundle]   files concatenated:', orderedJs.join(' + '));
