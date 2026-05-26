#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { fetchReposWithPortfolioYml, fetchUpstreamMetadata } from './github.js';
import { buildManifest, buildExternalEntries, mergeEntries } from './build.js';
import { loadExternalProjects } from './external.js';
import { PortfolioYmlSchema } from './schema.js';
import type { ManifestWarning } from './manifest.js';
import type { ExternalBuildInput } from './build.js';

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

  const { manifest: githubEntries, warnings: githubWarnings } = buildManifest(repos);

  // External entries: locally-authored .portfolio.yml files for OSS projects
  // the user contributed to but doesn't own. Lives at
  // <outputDir>/.portfolio/<slug>/.portfolio.yml.
  const externals = await loadExternalProjects(outputDir);
  console.log(`[manifest-builder] discovered ${externals.length} external entry/entries`);

  // Resolve upstream metadata for each external up front, so build is pure.
  // Done sequentially to keep rate-limit pressure low (most users will have
  // a handful at most).
  const externalInputs: ExternalBuildInput[] = [];
  const upstreamWarnings: ManifestWarning[] = [];

  for (const external of externals) {
    // Peek at `upstream` by re-parsing here. Slight redundancy with the
    // parse inside buildExternalEntries, but lets us fetch before build and
    // keeps buildExternalEntries free of I/O.
    let upstream: { owner: string; repo: string } | undefined;
    try {
      const parsed = PortfolioYmlSchema.safeParse(parseYaml(external.portfolioYmlText));
      if (parsed.success) upstream = parsed.data.upstream;
    } catch {
      // Parse errors get reported by buildExternalEntries; just skip the fetch here.
    }

    let upstreamContext = null;
    if (upstream) {
      upstreamContext = await fetchUpstreamMetadata(token, upstream.owner, upstream.repo);
      if (upstreamContext === null) {
        upstreamWarnings.push({
          repo_name: external.slug,
          reason: `upstream fetch failed for ${upstream.owner}/${upstream.repo}`,
        });
      }
    }

    externalInputs.push({ external, upstreamContext });
  }

  const { manifest: externalEntries, warnings: externalBuildWarnings } =
    buildExternalEntries(externalInputs);

  const { manifest, warnings: mergeWarnings } = mergeEntries(githubEntries, externalEntries);

  const warnings: ManifestWarning[] = [
    ...githubWarnings,
    ...upstreamWarnings,
    ...externalBuildWarnings,
    ...mergeWarnings,
  ];

  console.log(
    `[manifest-builder] ${manifest.length} project(s) included (` +
      `${githubEntries.length} github, ${externalEntries.length} external), ` +
      `${warnings.length} warning(s)`,
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
