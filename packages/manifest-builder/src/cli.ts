#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fetchReposWithPortfolioYml } from './github.js';
import { buildManifest } from './build.js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    console.error(`[manifest-builder] missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}

async function main(): Promise<void> {
  const token = requireEnv('GITHUB_TOKEN');
  const login = requireEnv('GITHUB_USERNAME');

  // OUTPUT_DIR defaults to the repo root (three levels up from
  // packages/manifest-builder/dist/cli.js). Overridable for tests / ad-hoc runs.
  const outputDir = process.env.OUTPUT_DIR
    ? resolve(process.env.OUTPUT_DIR)
    : resolve(process.cwd());

  console.log(`[manifest-builder] fetching repos for user: ${login}`);
  const repos = await fetchReposWithPortfolioYml(token, login);
  console.log(`[manifest-builder] fetched ${repos.length} repo(s)`);

  const { manifest, warnings } = buildManifest(repos);
  console.log(
    `[manifest-builder] ${manifest.length} project(s) included, ${warnings.length} warning(s)`,
  );

  const manifestPath = resolve(outputDir, 'manifest.json');
  const warningsPath = resolve(outputDir, 'manifest-warnings.json');

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  await writeFile(warningsPath, JSON.stringify(warnings, null, 2) + '\n', 'utf8');

  console.log(`[manifest-builder] wrote ${manifestPath}`);
  console.log(`[manifest-builder] wrote ${warningsPath}`);
}

main().catch((err: unknown) => {
  console.error('[manifest-builder] failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
