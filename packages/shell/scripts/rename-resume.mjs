#!/usr/bin/env node
// Finds the most-recently-modified *.pdf in public/ (excluding resume.pdf
// itself) and copies it to public/resume.pdf. The newest file wins when
// multiple PDFs are present — drop a new copy in and it takes over.
import { copyFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const publicDir = resolve(dirname(fileURLToPath(import.meta.url)), '../public');
const candidates = readdirSync(publicDir)
  .filter((f) => f.endsWith('.pdf') && f !== 'resume.pdf')
  .map((f) => ({ name: f, mtimeMs: statSync(resolve(publicDir, f)).mtimeMs }))
  .sort((a, b) => b.mtimeMs - a.mtimeMs);
const source = candidates[0]?.name;

if (!source) {
  console.log('[resume] no source PDF found in public/ — skipping.');
  process.exit(0);
}

copyFileSync(resolve(publicDir, source), resolve(publicDir, 'resume.pdf'));
console.log(`[resume] copied ${source} → resume.pdf`);
