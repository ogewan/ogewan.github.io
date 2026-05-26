import { parse as parseYaml } from 'yaml';
import { PortfolioYmlSchema, type PortfolioYml } from './schema.js';
import {
  enrichEntry,
  enrichExternalEntry,
  sortManifest,
  type ManifestEntry,
  type ManifestWarning,
  type RepoContext,
} from './manifest.js';
import type { FetchedRepo } from './github.js';
import type { FetchedExternal } from './external.js';

export interface BuildResult {
  manifest: ManifestEntry[];
  warnings: ManifestWarning[];
}

// Default base URL for external assets in the deployed shell. Assets get
// copied to `packages/shell/public/external/<slug>/` at build time, and the
// shell prepends `import.meta.env.BASE_URL` at render time — so the stored
// path stays root-relative.
export const DEFAULT_EXTERNAL_ASSET_BASE_URL = '/external';

// Parses and schema-validates a single .portfolio.yml text. On any failure,
// appends a warning keyed by `label` (repo name for GitHub entries, slug for
// externals) and returns null. Shared between the GitHub and external paths
// so both report errors the same way.
function parseAndValidate(
  text: string,
  label: string,
  warnings: ManifestWarning[],
): PortfolioYml | null {
  let parsed: unknown;
  try {
    parsed = parseYaml(text);
  } catch (err) {
    warnings.push({
      repo_name: label,
      reason: 'yaml parse failed',
      details: err instanceof Error ? err.message : String(err),
    });
    return null;
  }

  const result = PortfolioYmlSchema.safeParse(parsed);
  if (!result.success) {
    warnings.push({
      repo_name: label,
      reason: 'schema validation failed',
      details: result.error.issues,
    });
    return null;
  }

  return result.data;
}

// Validates each fetched .portfolio.yml, converts to an enriched manifest entry,
// or records a warning. Repos without a .portfolio.yml are silently skipped —
// portfolio participation is opt-in.
export function buildManifest(repos: FetchedRepo[]): BuildResult {
  const entries: ManifestEntry[] = [];
  const warnings: ManifestWarning[] = [];

  for (const { context, portfolioYmlText } of repos) {
    if (portfolioYmlText === null) continue;
    const yml = parseAndValidate(portfolioYmlText, context.name, warnings);
    if (yml === null) continue;
    entries.push(enrichEntry(yml, context));
  }

  return {
    manifest: sortManifest(entries),
    warnings,
  };
}

export interface ExternalBuildInput {
  external: FetchedExternal;
  // Live GitHub metadata for the upstream repo, if `yml.upstream` was set and
  // the fetch succeeded. Null when there's no upstream declared or the fetch
  // failed (the latter case should also have produced a warning at fetch time).
  upstreamContext: RepoContext | null;
}

// Same shape as buildManifest but for locally-authored entries. Does not sort
// — the CLI concatenates github + external entries before a single sort pass.
export function buildExternalEntries(
  inputs: ExternalBuildInput[],
  assetBaseUrl: string = DEFAULT_EXTERNAL_ASSET_BASE_URL,
): BuildResult {
  const entries: ManifestEntry[] = [];
  const warnings: ManifestWarning[] = [];

  for (const { external, upstreamContext } of inputs) {
    const yml = parseAndValidate(external.portfolioYmlText, external.slug, warnings);
    if (yml === null) continue;

    // External entries are author-authored on the user's own portfolio repo,
    // so missing `contributions` is a soft warning — the entry still ships,
    // but the shell may render a stub "no contribution notes" block.
    if (!yml.contributions) {
      warnings.push({
        repo_name: external.slug,
        reason: 'external entry has no contributions block',
      });
    }

    // No upstream + no fetch result means we're shipping fake metadata
    // (stars=0, no language, etc.). Warn so the user notices.
    if (!yml.upstream && upstreamContext === null) {
      warnings.push({
        repo_name: external.slug,
        reason: 'external entry has no upstream and no live metadata',
      });
    }

    entries.push(enrichExternalEntry(yml, external.slug, assetBaseUrl, upstreamContext));
  }

  return { manifest: entries, warnings };
}

// Concatenates GitHub + external entries, resolves slug collisions (external
// wins gets a `-external` suffix so the canonical GitHub-discovered slug
// stays stable), warns on duplicate UUIDs across both pools, and runs a
// single sort pass. Pure function — easy to unit-test.
export function mergeEntries(
  githubEntries: ManifestEntry[],
  externalEntries: ManifestEntry[],
): BuildResult {
  const warnings: ManifestWarning[] = [];
  const githubSlugs = new Set(githubEntries.map((e) => e.slug));

  const dedupedExternals = externalEntries.map((entry) => {
    if (!githubSlugs.has(entry.slug)) return entry;
    const newSlug = `${entry.slug}-external`;
    warnings.push({
      repo_name: entry.slug,
      reason: `slug collides with a GitHub-discovered repo; renamed to ${newSlug}`,
    });
    return { ...entry, slug: newSlug };
  });

  const all = [...githubEntries, ...dedupedExternals];

  const uuidIndex = new Map<string, string[]>();
  for (const entry of all) {
    const slugs = uuidIndex.get(entry.uuid) ?? [];
    slugs.push(entry.slug);
    uuidIndex.set(entry.uuid, slugs);
  }
  for (const [uuid, slugs] of uuidIndex) {
    if (slugs.length > 1) {
      warnings.push({
        repo_name: slugs.join(', '),
        reason: `duplicate uuid ${uuid} across entries`,
      });
    }
  }

  return { manifest: sortManifest(all), warnings };
}

export { PortfolioYmlSchema } from './schema.js';
export type { ManifestEntry, ManifestWarning } from './manifest.js';
