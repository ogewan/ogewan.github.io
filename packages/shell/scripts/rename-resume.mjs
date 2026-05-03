#!/usr/bin/env node
// Finds the first *.pdf in public/ (excluding resume.pdf itself) and copies
// it to public/resume.pdf. Drop any named PDF into public/ and it becomes
// the live resume link automatically — no code changes needed.
import { copyFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const publicDir = resolve(dirname(fileURLToPath(import.meta.url)), '../public');
const source = readdirSync(publicDir).find(
  (f) => f.endsWith('.pdf') && f !== 'resume.pdf',
);

if (!source) {
  console.log('[resume] no non-resume PDF found in public/ — skipping.');
  process.exit(0);
}

copyFileSync(resolve(publicDir, source), resolve(publicDir, 'resume.pdf'));
console.log(`[resume] copied ${source} → resume.pdf`);
